const SUBGRAPH_URL = (import.meta.env.VITE_SUBGRAPH_URL as string | undefined)?.trim();

async function querySubgraph<T>(query: string): Promise<T | null> {
  if (!SUBGRAPH_URL) return null;
  try {
    const res = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { data?: T; errors?: unknown[] };
    if (json.errors?.length) return null;
    return json.data ?? null;
  } catch {
    return null;
  }
}

export type SubgraphStats = {
  daoCount: number;
  memberCount: number;
  investmentCount: number;
  totalValueLockedUsdc: string;
  totalYieldGeneratedUsdc: string;
};

export async function fetchSubgraphStats(): Promise<SubgraphStats | null> {
  type RawStats = {
    daos: Array<{
      memberCount: string;
      investmentCount: string;
      totalValueLocked: string;
      investments: Array<{ totalYieldGenerated: string }>;
    }>;
  };

  const data = await querySubgraph<RawStats>(`{
    daos(first: 100, where: { isActive: true }) {
      memberCount
      investmentCount
      totalValueLocked
      investments {
        totalYieldGenerated
      }
    }
  }`);

  if (!data) return null;

  const daos = data.daos;
  let members = 0n;
  let investments = 0n;
  let tvl = 0n;
  let yield_ = 0n;

  for (const dao of daos) {
    members += BigInt(dao.memberCount);
    investments += BigInt(dao.investmentCount);
    tvl += BigInt(dao.totalValueLocked);
    for (const inv of dao.investments) {
      yield_ += BigInt(inv.totalYieldGenerated);
    }
  }

  const fmt = (raw: bigint) =>
    (Number(raw) / 1e6).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

  return {
    daoCount: daos.length,
    memberCount: Number(members),
    investmentCount: Number(investments),
    totalValueLockedUsdc: fmt(tvl),
    totalYieldGeneratedUsdc: fmt(yield_),
  };
}

export async function fetchSubgraphRecentInvestments(limit = 10) {
  type RawInv = {
    investmentId: string;
    name: string;
    status: number;
    fundNeeded: string;
    upvotes: string;
    createdAt: string;
    dao: { id: string; name: string };
  };

  const data = await querySubgraph<{ investments: RawInv[] }>(`{
    investments(first: ${limit}, orderBy: createdAt, orderDirection: desc) {
      investmentId
      name
      status
      fundNeeded
      upvotes
      createdAt
      dao { id name }
    }
  }`);

  return data?.investments ?? [];
}
