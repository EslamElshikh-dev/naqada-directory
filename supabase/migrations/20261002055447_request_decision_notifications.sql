-- Decisions are written in the same transaction as the review and stay private
-- to the account that submitted the request. Anonymous requests have no recipient.
CREATE SCHEMA IF NOT EXISTS naqada_private;
REVOKE ALL ON SCHEMA naqada_private FROM PUBLIC, anon, authenticated;

CREATE TABLE public.directory_request_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_kind text NOT NULL CHECK (request_kind IN ('business','contribution')),
  request_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('approved','published','rejected','needs_info')),
  title text NOT NULL,
  href text NOT NULL CHECK (href LIKE '/%'),
  label text NOT NULL,
  detail text NOT NULL,
  occurred_at timestamptz NOT NULL,
  UNIQUE (request_kind, request_id, status, occurred_at)
);
CREATE INDEX directory_request_notifications_recipient_idx
  ON public.directory_request_notifications(user_id, occurred_at DESC, id DESC);
ALTER TABLE public.directory_request_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.directory_request_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.directory_request_notifications TO authenticated;
CREATE POLICY "members read their own request decisions"
  ON public.directory_request_notifications FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE FUNCTION naqada_private.capture_request_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid;
  v_kind text;
  v_href text;
  v_at timestamptz := clock_timestamp();
  v_label text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status
    OR NEW.status NOT IN ('approved','published','rejected','needs_info') THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'directory_owner_listings' THEN
    v_user := NEW.owner_user_id; v_kind := 'business';
    v_href := CASE WHEN NEW.status='published' THEN '/activity/'||NEW.id::text||'/'
      ELSE '/contribute/?edit='||NEW.id::text END;
  ELSE
    v_user := NEW.submitted_by_user_id; v_kind := 'contribution';
    v_href := CASE WHEN NEW.status='published' THEN '/listing/'||
      CASE WHEN NEW.request_type='correction' THEN NEW.listing_slug ELSE 'editor-'||NEW.id::text END||'/'
      ELSE '/account/' END;
  END IF;
  IF v_user IS NULL THEN RETURN NEW; END IF;
  v_label := CASE NEW.status WHEN 'published' THEN 'تم قبول طلبك ونشره'
    WHEN 'approved' THEN 'تم قبول طلبك — ينتظر النشر'
    WHEN 'needs_info' THEN 'طلبك يحتاج استكمال'
    ELSE CASE WHEN v_kind='business' THEN 'نشاطك يحتاج تعديل' ELSE 'لم يُقبل طلبك' END END;
  INSERT INTO public.directory_request_notifications
    (user_id,request_kind,request_id,status,title,href,label,detail,occurred_at)
  VALUES (v_user,v_kind,NEW.id,NEW.status,NEW.name,coalesce(v_href,'/account/'),v_label,
    CASE NEW.status WHEN 'published' THEN 'اتعمدت البيانات وظهرت في الدليل. افتح النشاط من هنا.'
      WHEN 'approved' THEN 'المراجعة تمت، والنشاط ينتظر إتمام النشر.'
      WHEN 'needs_info' THEN 'راجع تفاصيل طلبك واستكمل البيانات المطلوبة.'
      ELSE 'راجع البيانات قبل إرسالها للمراجعة مرة تانية.' END,v_at)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION naqada_private.capture_request_decision() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER contribution_decision_notification
  AFTER UPDATE OF status ON public.directory_contributions
  FOR EACH ROW EXECUTE FUNCTION naqada_private.capture_request_decision();
CREATE TRIGGER owner_listing_decision_notification
  AFTER UPDATE OF status ON public.directory_owner_listings
  FOR EACH ROW EXECUTE FUNCTION naqada_private.capture_request_decision();

-- Preserve decisions already made for signed-in members without re-reviewing them.
INSERT INTO public.directory_request_notifications
  (user_id,request_kind,request_id,status,title,href,label,detail,occurred_at)
SELECT c.submitted_by_user_id,'contribution',c.id,c.status,c.name,
  CASE WHEN c.status='published' THEN '/listing/'||CASE WHEN c.request_type='correction'
    THEN c.listing_slug ELSE 'editor-'||c.id::text END||'/' ELSE '/account/' END,
  CASE c.status WHEN 'published' THEN 'تم قبول طلبك ونشره' WHEN 'approved' THEN 'تم قبول طلبك — ينتظر النشر'
    WHEN 'needs_info' THEN 'طلبك يحتاج استكمال' ELSE 'لم يُقبل طلبك' END,
  'تمت مراجعة طلبك في دليل نقادة.',coalesce(c.reviewed_at,c.updated_at)
