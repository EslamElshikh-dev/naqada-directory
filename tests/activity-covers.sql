-- Exercises approval, media isolation, reminders and RLS in one rolled-back transaction.
BEGIN;
DO $$
DECLARE
  v_admin auth.users%rowtype; v_member auth.users%rowtype; v_other auth.users%rowtype;
  v_id uuid := gen_random_uuid(); v_cover text; v_gallery text[];
BEGIN
  SELECT u.* INTO STRICT v_admin FROM auth.users u JOIN public.directory_admins a ON a.email=lower(u.email) AND a.active LIMIT 1;
  SELECT u.* INTO STRICT v_member FROM auth.users u WHERE u.id<>v_admin.id AND NOT EXISTS
    (SELECT 1 FROM public.directory_member_roles r WHERE r.user_id=u.id AND r.active) ORDER BY u.created_at LIMIT 1;
  SELECT u.* INTO STRICT v_other FROM auth.users u WHERE u.id NOT IN (v_admin.id,v_member.id) AND NOT EXISTS
    (SELECT 1 FROM public.directory_member_roles r WHERE r.user_id=u.id AND r.active) ORDER BY u.created_at LIMIT 1;
  PERFORM set_config('naqada.cover_admin',jsonb_build_object('sub',v_admin.id,'email',v_admin.email,'role','authenticated')::text,true);
  PERFORM set_config('naqada.cover_member',jsonb_build_object('sub',v_member.id,'email',v_member.email,'role','authenticated')::text,true);
  PERFORM set_config('naqada.cover_other',jsonb_build_object('sub',v_other.id,'email',v_other.email,'role','authenticated')::text,true);
  PERFORM set_config('naqada.cover_id',v_id::text,true);
  v_cover := v_member.id::text||'/'||v_id::text||'/'||gen_random_uuid()::text||'.webp';
  SELECT array_agg(v_member.id::text||'/'||v_id::text||'/'||gen_random_uuid()::text||'.jpg') INTO v_gallery FROM generate_series(1,5);
  PERFORM set_config('naqada.cover_path',v_cover,true);
  PERFORM set_config('naqada.gallery_paths',to_jsonb(v_gallery)::text,true);
