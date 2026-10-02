-- Run as a database administrator. Every test record is rolled back.
BEGIN;
DO $$
DECLARE
  v_owner auth.users%rowtype;
  v_member auth.users%rowtype;
  v_other auth.users%rowtype;
  v_request uuid := gen_random_uuid();
  v_business uuid := gen_random_uuid();
  v_anonymous uuid := gen_random_uuid();
BEGIN
  SELECT u.* INTO STRICT v_owner FROM auth.users u JOIN public.directory_admins a
    ON a.email=lower(u.email) AND a.active LIMIT 1;
  SELECT u.* INTO STRICT v_member FROM auth.users u WHERE u.id<>v_owner.id
    AND NOT EXISTS (SELECT 1 FROM public.directory_member_roles r WHERE r.user_id=u.id AND r.active)
    ORDER BY u.created_at LIMIT 1;
  SELECT u.* INTO STRICT v_other FROM auth.users u WHERE u.id NOT IN (v_owner.id,v_member.id)
    AND NOT EXISTS (SELECT 1 FROM public.directory_member_roles r WHERE r.user_id=u.id AND r.active)
    ORDER BY u.created_at LIMIT 1;
  PERFORM set_config('naqada.test_owner',jsonb_build_object('sub',v_owner.id,'email',v_owner.email,'role','authenticated')::text,true);
  PERFORM set_config('naqada.test_member',jsonb_build_object('sub',v_member.id,'email',v_member.email,'role','authenticated')::text,true);
  PERFORM set_config('naqada.test_other',jsonb_build_object('sub',v_other.id,'email',v_other.email,'role','authenticated')::text,true);
  PERFORM set_config('naqada.test_request',v_request::text,true);
  PERFORM set_config('naqada.test_business',v_business::text,true);
  PERFORM set_config('naqada.test_anonymous',v_anonymous::text,true);
  INSERT INTO public.directory_contributions(id,request_type,name,details,submitted_by_user_id,created_at)
    VALUES(v_request,'add','اختبار إشعار طلب','سجل اختبار مؤقت لنشر نشاط وإشعار صاحبه.',v_member.id,now()-interval '1 hour');
  INSERT INTO public.directory_contributions(id,request_type,name,created_at)
    VALUES(v_anonymous,'add','اختبار مرسل بدون حساب',now()-interval '2 hours');
  PERFORM set_config('request.jwt.claims',current_setting('naqada.test_member'),true);
  INSERT INTO public.directory_owner_listings(id,owner_user_id,name,phone,hours,address,description,category,locality)
    VALUES(v_business,v_member.id,'اختبار نشاط عضو','01100000000','صباحًا ومساءً','عنوان اختبار مؤقت',
      'وصف نشاط مؤقت لاختبار إشعارات المراجعة.','التجزئة والتسوق','مدينة نقادة');
END;
$$;

SET LOCAL ROLE authenticated;
DO $$
DECLARE v_result jsonb; v_previous timestamptz; v_item jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims',current_setting('naqada.test_owner'),true);
  v_result := public.publish_naqada_contribution(current_setting('naqada.test_request')::uuid,
    jsonb_build_object('title','اختبار إشعار طلب','summary','وصف اختبار للنشر وإشعار صاحب الطلب بعد القبول.',
      'category','التجزئة والتسوق','locality','مدينة نقادة'));
  IF NOT (v_result->>'ok')::boolean THEN RAISE EXCEPTION 'publication failed'; END IF;
  UPDATE public.directory_owner_listings SET status='published' WHERE id=current_setting('naqada.test_business')::uuid;
  v_result := public.get_naqada_recent_requests();
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_result->'items') LOOP
    IF v_previous IS NOT NULL AND (v_item->>'createdAt')::timestamptz>v_previous THEN RAISE EXCEPTION 'requests not newest first'; END IF;
    v_previous := (v_item->>'createdAt')::timestamptz;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_result->'items') x
    WHERE x->>'id'=current_setting('naqada.test_request') AND x->>'status'='published')
    OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_result->'items') x
    WHERE x->>'id'=current_setting('naqada.test_business')) THEN RAISE EXCEPTION 'missing request history'; END IF;
END;
$$;
DO $$
DECLARE v_items jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims',current_setting('naqada.test_member'),true);
  v_items := public.get_naqada_request_notifications()->'items';
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_items) x WHERE x->>'href'='/listing/editor-'||current_setting('naqada.test_request')||'/')
    OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_items) x WHERE x->>'href'='/activity/'||current_setting('naqada.test_business')||'/')
    THEN RAISE EXCEPTION 'recipient missing publication notice'; END IF;
  IF EXISTS (SELECT 1 FROM public.directory_request_notifications WHERE user_id<>(SELECT auth.uid())) THEN RAISE EXCEPTION 'RLS leaks other members'; END IF;
  BEGIN
    PERFORM public.get_naqada_recent_requests();
    RAISE EXCEPTION 'member accessed admin request history';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'not authorized' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO public.directory_request_notifications(user_id,request_kind,request_id,status,title,href,label,detail,occurred_at)
      VALUES(auth.uid(),'contribution',gen_random_uuid(),'published','مزيف','/account/','مزيف','مزيف',now());
    RAISE EXCEPTION 'member forged a decision';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('request.jwt.claims',current_setting('naqada.test_other'),true);
  IF EXISTS (SELECT 1 FROM public.directory_request_notifications WHERE request_id IN
    (current_setting('naqada.test_request')::uuid,current_setting('naqada.test_business')::uuid)) THEN RAISE EXCEPTION 'another member read recipient notices'; END IF;
END;
$$;
RESET ROLE;
DO $$
DECLARE v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims',current_setting('naqada.test_owner'),true);
  UPDATE public.directory_contributions SET status='published' WHERE id=current_setting('naqada.test_request')::uuid;
  SELECT count(*) INTO v_count FROM public.directory_request_notifications WHERE request_id=current_setting('naqada.test_request')::uuid;
  IF v_count<>1 THEN RAISE EXCEPTION 'same decision duplicated'; END IF;
  UPDATE public.directory_contributions SET status='needs_info' WHERE id=current_setting('naqada.test_request')::uuid;
  UPDATE public.directory_contributions SET status='published' WHERE id=current_setting('naqada.test_request')::uuid;
  SELECT count(*) INTO v_count FROM public.directory_request_notifications WHERE request_id=current_setting('naqada.test_request')::uuid;
  IF v_count<>3 THEN RAISE EXCEPTION 'decision history lost on repeat review'; END IF;
  UPDATE public.directory_contributions SET status='published' WHERE id=current_setting('naqada.test_anonymous')::uuid;
  IF EXISTS (SELECT 1 FROM public.directory_request_notifications WHERE request_id=current_setting('naqada.test_anonymous')::uuid) THEN RAISE EXCEPTION 'anonymous recipient invented'; END IF;
  IF has_function_privilege('anon','public.get_naqada_request_notifications()','execute')
    OR has_function_privilege('anon','public.get_naqada_recent_requests()','execute')
    OR has_function_privilege('authenticated','naqada_private.capture_request_decision()','execute') THEN RAISE EXCEPTION 'unexpected privileged access'; END IF;
END;
$$;
ROLLBACK;
SELECT 'Publication, recipient isolation, durable decisions, newest-first history, and anonymous handling passed; test records rolled back.' AS result;
