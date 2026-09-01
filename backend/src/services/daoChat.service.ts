/**
 * Server-side write path for DAO chat, so posting can be gated on on-chain
 * membership. Reads and realtime stay client-direct (they're harmless); only
 * INSERTs go through here. Lock down anon INSERT on the table in Supabase and
 * this becomes the only way a message lands (see supabase-scripts/).
 */

const URL_BASE = () => process.env.SUPABASE_URL?.trim().replace(/\/+$/, '') ?? '';
// Prefer a service-role key; fall back to anon if that's all that's set.
const KEY = () => process.env.SUPABASE_SERVICE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim() || '';
const TABLE = 'dao_chat_messages';

export function daoChatConfigured(): boolean {
  return !!(URL_BASE() && KEY());
}

export type InsertedMessage = {
  id: string;
  daoAddress: string;
  senderWallet: string;
  senderLabel: string;
  content: string;
  attachmentUrl: string | null;
  createdAt: number;
};

export async function insertDaoChatMessage(params: {
  daoAddress: string;
  senderWallet: string;
  senderLabel: string;
  content: string;
  attachmentUrl?: string | null;
}): Promise<InsertedMessage> {
  const key = KEY();
  const row = {
    id: crypto.randomUUID(),
    room_key: params.daoAddress.toLowerCase(),
    sender_wallet: params.senderWallet,
    sender_label: params.senderLabel.slice(0, 120),
    content: params.content.slice(0, 1000),
    created_at: new Date().toISOString(),
    ...(params.attachmentUrl ? { attachment_url: params.attachmentUrl } : {}),
  };

  const res = await fetch(`${URL_BASE()}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify([row]),
    signal: AbortSignal.timeout(10_000),
  });

  const text = await res.text();
  if (!res.ok) {
    // Retry without attachment_url if the column isn't in this schema yet.
    if (params.attachmentUrl && /attachment_url|PGRST204|does not exist|schema cache/i.test(text)) {
      return insertDaoChatMessage({ ...params, attachmentUrl: null, content: [params.content, params.attachmentUrl].filter(Boolean).join('\n\n') });
    }
    throw new Error(`Supabase insert failed: ${res.status} ${text}`);
  }

  const parsed = JSON.parse(text) as Array<Record<string, unknown>>;
  const r = parsed[0] ?? row;
  return {
    id: String(r.id ?? row.id),
    daoAddress: String(r.room_key ?? row.room_key),
    senderWallet: String(r.sender_wallet ?? row.sender_wallet),
    senderLabel: String(r.sender_label ?? row.sender_label),
    content: String(r.content ?? row.content),
    attachmentUrl: (r.attachment_url as string | null) ?? params.attachmentUrl ?? null,
    createdAt: new Date(String(r.created_at ?? row.created_at)).getTime(),
  };
}
