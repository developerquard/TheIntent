-- Intent-based social network: core tables

CREATE TABLE public.intents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_label TEXT NOT NULL,
  intent_text TEXT NOT NULL,
  intent_hash TEXT NOT NULL,
  decision TEXT NOT NULL DEFAULT 'ALLOW',
  flags JSONB NOT NULL DEFAULT '[]',
  policy_version TEXT NOT NULL DEFAULT 'sd-v0.2',
  status TEXT NOT NULL DEFAULT 'active',
  room_id UUID,
  match_similarity NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  intent_hash TEXT NOT NULL,
  member_ids TEXT[] NOT NULL DEFAULT '{}',
  member_labels TEXT[] NOT NULL DEFAULT '{}',
  decision TEXT NOT NULL DEFAULT 'ALLOW',
  policy_version TEXT NOT NULL DEFAULT 'sd-v0.2',
  match_similarity NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE public.room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_label TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  decision TEXT NOT NULL,
  intent_hash TEXT,
  room_id UUID,
  flags JSONB NOT NULL DEFAULT '[]',
  payload JSONB NOT NULL DEFAULT '{}',
  policy_version TEXT NOT NULL DEFAULT 'sd-v0.2',
  prev_hash TEXT NOT NULL DEFAULT '',
  entry_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'waitlist',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT ON public.intents TO anon, authenticated;
GRANT ALL ON public.intents TO service_role;
GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
GRANT SELECT ON public.room_messages TO anon, authenticated;
GRANT ALL ON public.room_messages TO service_role;
GRANT SELECT ON public.audit_logs TO anon, authenticated;
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.waitlist TO service_role;

-- RLS: public read for the intent feed / rooms / audit trail; all writes go through server functions (service_role)
ALTER TABLE public.intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intents public read" ON public.intents FOR SELECT USING (true);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms public read" ON public.rooms FOR SELECT USING (true);

ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages public read" ON public.room_messages FOR SELECT USING (true);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit public read" ON public.audit_logs FOR SELECT USING (true);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
-- no public policies on waitlist: writes via server function, no public reads

-- Realtime
ALTER TABLE public.room_messages REPLICA IDENTITY FULL;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.intents REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.intents;

CREATE INDEX idx_intents_status ON public.intents (status, created_at DESC);
CREATE INDEX idx_messages_room ON public.room_messages (room_id, created_at);
CREATE INDEX idx_audit_created ON public.audit_logs (id DESC);