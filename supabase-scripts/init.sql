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

-- Allow anyone (anon key) to read messages
DROP POLICY IF EXISTS "Public read" ON public.dao_chat_messages;
CREATE POLICY "Public read"
  ON public.dao_chat_messages
  FOR SELECT
  USING (true);

-- Allow anyone to insert (wallet-signed messages; spam handled at app layer)
DROP POLICY IF EXISTS "Public insert" ON public.dao_chat_messages;
CREATE POLICY "Public insert"
  ON public.dao_chat_messages
  FOR INSERT
  WITH CHECK (true);

-- ─── 3. Realtime ───────────────────────────────────────────────────────────────
-- Enable Realtime on this table so the frontend receives live INSERT events.
ALTER PUBLICATION supabase_realtime ADD TABLE public.dao_chat_messages;

-- ─── 4. Optional: add attachment_url if upgrading an existing table ────────────
ALTER TABLE public.dao_chat_messages
  ADD COLUMN IF NOT EXISTS attachment_url text;
