ALTER TABLE public.intents
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days');

UPDATE public.intents
SET expires_at = created_at + interval '30 days'
WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_intents_active_expiry
  ON public.intents (status, expires_at, created_at DESC)
  WHERE room_id IS NULL;

CREATE OR REPLACE FUNCTION public.create_intent_match(
  p_actor_id TEXT,
  p_actor_label TEXT,
  p_intent_text TEXT,
  p_intent_hash TEXT,
  p_candidate_id UUID,
  p_topic TEXT,
  p_tags TEXT[],
  p_similarity NUMERIC
)
RETURNS TABLE (room_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate public.intents%ROWTYPE;
  created_room UUID;
BEGIN
  SELECT * INTO candidate
  FROM public.intents
  WHERE id = p_candidate_id
  FOR UPDATE;

  IF NOT FOUND
    OR candidate.status <> 'active'
    OR candidate.room_id IS NOT NULL
    OR candidate.expires_at <= now()
    OR candidate.actor_id = p_actor_id
  THEN
    RAISE EXCEPTION 'Candidate intent is no longer available';
  END IF;

  INSERT INTO public.rooms (
    topic,
    tags,
    intent_hash,
    member_ids,
    member_labels,
    decision,
    match_similarity,
    status
  )
  VALUES (
    p_topic,
    COALESCE(p_tags, '{}'),
    p_intent_hash,
    ARRAY[candidate.actor_id, p_actor_id],
    ARRAY[candidate.actor_label, p_actor_label],
    'ALLOW',
    p_similarity,
    'open'
  )
  RETURNING id INTO created_room;

  UPDATE public.intents
  SET status = 'matched', room_id = created_room, match_similarity = p_similarity
  WHERE id = candidate.id;

  INSERT INTO public.intents (
    actor_id,
    actor_label,
    intent_text,
    intent_hash,
    decision,
    status,
    room_id,
    match_similarity,
    expires_at
  )
  VALUES (
    p_actor_id,
    p_actor_label,
    p_intent_text,
    p_intent_hash,
    'ALLOW',
    'matched',
    created_room,
    p_similarity,
    now()
  );

  INSERT INTO public.room_messages (
    room_id,
    sender_id,
    sender_label,
    role,
    content
  )
  VALUES (
    created_room,
    'system',
    'policy engine',
    'system',
    format('Room formed · %s · decision ALLOW · similarity %s', p_topic, p_similarity)
  );

  room_id := created_room;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_intent_match(TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT[], NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_intent_match(TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT[], NUMERIC) TO service_role;