END;
$$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_id uuid := current_setting('naqada.cover_id')::uuid; v_result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims',current_setting('naqada.cover_member'),true);
  INSERT INTO public.directory_owner_listings(id,owner_user_id,name,phone,hours,address,description,category,locality)
    VALUES(v_id,auth.uid(),'اختبار غلاف نشاط','01100000000','من التاسعة صباحًا','عنوان مؤقت لاختبار الغلاف',
      'نشاط اختبار مؤقت لا يظهر بعد انتهاء المعاملة.','التجزئة والتسوق','مدينة نقادة');
  UPDATE public.directory_owner_listings SET status='published' WHERE id=v_id;
  IF (SELECT status FROM public.directory_owner_listings WHERE id=v_id)<>'pending' THEN RAISE EXCEPTION 'member published their own activity'; END IF;
  PERFORM set_config('request.jwt.claims',current_setting('naqada.cover_admin'),true);
  v_result := public.review_naqada_owner_listing(v_id,'published');
  IF NOT (v_result->>'ok')::boolean THEN RAISE EXCEPTION 'approval failed'; END IF;
  PERFORM set_config('request.jwt.claims',current_setting('naqada.cover_member'),true);
  IF (SELECT count(*) FROM public.directory_request_notifications WHERE request_id=v_id AND request_kind='business' AND status='published')<>1
    OR (SELECT count(*) FROM public.directory_request_notifications WHERE request_id=v_id AND request_kind='cover')<>1 THEN RAISE EXCEPTION 'missing approval or cover notice'; END IF;
  PERFORM set_config('request.jwt.claims',current_setting('naqada.cover_admin'),true);
  PERFORM public.review_naqada_owner_listing(v_id,'published');
  PERFORM set_config('request.jwt.claims',current_setting('naqada.cover_member'),true);
  IF (SELECT count(*) FROM public.directory_request_notifications WHERE request_id=v_id AND request_kind='cover')<>1 THEN RAISE EXCEPTION 'duplicate reminder'; END IF;

  PERFORM set_config('request.jwt.claims',current_setting('naqada.cover_member'),true);
  BEGIN
    UPDATE public.directory_owner_listings SET cover_path=(current_setting('naqada.cover_other')::jsonb->>'sub')||'/'||v_id::text||'/'||gen_random_uuid()::text||'.webp' WHERE id=v_id;
    RAISE EXCEPTION 'foreign owner cover allowed';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'invalid activity cover path' THEN RAISE; END IF; END;
  UPDATE public.directory_owner_listings SET cover_path=current_setting('naqada.cover_path'),
    photo_paths=ARRAY(SELECT jsonb_array_elements_text(current_setting('naqada.gallery_paths')::jsonb)) WHERE id=v_id;
  IF (SELECT cardinality(photo_paths) FROM public.directory_owner_listings WHERE id=v_id)<>5 THEN RAISE EXCEPTION 'cover consumed gallery capacity'; END IF;
  IF EXISTS(SELECT 1 FROM public.directory_request_notifications WHERE request_id=v_id AND request_kind='cover') THEN RAISE EXCEPTION 'fulfilled reminder was not cleared'; END IF;
  IF public.is_published_naqada_photo(current_setting('naqada.cover_path')) THEN RAISE EXCEPTION 'pending cover was exposed'; END IF;

  PERFORM set_config('request.jwt.claims',current_setting('naqada.cover_admin'),true);
  PERFORM public.review_naqada_owner_listing(v_id,'published');
  IF NOT public.is_published_naqada_photo(current_setting('naqada.cover_path')) THEN RAISE EXCEPTION 'published cover not readable'; END IF;
  IF NOT public.is_published_naqada_photo(current_setting('naqada.gallery_paths')::jsonb->>0) THEN RAISE EXCEPTION 'published gallery lost'; END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.get_naqada_moderator_dashboard('')->'businesses') b
    WHERE b->>'id'=v_id::text AND b->>'cover_path'=current_setting('naqada.cover_path')) THEN RAISE EXCEPTION 'moderator cannot preview cover'; END IF;

  PERFORM set_config('request.jwt.claims',current_setting('naqada.cover_other'),true);
  IF EXISTS(SELECT 1 FROM public.directory_request_notifications WHERE request_id=v_id) THEN RAISE EXCEPTION 'another member read private notifications'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.get_naqada_request_notifications()->'items') n WHERE n->>'href'='/activity/'||v_id::text||'/') THEN RAISE EXCEPTION 'notification feed leaks'; END IF;
  BEGIN
    INSERT INTO public.directory_request_notifications(user_id,request_kind,request_id,status,title,href,label,detail,occurred_at)
      VALUES(auth.uid(),'cover',gen_random_uuid(),'needs_info','مزيف','/account/','مزيف','مزيف',now());
    RAISE EXCEPTION 'member forged reminder';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  PERFORM set_config('request.jwt.claims',current_setting('naqada.cover_member'),true);
  UPDATE public.directory_owner_listings SET cover_path=null WHERE id=v_id;
  PERFORM set_config('request.jwt.claims',current_setting('naqada.cover_admin'),true);
  PERFORM public.review_naqada_owner_listing(v_id,'published');
  PERFORM set_config('request.jwt.claims',current_setting('naqada.cover_member'),true);
  IF EXISTS(SELECT 1 FROM public.directory_request_notifications WHERE request_id=v_id AND request_kind='cover') THEN RAISE EXCEPTION 'gallery cover incorrectly triggered reminder'; END IF;
  PERFORM set_config('request.jwt.claims',current_setting('naqada.cover_member'),true);
  UPDATE public.directory_owner_listings SET photo_paths='{}' WHERE id=v_id;
  PERFORM set_config('request.jwt.claims',current_setting('naqada.cover_admin'),true);
  PERFORM public.review_naqada_owner_listing(v_id,'published');
  PERFORM set_config('request.jwt.claims',current_setting('naqada.cover_member'),true);
  IF (SELECT count(*) FROM public.directory_request_notifications WHERE request_id=v_id AND request_kind='cover')<>1 THEN RAISE EXCEPTION 'missing renewed reminder'; END IF;
END;
$$;
RESET ROLE;
ROLLBACK;
SELECT 'Approval, independent cover, five gallery images, moderation privacy, reminder cleanup, moderator preview and recipient RLS passed; all test records rolled back.' AS result;