FROM public.directory_contributions c
WHERE c.submitted_by_user_id IS NOT NULL AND c.status IN ('approved','published','rejected','needs_info')
ON CONFLICT DO NOTHING;
INSERT INTO public.directory_request_notifications
  (user_id,request_kind,request_id,status,title,href,label,detail,occurred_at)
SELECT l.owner_user_id,'business',l.id,l.status,l.name,
  CASE WHEN l.status='published' THEN '/activity/'||l.id::text||'/' ELSE '/contribute/?edit='||l.id::text END,
  CASE WHEN l.status='published' THEN 'تم قبول طلبك ونشره' ELSE 'نشاطك يحتاج تعديل' END,
  'تمت مراجعة نشاطك في دليل نقادة.',coalesce(l.reviewed_at,l.updated_at)
FROM public.directory_owner_listings l WHERE l.status IN ('published','rejected')
ON CONFLICT DO NOTHING;

CREATE FUNCTION public.get_naqada_request_notifications()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN jsonb_build_object('generatedAt',now(),'items',(
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id','request-decision:'||n.id::text,'href',n.href,'label',n.label,'title',n.title,
      'detail',n.detail,'occurredAt',n.occurred_at,'tone',CASE WHEN n.status='published' THEN 'mint'
        WHEN n.status='rejected' THEN 'coral' ELSE 'gold' END
    ) ORDER BY n.occurred_at DESC,n.id DESC),'[]'::jsonb)
    FROM (SELECT * FROM public.directory_request_notifications WHERE user_id=(SELECT auth.uid())
      ORDER BY occurred_at DESC,id DESC LIMIT 100) n));
END;
$$;
REVOKE ALL ON FUNCTION public.get_naqada_request_notifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_naqada_request_notifications() TO authenticated;

CREATE FUNCTION public.get_naqada_recent_requests()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.can_moderate_naqada() THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN jsonb_build_object('generatedAt',now(),'items',(
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id',r.id,'kind',r.kind,'requestType',r.request_type,'name',r.name,'locality',r.locality,
      'status',r.status,'createdAt',r.created_at,'reviewedAt',r.reviewed_at,
      'details',r.details,'contact',r.contact,'submitter',p.full_name,'hasMember',r.user_id IS NOT NULL,
      'href',r.href,'reviewHref','/admin/activities/#'||CASE WHEN r.status IN ('pending','reviewing','needs_info','approved')
        THEN r.kind||'-'||r.id::text ELSE 'request-'||r.kind||'-'||r.id::text END
    ) ORDER BY r.created_at DESC,r.id DESC),'[]'::jsonb)
    FROM (
      SELECT * FROM (
        (SELECT c.id,'contribution'::text AS kind,c.request_type,c.name,c.locality,c.status,c.created_at,
          c.reviewed_at,c.details,c.contact,c.submitted_by_user_id AS user_id,
          '/listing/'||CASE WHEN c.request_type='correction' THEN c.listing_slug ELSE 'editor-'||c.id::text END||'/' AS href
          FROM public.directory_contributions c ORDER BY c.created_at DESC,c.id DESC LIMIT 50)
        UNION ALL
        (SELECT l.id,'business','business',l.name,l.locality,l.status,l.created_at,
          l.reviewed_at,l.description,l.phone,l.owner_user_id,'/activity/'||l.id::text||'/'
          FROM public.directory_owner_listings l ORDER BY l.created_at DESC,l.id DESC LIMIT 50)
      ) requests ORDER BY created_at DESC,id DESC LIMIT 50
    ) r LEFT JOIN public.member_profiles p ON p.id=r.user_id));
END;
$$;
REVOKE ALL ON FUNCTION public.get_naqada_recent_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_naqada_recent_requests() TO authenticated;
NOTIFY pgrst,'reload schema';

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
      ) order by ranked.is_open desc, ranked.created_at desc, ranked.id desc), '[]'::jsonb)
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
        order by is_open desc, contribution.created_at desc, contribution.id desc
        limit 200
      ) ranked
    )
  );
end;
$function$;
