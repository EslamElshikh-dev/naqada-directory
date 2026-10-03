-- Covers stay separate from the five gallery photos. Existing galleries retain
-- their order and use their first image as the cover until the owner chooses one.
ALTER TABLE public.directory_owner_listings
  ADD COLUMN cover_path text,
  ADD COLUMN maps_url text,
  ADD CONSTRAINT directory_owner_listing_cover_length CHECK (cover_path IS NULL OR char_length(cover_path) <= 300),
  ADD CONSTRAINT directory_owner_listing_maps_url CHECK (maps_url IS NULL OR (
    char_length(maps_url) <= 600 AND maps_url ~ '^https://(maps[.]app[.]goo[.]gl/|goo[.]gl/maps|((www[.]|maps[.])?google[.]com/maps)|maps[.]google[.]com/($|[?]))'));

CREATE OR REPLACE FUNCTION public.guard_directory_owner_listing()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE photo_path text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.owner_user_id IS DISTINCT FROM NEW.owner_user_id OR OLD.id IS DISTINCT FROM NEW.id THEN
      RAISE EXCEPTION 'activity owner cannot be changed';
    END IF;
    NEW.created_at := OLD.created_at;
  ELSE
    NEW.created_at := now();
  END IF;
  NEW.updated_at := now();
  IF NOT coalesce(public.can_moderate_naqada(), false) THEN
    NEW.status := 'pending'; NEW.reviewed_at := null;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.reviewed_at := now();
  END IF;
  FOREACH photo_path IN ARRAY NEW.photo_paths LOOP
    IF photo_path !~ ('^' || NEW.owner_user_id::text || '/' || NEW.id::text || '/[0-9a-f-]{36}[.](jpg|png|webp)$') THEN
      RAISE EXCEPTION 'invalid activity photo path';
    END IF;
  END LOOP;
  IF NEW.cover_path IS NOT NULL AND NEW.cover_path !~
    ('^' || NEW.owner_user_id::text || '/' || NEW.id::text || '/[0-9a-f-]{36}[.](jpg|png|webp)$') THEN
    RAISE EXCEPTION 'invalid activity cover path';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_directory_owner_listing() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_published_naqada_photo(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.directory_owner_listings l
    WHERE l.id::text = split_part(p_path,'/',2) AND l.status='published'
      AND (p_path = l.cover_path OR p_path = ANY(l.photo_paths)));
$$;
REVOKE ALL ON FUNCTION public.is_published_naqada_photo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_published_naqada_photo(text) TO anon, authenticated;

-- Preserve the existing moderator dashboard and expose the new fields for review.
DO $$
DECLARE v_definition text;
BEGIN
  v_definition := pg_get_functiondef('public.get_naqada_moderator_dashboard(text)'::regprocedure);
  IF position('locality, photo_paths, status, created_at, reviewed_at' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'unexpected moderator dashboard projection';
  END IF;
  EXECUTE replace(v_definition, 'locality, photo_paths, status, created_at, reviewed_at',
    'locality, photo_paths, cover_path, maps_url, status, created_at, reviewed_at');
END;
$$;

ALTER TABLE public.directory_request_notifications
  DROP CONSTRAINT directory_request_notifications_request_kind_check,
  ADD CONSTRAINT directory_request_notifications_request_kind_check
    CHECK (request_kind IN ('business','contribution','cover'));
CREATE UNIQUE INDEX directory_activity_cover_reminder_unique
  ON public.directory_request_notifications(request_id) WHERE request_kind='cover';

CREATE FUNCTION naqada_private.capture_activity_cover_reminder()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.cover_path IS NOT NULL OR cardinality(NEW.photo_paths)>0 OR NEW.status='rejected' THEN
    DELETE FROM public.directory_request_notifications WHERE request_kind='cover' AND request_id=NEW.id;
  ELSIF NEW.status='published' THEN
    INSERT INTO public.directory_request_notifications
      (user_id,request_kind,request_id,status,title,href,label,detail,occurred_at)
    VALUES (NEW.owner_user_id,'cover',NEW.id,'needs_info',NEW.name,
      '/contribute/?edit='||NEW.id::text||'#activity-cover','ضيف صورة غلاف لنشاطك',
      'نشاطك اتقبل وظهر في الدليل بغلاف رمزي. ضيف صورة واضحة للواجهة أو لشغلك عشان يظهر بأجمل شكل.',clock_timestamp())
    ON CONFLICT (request_id) WHERE request_kind='cover'
      DO UPDATE SET title=EXCLUDED.title, detail=EXCLUDED.detail;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION naqada_private.capture_activity_cover_reminder() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER activity_cover_reminder
  AFTER INSERT OR UPDATE OF status,cover_path,photo_paths,name ON public.directory_owner_listings
  FOR EACH ROW EXECUTE FUNCTION naqada_private.capture_activity_cover_reminder();

-- Current published entries get one reminder. No publication status is changed.
INSERT INTO public.directory_request_notifications
  (user_id,request_kind,request_id,status,title,href,label,detail,occurred_at)
SELECT l.owner_user_id,'cover',l.id,'needs_info',l.name,
  '/contribute/?edit='||l.id::text||'#activity-cover','ضيف صورة غلاف لنشاطك',
  'نشاطك اتقبل وظهر في الدليل بغلاف رمزي. ضيف صورة واضحة للواجهة أو لشغلك عشان يظهر بأجمل شكل.',clock_timestamp()
FROM public.directory_owner_listings l
WHERE l.status='published' AND l.cover_path IS NULL AND cardinality(l.photo_paths)=0
ON CONFLICT (request_id) WHERE request_kind='cover' DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_naqada_request_notifications()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN jsonb_build_object('generatedAt',now(),'items',(
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id','request-decision:'||n.id::text,'href',n.href,'label',n.label,'title',n.title,
      'detail',n.detail,'occurredAt',n.occurred_at,
      'kind',CASE WHEN n.request_kind='cover' THEN 'cover' ELSE 'decision' END,'status',n.status,
      'tone',CASE WHEN n.status='published' THEN 'mint' WHEN n.status='rejected' THEN 'coral' ELSE 'gold' END
    ) ORDER BY n.occurred_at DESC,n.id DESC),'[]'::jsonb)
    FROM (SELECT * FROM public.directory_request_notifications WHERE user_id=(SELECT auth.uid())
      ORDER BY occurred_at DESC,id DESC LIMIT 100) n));
END;
$$;
REVOKE ALL ON FUNCTION public.get_naqada_request_notifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_naqada_request_notifications() TO authenticated;

-- Reconcile any missing acceptance notice without repeating an existing decision.
INSERT INTO public.directory_request_notifications
  (user_id,request_kind,request_id,status,title,href,label,detail,occurred_at)
SELECT l.owner_user_id,'business',l.id,'published',l.name,'/activity/'||l.id::text||'/',
  'تم قبول نشاطك ونشره','نشاطك اتقبل وبقى ظاهر لأهل البلد. افتح صفحته من هنا.',coalesce(l.reviewed_at,l.updated_at)
FROM public.directory_owner_listings l WHERE l.status='published' AND NOT EXISTS (
  SELECT 1 FROM public.directory_request_notifications n WHERE n.request_kind='business'
    AND n.request_id=l.id AND n.status='published');
NOTIFY pgrst, 'reload schema';
