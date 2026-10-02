CREATE OR REPLACE FUNCTION public.get_naqada_contribution_queue()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_now timestamptz := now();
begin
  if not public.can_moderate_naqada() then
    raise exception 'not authorized';
  end if;

  return jsonb_build_object(
    'generatedAt', v_now,
    'summary', jsonb_build_object(
      'pending', (select count(*) from public.directory_contributions where status = 'pending'),
      'reviewing', (select count(*) from public.directory_contributions where status = 'reviewing'),
      'needsInfo', (select count(*) from public.directory_contributions where status = 'needs_info'),
      'approved', (select count(*) from public.directory_contributions where status = 'approved'),
      'rejected', (select count(*) from public.directory_contributions where status = 'rejected'),
      'published', (select count(*) from public.directory_contributions where status = 'published'),
      'oldestOpenAt', (
        select min(created_at)
        from public.directory_contributions
        where status in ('pending','reviewing','needs_info','approved')
      )
    ),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ranked.id,
        'createdAt', ranked.created_at,
        'updatedAt', ranked.updated_at,
        'requestType', ranked.request_type,
        'name', ranked.name,
        'category', ranked.category,
        'locality', ranked.locality,
        'listingSlug', ranked.listing_slug,
        'details', ranked.details,
        'sourceUrl', ranked.source_url,
        'contact', ranked.contact,
        'hasContact', ranked.contact is not null,
        'status', ranked.status,
        'reviewNotes', ranked.review_notes,
        'reviewMessage', ranked.review_message,
        'reviewer', ranked.reviewer,
        'reviewedAt', ranked.reviewed_at,
        'submittedVia', ranked.submitted_via,
        'submittedByUserId', ranked.submitted_by_user_id,
        'reviewPriority', ranked.review_priority,
        'ageDays', ranked.age_days
      ) order by ranked.is_open desc, ranked.review_priority desc, ranked.created_at asc), '[]'::jsonb)
      from (
        select
          contribution.*,
          (contribution.status in ('pending','reviewing','needs_info','approved')) as is_open,
          (
            case
              when contribution.request_type = 'correction' and contribution.source_url is not null then 100
              when contribution.request_type = 'correction' then 90
              when contribution.request_type = 'missing' and contribution.source_url is not null then 80
              when contribution.request_type = 'missing' then 70
              when contribution.request_type = 'add' and contribution.source_url is not null then 60
              else 50
            end
            + least(20, floor(extract(epoch from (v_now - contribution.created_at)) / 86400)::int)
          ) as review_priority,
          greatest(0, floor(extract(epoch from (v_now - contribution.created_at)) / 86400)::int) as age_days
        from public.directory_contributions contribution
        where contribution.status in ('pending','reviewing','needs_info','approved')
           or contribution.updated_at >= v_now - interval '30 days'
        order by is_open desc, review_priority desc, contribution.created_at asc
        limit 200
      ) ranked
    )
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_naqada_gold_notifications()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is null or not public.can_moderate_naqada() then
    raise exception 'not authorized';
  end if;
  return jsonb_build_object(
    'generatedAt',now(),
    'items',(select coalesce(jsonb_agg(n.notice order by n.occurred_at desc),'[]'::jsonb)
      from (
        select created_at as occurred_at, jsonb_build_object(
          'id','business:'||id::text,'href','/admin/activities/',
          'label','نشاط ينتظر مراجعتك','title',name,
          'detail',coalesce(locality,'نقادة'),'occurredAt',created_at,'tone','gold') as notice
        from (select id,name,locality,created_at from public.directory_owner_listings
          where status='pending' order by created_at desc limit 50) businesses
        union all
        select created_at,jsonb_build_object(
          'id','contribution:'||id::text,'href','/admin/activities/',
          'label','طلب إضافة أو تصحيح','title',name,
          'detail',coalesce(locality,'نقادة'),'occurredAt',created_at,'tone','gold')
        from (select id,name,locality,created_at from public.directory_contributions
          where status in ('pending','reviewing','needs_info','approved') order by created_at desc limit 50) contributions
        union all
        select created_at,jsonb_build_object(
          'id','review:'||id::text,'href','/moderator/?tab=overview#workspace',
          'label','تقييم جديد بالدليل','title',coalesce(author_name,'عضو بالدليل'),
          'detail','تقييم الموقع','occurredAt',created_at,'tone','mint')
        from (select id,author_name,created_at from public.site_reviews
          where status='published' and created_at >= now()-interval '7 days'
          order by created_at desc limit 3) reviews
      ) n)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.publish_naqada_contribution(p_id uuid, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_row public.directory_contributions%rowtype;
  v_slug text;
  v_origin text;
  v_payload jsonb;
  v_actor uuid := (select auth.uid());
BEGIN
  IF v_actor IS NULL OR NOT public.can_moderate_naqada() THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR octet_length(p_payload::text)>12000
    OR char_length(trim(coalesce(p_payload->>'title',''))) NOT BETWEEN 3 AND 160
    OR char_length(trim(coalesce(p_payload->>'summary',''))) NOT BETWEEN 15 AND 2000
    OR char_length(trim(coalesce(p_payload->>'category',''))) NOT BETWEEN 2 AND 120
    OR char_length(trim(coalesce(p_payload->>'locality',''))) NOT BETWEEN 2 AND 160
    OR (coalesce(p_payload->>'phone','') <> '' AND (p_payload->>'phone') !~ '^[+]?[0-9]{10,15}$')
    OR char_length(coalesce(p_payload->>'address',''))>240
    OR char_length(coalesce(p_payload->>'sourceUrl',''))>1000
    OR (coalesce(p_payload->>'sourceUrl','')<>'' AND (p_payload->>'sourceUrl') !~ '^https?://')
    OR EXISTS (SELECT 1 FROM jsonb_each(p_payload) f WHERE f.key NOT IN ('title','summary','category','locality','phone','address','sourceUrl') OR jsonb_typeof(f.value)<>'string')
  THEN RAISE EXCEPTION 'invalid public fields'; END IF;
  SELECT * INTO v_row FROM public.directory_contributions WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF v_row.status NOT IN ('pending','reviewing','needs_info','approved') THEN RAISE EXCEPTION 'request already reviewed'; END IF;
  IF v_row.request_type='correction' THEN
    v_slug := v_row.listing_slug; v_origin := 'static';
    IF nullif(v_slug,'') IS NULL THEN RAISE EXCEPTION 'missing target'; END IF;
  ELSE
    v_slug := 'editor-'||v_row.id::text; v_origin := 'original';
  END IF;
  -- Keep existing published fields, including opening times and images.
  SELECT coalesce(payload,'{}'::jsonb) INTO v_payload
    FROM public.directory_curated_content WHERE kind='business' AND slug=v_slug;
  SELECT coalesce(v_payload,'{}'::jsonb)||coalesce(jsonb_object_agg(key,value),'{}'::jsonb)
    INTO v_payload FROM jsonb_each(p_payload) WHERE value <> '""'::jsonb;
  PERFORM public.save_naqada_editor_content('business',v_slug,v_origin,'published',v_payload);
  UPDATE public.directory_contributions SET status='published',reviewed_at=now(),
    reviewer=left(coalesce((select full_name from public.member_profiles where id=v_actor),'إدارة الدليل'),160)
    WHERE id=p_id;
  INSERT INTO public.directory_moderator_audit(actor_id,action,target_kind,target_id,detail)
    VALUES(v_actor,'contribution_published','contribution',p_id::text,jsonb_build_object('slug',v_slug));
  RETURN jsonb_build_object('ok',true,'status','published','href','/listing/'||v_slug||'/');
END;
$$;
REVOKE ALL ON FUNCTION public.publish_naqada_contribution(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_naqada_contribution(uuid,jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
