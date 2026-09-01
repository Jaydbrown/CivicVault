-- CivicVault Supabase init — run once in the SQL Editor of your Supabase project.
-- Idempotent (safe to re-run).

-- ─── 1. Chat messages table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dao_chat_messages (
  id             text          PRIMARY KEY,
  room_key       text          NOT NULL,        -- DAO contract address (lowercase)
  sender_wallet  text          NOT NULL,
  sender_label   text          NOT NULL DEFAULT '',
  content        text          NOT NULL DEFAULT '',
  created_at     timestamptz   NOT NULL DEFAULT now(),
  attachment_url text
);

-- Index for fetching a room's messages in order
CREATE INDEX IF NOT EXISTS idx_dao_chat_room_time
  ON public.dao_chat_messages (room_key, created_at ASC);

-- ─── 2. Row-Level Security ─────────────────────────────────────────────────────
ALTER TABLE public.dao_chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone (anon key) can READ messages.
DROP POLICY IF EXISTS "Public read" ON public.dao_chat_messages;
CREATE POLICY "Public read"
  ON public.dao_chat_messages
  FOR SELECT
  USING (true);

-- Clients CANNOT write. Messages are posted through POST /api/chat/message,
-- which checks on-chain DAO membership and writes with the service role key.
DROP POLICY IF EXISTS "Public insert" ON public.dao_chat_messages;
DROP POLICY IF EXISTS "No client writes" ON public.dao_chat_messages;
CREATE POLICY "No client writes"
  ON public.dao_chat_messages
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ─── 3. Realtime ───────────────────────────────────────────────────────────────
-- Enable Realtime on this table so the frontend receives live INSERT events.
ALTER PUBLICATION supabase_realtime ADD TABLE public.dao_chat_messages;

-- ─── 4. Optional: add attachment_url if upgrading an existing table ────────────
ALTER TABLE public.dao_chat_messages
  ADD COLUMN IF NOT EXISTS attachment_url text;
