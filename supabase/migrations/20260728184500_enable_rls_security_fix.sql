-- Enable Row Level Security (RLS) on public tables to resolve Supabase Security Linter errors (0013_rls_disabled_in_public)

-- 1. users
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_public_read" ON public.users;
CREATE POLICY "users_public_read" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_authenticated_write" ON public.users;
CREATE POLICY "users_authenticated_write" ON public.users FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 2. groups
ALTER TABLE IF EXISTS public.groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "groups_public_read" ON public.groups;
CREATE POLICY "groups_public_read" ON public.groups FOR SELECT USING (true);

DROP POLICY IF EXISTS "groups_authenticated_write" ON public.groups;
CREATE POLICY "groups_authenticated_write" ON public.groups FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 3. intent_logs
ALTER TABLE IF EXISTS public.intent_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intent_logs_public_read" ON public.intent_logs;
CREATE POLICY "intent_logs_public_read" ON public.intent_logs FOR SELECT USING (true);

-- 4. posts
ALTER TABLE IF EXISTS public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "posts_public_read" ON public.posts;
CREATE POLICY "posts_public_read" ON public.posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "posts_authenticated_write" ON public.posts;
CREATE POLICY "posts_authenticated_write" ON public.posts FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 5. votes
ALTER TABLE IF EXISTS public.votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "votes_public_read" ON public.votes;
CREATE POLICY "votes_public_read" ON public.votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "votes_authenticated_write" ON public.votes;
CREATE POLICY "votes_authenticated_write" ON public.votes FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 6. sessions
ALTER TABLE IF EXISTS public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sessions_owner_access" ON public.sessions;
DROP POLICY IF EXISTS "sessions_access" ON public.sessions;
CREATE POLICY "sessions_access" ON public.sessions FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 7. memberships
ALTER TABLE IF EXISTS public.memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "memberships_public_read" ON public.memberships;
CREATE POLICY "memberships_public_read" ON public.memberships FOR SELECT USING (true);

DROP POLICY IF EXISTS "memberships_authenticated_write" ON public.memberships;
CREATE POLICY "memberships_authenticated_write" ON public.memberships FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 8. comments
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comments_public_read" ON public.comments;
CREATE POLICY "comments_public_read" ON public.comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "comments_authenticated_write" ON public.comments;
CREATE POLICY "comments_authenticated_write" ON public.comments FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
