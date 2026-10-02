-- Exercise the guarded review as real authenticated roles, without keeping data.
BEGIN;
DO $$
DECLARE v_admin auth.users%rowtype; v_gold auth.users%rowtype; v_member auth.users%rowtype;
BEGIN
  SELECT u.* INTO STRICT v_admin FROM auth.users u JOIN public.directory_admins a
    ON a.email = lower(u.email) AND a.active LIMIT 1;
  SELECT u.* INTO STRICT v_gold FROM auth.users u JOIN public.directory_member_roles r
    ON r.user_id = u.id AND r.active AND r.role_code = 'gold_moderator' AND r.frame_code = 'gold'
    WHERE u.id <> v_admin.id AND public.is_naqada_member_allowed(u.id) LIMIT 1;
  SELECT u.* INTO STRICT v_member FROM auth.users u
    WHERE u.id NOT IN (v_admin.id, v_gold.id) AND public.is_naqada_member_allowed(u.id)
      AND NOT EXISTS (SELECT 1 FROM public.directory_member_roles r WHERE r.user_id = u.id AND r.active)
    ORDER BY u.created_at LIMIT 1;
  PERFORM set_config('naqada.review_admin', jsonb_build_object('sub',v_admin.id,'email',v_admin.email,'role','authenticated')::text,true);
  PERFORM set_config('naqada.review_gold', jsonb_build_object('sub',v_gold.id,'email',v_gold.email,'role','authenticated')::text,true);
  PERFORM set_config('naqada.review_member', jsonb_build_object('sub',v_member.id,'email',v_member.email,'role','authenticated')::text,true);
  PERFORM set_config('naqada.review_publish', gen_random_uuid()::text, true);
  PERFORM set_config('naqada.review_reject', gen_random_uuid()::text, true);
  PERFORM set_config('request.jwt.claims', current_setting('naqada.review_member'), true);
  INSERT INTO public.directory_owner_listings(id,owner_user_id,name,phone,hours,address,description,category,locality)
    VALUES (current_setting('naqada.review_publish')::uuid,v_member.id,'اختبار اعتماد مؤقت','01100000000','طوال الأسبوع',
      'عنوان اختبار مؤقت','وصف نشاط مؤقت للتحقق من نشر النشاط وإشعار صاحبه.','التجزئة والتسوق','طوخ'),
      (current_setting('naqada.review_reject')::uuid,v_member.id,'اختبار إرجاع مؤقت','01100000000','طوال الأسبوع',
      'عنوان اختبار مؤقت','وصف نشاط مؤقت للتحقق من إعادة الطلب إلى صاحبه.','التجزئة والتسوق','طوخ');
END;
$$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_result jsonb; v_notices jsonb; v_previous timestamptz; v_item jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', current_setting('naqada.review_member'), true);
  BEGIN
    PERFORM public.review_naqada_owner_listing(current_setting('naqada.review_publish')::uuid,'published');
    RAISE EXCEPTION 'ordinary member published their own request';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM set_config('request.jwt.claims', current_setting('naqada.review_gold'), true);
  IF NOT EXISTS (SELECT 1 FROM public.directory_owner_listings
    WHERE id=current_setting('naqada.review_publish')::uuid AND status='pending') THEN
    RAISE EXCEPTION 'gold moderator cannot see the pending review card';
  END IF;
  v_result := public.review_naqada_owner_listing(current_setting('naqada.review_publish')::uuid,'published');
  IF NOT (v_result->>'ok')::boolean OR NOT (v_result->>'changed')::boolean THEN
    RAISE EXCEPTION 'gold moderator failed to publish';
  END IF;
  v_result := public.review_naqada_owner_listing(current_setting('naqada.review_publish')::uuid,'published');
  IF NOT (v_result->>'ok')::boolean OR (v_result->>'changed')::boolean THEN
    RAISE EXCEPTION 'retry was not idempotent';
  END IF;
  v_result := public.review_naqada_owner_listing(current_setting('naqada.review_publish')::uuid,'rejected');
  IF v_result->>'code' IS DISTINCT FROM 'ALREADY_REVIEWED' THEN RAISE EXCEPTION 'old decision was overwritten'; END IF;
  v_result := public.review_naqada_owner_listing(gen_random_uuid(),'published');
  IF v_result->>'code' IS DISTINCT FROM 'NOT_FOUND' THEN RAISE EXCEPTION 'missing request reported success'; END IF;
  BEGIN
    PERFORM public.review_naqada_owner_listing(current_setting('naqada.review_publish')::uuid,'pending');
    RAISE EXCEPTION 'unsupported review status was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;

  PERFORM set_config('request.jwt.claims', current_setting('naqada.review_admin'), true);
  v_result := public.review_naqada_owner_listing(current_setting('naqada.review_reject')::uuid,'rejected');
  IF NOT (v_result->>'ok')::boolean THEN RAISE EXCEPTION 'admin failed to return request'; END IF;
  v_result := public.get_naqada_recent_requests();
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_result->'items') LOOP
    IF v_previous IS NOT NULL AND (v_item->>'createdAt')::timestamptz > v_previous THEN
      RAISE EXCEPTION 'recent requests are not newest first';
    END IF;
    v_previous := (v_item->>'createdAt')::timestamptz;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_result->'items') x
    WHERE x->>'id'=current_setting('naqada.review_publish') AND x->>'status'='published') THEN
    RAISE EXCEPTION 'published request missing from history';
  END IF;

  PERFORM set_config('request.jwt.claims', current_setting('naqada.review_member'), true);
  v_notices := public.get_naqada_request_notifications()->'items';
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_notices) x
    WHERE x->>'href'='/activity/'||current_setting('naqada.review_publish')||'/')
    OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_notices) x
    WHERE x->>'href'='/contribute/?edit='||current_setting('naqada.review_reject')) THEN
    RAISE EXCEPTION 'recipient is missing review notification';
  END IF;
  IF EXISTS (SELECT 1 FROM public.directory_request_notifications WHERE user_id<>auth.uid()) THEN
    RAISE EXCEPTION 'private recipient notices were leaked';
  END IF;
END;
$$;
RESET ROLE;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.directory_request_notifications
    WHERE request_id=current_setting('naqada.review_publish')::uuid) <> 1 THEN
    RAISE EXCEPTION 'duplicate publication notification';
  END IF;
  IF (SELECT count(*) FROM public.directory_moderator_audit
    WHERE target_id=current_setting('naqada.review_publish')) <> 1 THEN
    RAISE EXCEPTION 'duplicate moderation audit';
  END IF;
END;
$$;
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM public.review_naqada_owner_listing(current_setting('naqada.review_publish')::uuid,'published');
    RAISE EXCEPTION 'anonymous visitor accessed review action';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF NOT EXISTS (SELECT 1 FROM public.directory_owner_listings
    WHERE id=current_setting('naqada.review_publish')::uuid AND status='published' AND reviewed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'approved activity is not immediately public';
  END IF;
  IF EXISTS (SELECT 1 FROM public.directory_owner_listings WHERE id=current_setting('naqada.review_reject')::uuid) THEN
    RAISE EXCEPTION 'returned activity became public';
  END IF;
END;
$$;
RESET ROLE;
ROLLBACK;
