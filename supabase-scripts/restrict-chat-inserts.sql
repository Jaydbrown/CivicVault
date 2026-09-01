-- CivicVault — lock down DAO chat writes to the backend only.
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- After this, the anon key (which ships in the frontend bundle) can READ chat
-- but cannot INSERT. Messages are posted through POST /api/chat/message, which
-- verifies the caller is a verified member of the DAO on-chain and then writes
-- with the SERVICE ROLE key (RLS-exempt). Set SUPABASE_URL + SUPABASE_SERVICE_KEY
-- in backend/.env.

ALTER TABLE public.dao_chat_messages ENABLE ROW LEVEL SECURITY;

-- Reads stay open.
DROP POLICY IF EXISTS "Public read" ON public.dao_chat_messages;
CREATE POLICY "Public read"
  ON public.dao_chat_messages
  FOR SELECT
  USING (true);

-- Remove the old open-insert policy. With no INSERT policy, only the service
-- role (which bypasses RLS) can write.
DROP POLICY IF EXISTS "Public insert" ON public.dao_chat_messages;

-- Belt and braces: explicitly deny INSERT/UPDATE/DELETE to anon + authenticated.
DROP POLICY IF EXISTS "No client writes" ON public.dao_chat_messages;
CREATE POLICY "No client writes"
  ON public.dao_chat_messages
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
