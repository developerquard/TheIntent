-- Keep room content private to authenticated room members.
REVOKE SELECT ON public.rooms FROM anon;
REVOKE SELECT ON public.room_messages FROM anon;
REVOKE SELECT ON public.collaboration_rooms FROM anon;
REVOKE SELECT ON public.join_requests FROM anon, authenticated;
GRANT SELECT ON public.join_requests TO authenticated;

DROP POLICY IF EXISTS "collaboration_rooms public read" ON public.collaboration_rooms;
CREATE POLICY "collaboration_rooms authenticated read" ON public.collaboration_rooms
  FOR SELECT
  TO authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "rooms public read" ON public.rooms;
CREATE POLICY "rooms members read" ON public.rooms
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = ANY (member_ids));

DROP POLICY IF EXISTS "messages public read" ON public.room_messages;
CREATE POLICY "messages members read" ON public.room_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms
      WHERE public.rooms.id = room_messages.room_id
        AND auth.uid()::text = ANY (public.rooms.member_ids)
    )
  );

DROP POLICY IF EXISTS "join_requests public read" ON public.join_requests;
CREATE POLICY "join_requests participants read" ON public.join_requests
  FOR SELECT
  TO authenticated
  USING (
    requester_id = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.collaboration_rooms
      WHERE public.collaboration_rooms.id = join_requests.room_id
        AND (
          admin_id = auth.uid()::text
          OR auth.uid()::text = ANY (public.collaboration_rooms.member_ids)
        )
    )
  );
