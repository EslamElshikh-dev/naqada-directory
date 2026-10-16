-- Run inside a transaction with the migration; every fixture is rolled back.
do $$
declare v_gold uuid; v_member uuid;
begin
  select user_id into strict v_gold from public.directory_member_roles where role_code='gold_moderator' and frame_code='gold' and active limit 1;
  select id into strict v_member from auth.users where id<>v_gold and not exists(select 1 from public.directory_member_roles where user_id=id) and not exists(select 1 from public.directory_admins where email=lower(auth.users.email) and active) limit 1;
  perform set_config('naqada.test.gold',v_gold::text,true);
  perform set_config('naqada.test.member',v_member::text,true);
end $$;
set local role authenticated;
do $$
declare v_slug text := 'editor-00000000-0000-4000-8000-00000000ffff'; v_payload jsonb; v_first jsonb; v_published jsonb; v_draft jsonb; v_path text;
begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('naqada.test.gold'),'role','authenticated')::text,true);
  v_path := current_setting('naqada.test.gold') || '/00000000-0000-4000-8000-00000000ffff.webp';
  v_payload := jsonb_build_object('title','مقال اختبار كامل','summary','وصف مقال اختبار يحافظ على الصور والفقرات ولا يظهر للزوار',
    'document',jsonb_build_object('format','editorial','content',jsonb_build_object('slug',v_slug,'hero',jsonb_build_object('asset','/api/article-media/' || v_path)))::text);
  v_first := public.save_naqada_article_document('article',v_slug,'original','draft',v_payload,null);
  if exists(select 1 from jsonb_array_elements(public.get_public_naqada_content('article')) x where x->>'slug'=v_slug) then raise exception 'draft leaked'; end if;
  if public.is_published_naqada_article_media(v_path) then raise exception 'draft media is public'; end if;
  v_published := public.save_naqada_article_document('article',v_slug,'original','published',v_payload,(v_first->>'version')::timestamptz);
  if not public.is_published_naqada_article_media(v_path) then raise exception 'published media unavailable'; end if;
  v_draft := public.save_naqada_article_document('article',v_slug,'original','draft',v_payload || '{"title":"تعديل غير منشور"}'::jsonb,(v_published->>'version')::timestamptz);
  if not exists(select 1 from jsonb_array_elements(public.get_public_naqada_content('article')) x where x->>'slug'=v_slug and x->'payload'->>'title'='مقال اختبار كامل' and (x->>'updatedAt')::timestamptz=(v_published->>'version')::timestamptz) then raise exception 'draft replaced published copy'; end if;
  if not exists(select 1 from jsonb_array_elements(public.get_naqada_editor_content('article')) x where x->>'slug'=v_slug and x->'payload'->>'title'='تعديل غير منشور') then raise exception 'editor lost draft'; end if;
  begin
    perform public.save_naqada_article_document('article',v_slug,'original','published',v_payload,(v_published->>'version')::timestamptz);
    raise exception 'stale editor overwrote draft';
  exception when serialization_failure then null; end;
  perform public.save_naqada_article_document('article',v_slug,'original','hidden',v_payload,(v_draft->>'version')::timestamptz);
  if public.is_published_naqada_article_media(v_path) then raise exception 'hidden media still public'; end if;
  v_payload := jsonb_set(v_payload, '{document}', to_jsonb(jsonb_build_object('format','role_model','content',jsonb_build_object('slug',v_slug))::text));
  v_first := public.save_naqada_article_document('role_model',v_slug,'original','published',v_payload,null);
  if not exists(select 1 from jsonb_array_elements(public.get_public_naqada_content('role_model')) x where x->>'slug'=v_slug) then raise exception 'role model publication failed'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('naqada.test.member'),'role','authenticated')::text,true);
  begin
    perform public.save_naqada_article_document('article',v_slug,'original','draft',v_payload,null);
    raise exception 'ordinary member gained article access';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims','{}',true);
  begin
    perform public.save_naqada_article_document('article',v_slug,'original','draft',v_payload,null);
    raise exception 'anonymous caller gained article access';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'draft isolation, published media, conflict guard, gold access, member/anonymous denial passed' as result;
