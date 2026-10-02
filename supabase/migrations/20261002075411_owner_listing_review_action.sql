-- Review an awaiting owner activity with the same permissions as the moderator
-- workspace. Keep the decision, private recipient notice, and audit atomic.
CREATE POLICY "moderators read pending activities"
  ON public.directory_owner_listings FOR SELECT TO authenticated
  USING (status = 'pending' AND (SELECT public.can_moderate_naqada()));

CREATE OR REPLACE FUNCTION public.review_naqada_owner_listing(p_id uuid, p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_status text; v_actor uuid := (SELECT auth.uid());
BEGIN
  IF v_actor IS NULL OR NOT coalesce(public.can_moderate_naqada(), false) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL OR p_status IS NULL OR p_status NOT IN ('published', 'rejected') THEN
    RAISE EXCEPTION 'invalid review decision' USING ERRCODE = '22023';
  END IF;

  SELECT status INTO v_status FROM public.directory_owner_listings WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); END IF;
  IF v_status = p_status THEN
    RETURN jsonb_build_object('ok', true, 'id', p_id, 'status', v_status, 'changed', false);
  END IF;
  IF v_status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_REVIEWED', 'status', v_status);
  END IF;

  UPDATE public.directory_owner_listings SET status = p_status WHERE id = p_id;
  INSERT INTO public.directory_moderator_audit(actor_id, action, target_kind, target_id, detail)
    VALUES (v_actor, 'submission_' || p_status, 'business', p_id::text,
      jsonb_build_object('edited', false, 'source', 'pending_activities'));
  RETURN jsonb_build_object('ok', true, 'id', p_id, 'status', p_status, 'changed', true);
END;
$$;
REVOKE ALL ON FUNCTION public.review_naqada_owner_listing(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_naqada_owner_listing(uuid, text) TO authenticated;
NOTIFY pgrst, 'reload schema';
