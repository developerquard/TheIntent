-- Collaboration MVP: multi-user rooms with approval system

-- Collaboration rooms table
CREATE TABLE public.collaboration_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  topic TEXT NOT NULL,
  intent_hash TEXT NOT NULL,
  max_members INTEGER NOT NULL DEFAULT 6 CHECK (max_members IN (2, 4, 6, 8, 10)),
  join_method TEXT NOT NULL DEFAULT 'admin_approval' CHECK (join_method IN ('admin_approval', 'member_voting')),
  admin_id TEXT NOT NULL,
  member_ids TEXT[] NOT NULL DEFAULT '{}',
  member_labels TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Join requests table
CREATE TABLE public.join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.collaboration_rooms(id) ON DELETE CASCADE,
  requester_id TEXT NOT NULL,
  requester_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('join_request', 'join_approved', 'join_declined')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  related_id UUID NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT ON public.collaboration_rooms TO anon, authenticated;
GRANT ALL ON public.collaboration_rooms TO service_role;
GRANT SELECT ON public.join_requests TO anon, authenticated;
GRANT ALL ON public.join_requests TO service_role;
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- RLS
ALTER TABLE public.collaboration_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collaboration_rooms public read" ON public.collaboration_rooms FOR SELECT USING (true);

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "join_requests public read" ON public.join_requests FOR SELECT USING (true);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications user read" ON public.notifications FOR SELECT USING (user_id = auth.uid()::text);

-- Realtime
ALTER TABLE public.collaboration_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.join_requests REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.join_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Indexes
CREATE INDEX idx_collaboration_rooms_intent_hash ON public.collaboration_rooms (intent_hash, status);
CREATE INDEX idx_join_requests_room ON public.join_requests (room_id, status);
CREATE INDEX idx_notifications_user ON public.notifications (user_id, is_read, created_at DESC);
