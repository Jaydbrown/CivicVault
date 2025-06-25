# Grant Proposal: CivicVault — Neighborhood Investment Platform

---

## Executive Summary

**CivicVault** is a fully on-chain, community-first investment platform that enables local neighborhoods to pool capital, govern shared investment decisions, and distribute yield — transparently and without intermediaries. Built directly on Circle's **Arc Network** with USDC as the native settlement currency, CivicVault removes price-volatility risk from community finance while keeping every dollar traceable on-chain.

This grant request supports security auditing, mainnet launch, and community onboarding infrastructure for a protocol that directly addresses one of the most persistent gaps in decentralized finance: **hyperlocal, real-world economic coordination**. The protocol is not a speculative DeFi product — it was built by looking at real problems that real communities live with daily and engineering a solution that fits those problems exactly.

---

## Problem Statement

Nigeria has a transparency problem that nobody has solved. When the transformer serving a street burns out, residents know the electricity company will not replace it — so they organize themselves. Everyone on the street contributes money toward buying a new one. Someone volunteers to hold the funds. Weeks pass. The transformer never arrives. The money is gone. Nobody can prove what happened to it because nothing was ever written down in a place no one can edit. The street goes back to darkness, and everyone accepts it because this is simply how things work.

The same story plays out at every level of Nigerian community life. Parents pay school development levies every term and never see where the money goes. A PTA chairman collects contributions for a new classroom block that never breaks ground, and by the next school year a new chairman is in place and nobody is accountable for the previous cycle. Community development associations collect annual dues from estate residents for road repairs and streetlights that never get built. Student union governments at universities collect hundreds of thousands of naira in annual dues and spend them with no public record, no vote on where it goes, and no enforceable claim for any member who asks. Ajo and esusu groups — how millions of Nigerians save and invest collectively — run entirely through personal accounts managed by a single trusted admin, and when that trust breaks, the money breaks with it.

These are not edge cases. They are the everyday financial realities of communal life across Nigeria and the broader African market, and they share one root cause: money pooled by a group of people with no enforceable, transparent record of where it went.

**Three barriers have historically blocked a solution:**

1. **Technical friction.** Most Web3 tools are built for sophisticated financial actors. Seed phrases, gas tokens, and wallet management exclude the PTA chairman, the street community organizer, and the esusu group admin who need these tools the most.
2. **Volatility risk.** Building community finance on volatile-asset chains means members can lose purchasing power before a single dollar is deployed. A community pooling money for a transformer should not be exposed to ETH price swings.
3. **No accessible alternative.** A Gnosis Safe multisig also prevents unilateral fund movement — but it requires every signer to hold ETH for gas, manage a Web3 wallet, and remain coordinated online when a signing threshold is needed. None of that is realistic for a PTA chairman in Surulere or a student union treasurer in Ile-Ife. The closest existing tool still requires the user to come to Web3. CivicVault brings Web3 to the user.

---

## Solution: CivicVault

CivicVault is a **Neighborhood DAO protocol** where:

1. A **founder** deploys a local DAO through a gas-efficient EIP-1167 clone factory — one transaction, no legal overhead.
2. **Admins** onboard and KYC-verify members using on-chain hash commitments — no personal data stored on-chain.
3. **Admins** create investment proposals — local infrastructure, transformer replacements, school buildings, cooperative loans — with funding targets, deadlines, risk grades, and IPFS-linked documents.
4. **Verified members** vote by staking USDC upvotes (proof-of-conviction) or casting free downvotes.
5. When a proposal hits its funding target, funds are **escrowed and released in three milestone phases** (30% / 40% / 30%).
6. **Finance managers** propose yield deposits; **3-of-N multi-sig admin approval** gates every disbursement.
7. Eligible members **claim yield proportional to their stake** at any time.

Every step is recorded on-chain with a timestamped, tamper-proof activity timeline.

Critically, CivicVault is built for people who have never heard of blockchain. Users sign in with email or Google — a wallet is created automatically, no seed phrase required. Every fee is in USDC. Arc's USDC-native architecture means there is no ETH, no BNB, no separate gas token. The blockchain is entirely invisible. The experience is indistinguishable from a modern banking app.

---

## Technical Architecture

### Smart Contracts (Solidity 0.8.24 · Foundry · OpenZeppelin)

| Contract | Role |
|----------|------|
| `CivicVaultFactory` | EIP-1167 minimal-proxy factory; one deployment creates unlimited DAO clones gas-efficiently |
| `CivicVault` | Per-DAO logic: members, KYC, investments, voting, escrow, yield multi-sig, claim |
| `CivicVaultView` | Gas-free read helpers for frontends |
| `YieldCalculator` | Library: proportional yield math, overflow-safe |
| `InvestmentManager` | Library: activation logic, deadline extension rules, phase gating |
| `StringUtils` | Library: on-chain address/uint formatting for activity logs |
| `ICivicVault` | Interface + shared structs (User, Investment, Vote, YieldDistribution, Activity) |

**Deployed on Arc Testnet:**
- Factory: `0x5000F14A757d4488297772b694f18EaF0eC45C81`
- Implementation: `0x5a9D34264Da36cd05B66Fab80e6e5D6feDC9fDBC`
- First DAO: `0xA80b7ca6A50C2424BA4C3bf7c0B7700f0D6DC5a6`

**Security patterns:**
- `ReentrancyGuard` on all state-modifying ERC-20 transfer paths
- CEI (Check-Effects-Interactions) ordering throughout
- `Pausable` emergency stop on all writes (creator-only)
- `SafeERC20` for all USDC transfers
- `Initializable` to prevent re-initialization on proxies
- 35+ typed custom errors (gas-efficient revert paths)
- 3-of-N multi-sig requirement for yield deposit execution
- 90-day configurable grace period before unclaimed yield can be swept

### Three Client Surfaces

**Web App (Live)** — React 19 · TypeScript · Vite 6 · Tailwind 4

| View | Purpose |
|------|---------|
| Landing Page | Hero, features, governance visualization, FAQ, AI assistant |
| Dashboard | TVL, active DAOs, proposals needing attention, yield notifications |
| Create DAO | Metadata, logo upload (IPFS/Pinata), governance params |
| Discover | Browse and filter all active DAOs |
| Investments | Create and manage investment proposals |
| Voting Interface | Cast upvotes (with USDC stake) or downvotes per proposal |
| KYC Verification | Admin flow for member identity verification |
| Yields | Claimable balances, yield history, deposit proposals |
| Wallet | USDC balances, allowances, transaction history |
| Messages | Per-DAO real-time chat (Supabase Realtime) |
| Profile | Avatar (IPFS), display name, Gmail notification preferences |

Live at: `civic-vault-aupu.vercel.app`

**Mobile App (Complete)** — React Native · Expo

Full protocol access optimized for mobile-first, low-bandwidth environments. Targets the African market where mobile is the primary computing device. Pending app store submission (iOS and Android).

**DApp (Roadmap)** — IPFS-hosted · ENS domain

A fully decentralized frontend with no central point of failure. Connects directly to Arc Mainnet with no backend dependency — users interact with DAO treasuries, vote on proposals, and claim yield entirely through on-chain calls. Critical for communities in markets with infrastructure instability.

### Backend (Node · Express 5 · Prisma · SQLite)

| Module | Role |
|--------|------|
| `/api/auth` | Gmail OAuth connect/callback, per-DAO email notification preferences |
| `/api/chat` | Chat subscriptions; webhook fan-out for new message alerts |
| `/api/ai` | Gemini-powered homepage assistant (CivicVault-specific system prompt) |
| `/api/notifications` | In-app notification store (Prisma + SQLite) |
| `/api/wallets` | Circle Programmable Wallets provisioning via W3S API |
| RabbitMQ workers | Async queue: `chatDispatch.consumer`, `emailDeliver.consumer` with retries and DLQ |

### Storage & Analytics

- **IPFS (Pinata):** DAO logos, member profile photos, investment document CIDs, chat image attachments
- **Supabase:** Chat persistence (`dao_chat_messages` table with Realtime websocket)
- **The Graph:** Custom subgraph indexing all DAOs, members, TVL, investments, votes, and yield flows in real time
  - Endpoint: `https://api.studio.thegraph.com/query/1755424/civicvault/v0.0.1`
  - Dashboard: `https://thegraph.com/studio/subgraph/civicvault`

---

## Circle Integration

### Currently Integrated

| Product | How It Is Used |
|---|---|
| **Arc Testnet** | Exclusive deployment chain for all smart contracts |
| **USDC** | Native gas and settlement token across all staking, escrow, voting, yield deposits, and yield claims |
| **Circle Programmable Wallets** | Developer-controlled wallets (W3S API) provisioned per user in the backend — gives users who are not yet comfortable with self-custody a fully managed entry point |

### Planned Integrations

| Product | Timeline | Purpose |
|---|---|---|
| **Arc Mainnet** | Q3 2026 | Primary production deployment |
| **Circle Paymaster** | Q3 2026 | Sponsor gas for first-time users — their first vote or DAO creation costs nothing |
| **CCTP** | Q1 2027 | Multi-chain USDC deposits from Base, Ethereum, and Solana directly into DAO treasuries |

---

## Key Technical Differentiators

### 1. EIP-1167 Clone Factory
Each DAO is a gas-efficient minimal proxy. Communities never pay to redeploy 900+ lines of contract logic.

### 2. Staked Voting (Proof of Conviction)
Upvotes transfer real USDC into escrow. Members who believe in a proposal put capital behind it. Downvotes are free but carry no weight — preventing veto-without-accountability dynamics.

### 3. Phased Escrow Release
The 30/40/30 phase structure means project executors must demonstrate progress to unlock subsequent tranches, reducing misuse risk without requiring external oracles.

### 4. Multi-Sig Yield Governance
Yield deposits require 3-of-N admin approval. The proposer must have USDC balance and allowance at execution time — not at proposal time — preventing ghost proposals.

### 5. Proportional Yield Claims
`claimYield` computes `totalEntitled - alreadyClaimed` so partial deposits and rolling claims work correctly without double-counting.

### 6. KYC Without Privacy Leakage
KYC is a `bytes32` hash commitment. No personal data is stored on-chain. Admins hold the off-chain proof; the contract only records that verification occurred.

### 7. Tamper-Proof Activity Timeline
Every state change is stored in a per-investment `Activity[]` array on-chain — an auditable, permanent history that no administrator can edit or delete.

---

## How CivicVault Gets Users

CivicVault's go-to-market is community-first, not crypto-first. The target user is a community organizer, not a DeFi power user. Every acquisition channel flows from that.

**Personal network first.** The founder's first three DAO deployments are facilitated onboardings of groups already within reach — family ajo cycles, church investment arms, alumni clubs. These produce the first working case studies: real communities, real money, real on-chain records. Those case studies become the primary acquisition asset for every group that follows.

**Street and estate groups.** When a street's transformer burns out and a new collection drive begins, CivicVault is the tool the organizer uses so that every contributor can see the balance in real time and funds only move when the group votes. Reached through estate WhatsApp groups, neighborhood association meetings, and warm introductions through trusted community contacts.

**PTA and school development committees.** Approached through school administrators and parent community leaders. CivicVault replaces the spreadsheet and the treasurer's personal account — every parent can see exactly how much has been collected, what it was voted to be spent on, and what milestone must be reached before the next tranche releases to the contractor.

**Student union governments.** Engaged directly at UNILAG, OAU, Covenant University, and LASU with a proposal to run their next budget cycle on-chain at no cost for the first year. Student union finances are one of the highest-visibility accountability failures in Nigerian university life. One university running on CivicVault becomes a story that spreads to every other campus through student networks without advertising spend.

**Ajo and esusu cooperatives.** Reached through cooperative society associations and the founder's existing network. Each group runs one complete cycle on CivicVault with direct support before operating independently. Once one group in a network succeeds, every other group wants to know how they did it.

**Nigerian diaspora clubs.** Investment clubs in the UK and US that pool capital to invest back into Nigeria need a neutral, enforceable coordination layer that does not depend on a single trusted person holding a foreign bank account. CivicVault gives every member real-time visibility and voting rights from anywhere in the world.

**Public donation and fundraising platforms.** CivicVault intends to be present at every point where communal money is currently changing hands without accountability. The goal is not to compete with donation platforms — it is to be the accountability infrastructure those platforms and organizers reach for when they want contributors to actually trust that money will be used as promised.

---

## Revenue Model

CivicVault operates on a protocol fee model tied to community success. The protocol earns nothing when a DAO is idle. It earns when communities succeed.

**Primary — Protocol yield fee (1.5%):** When yield is distributed to DAO members, CivicVault retains 1.5% of total yield distributed. Enforced in the smart contract at distribution time — automatic, transparent, visible to every member before they join. On $500,000 USDC in yield flowing through the protocol, that is $7,500 to the protocol treasury.

**Secondary — DAO creation fee ($10 USDC):** A minimal one-time fee on each factory deployment. Never a barrier to entry; creates a sustainable baseline as DAO count scales.

**Tertiary — Institutional premium tier:** Registered cooperatives, student unions, church investment arms, and CDAs that need custom branding, compliance reporting exports, priority facilitation, and higher member limits pay a monthly USDC subscription priced by member count.

This model works because the alternative costs far more. A lawyer to structure a community investment entity costs hundreds of thousands of naira before a single meeting. A bank account with joint signatories has fees, access restrictions, and no audit trail. A traditional cooperative administrator takes a management cut that exceeds CivicVault's protocol fee by several multiples, with none of the transparency.

---

## Current Status

| Milestone | Status |
|-----------|--------|
| Smart contract design + implementation | ✅ Complete |
| Foundry test suite | ✅ Complete |
| Web app frontend (11 views) | ✅ Live — `civic-vault-aupu.vercel.app` |
| Mobile app (React Native + Expo) | ✅ Complete — pending app store submission |
| Backend API (auth, chat, notifications, AI, wallets) | ✅ Complete |
| IPFS integration (Pinata) | ✅ Complete |
| Supabase Realtime chat | ✅ Complete |
| Email notifications (Gmail OAuth) | ✅ Complete |
| RabbitMQ async queue | ✅ Complete |
| AI homepage assistant (Gemini) | ✅ Complete |
| Privy embedded wallet onboarding | ✅ Live |
| Circle Programmable Wallets (W3S API) | ✅ Integrated |
| Arc Testnet deployment | ✅ Live |
| First active DAO with real members | ✅ Live |
| The Graph subgraph | ✅ Live — `https://api.studio.thegraph.com/query/1755424/civicvault/v0.0.1` |
| X (Twitter) | ✅ `@CivicVaultDAO` |
| Independent security audit | 🔲 Requested (this grant) |
| Arc Mainnet deployment | 🔄 Pending audit |
| DApp (IPFS-hosted decentralized frontend) | 🔲 Roadmap |
| Multi-language support | 🔲 Roadmap |
| Mobile app store submission | 🔲 Roadmap |

---

## Grant Budget: $80,000

### Security — $23,000

**Smart contract audit — $20,000**
Reputable audit firms (Cyfrin, Halborn, Code4rena) charge $5,000–$8,000 per week of review. CivicVault's codebase spans six contracts and ~3,000 lines of Solidity covering DAO lifecycle management, staked voting, phased escrow, multi-sig yield governance, EIP-1167 proxy factory logic, and yield distribution math. A thorough engagement covering all attack surfaces — reentrancy, flash loan vectors, proxy storage collisions, yield accounting edge cases, and access control — requires a minimum of 2.5 to 3 weeks. $20,000 is the realistic lower bound for a firm credible enough to provide assurance to communities putting real USDC into the protocol.

**Bug bounty program — $3,000**
Three months on Immunefi post-audit, running concurrently with the mainnet soft launch. Funds the bounty pool for any critical or high-severity findings surfaced by independent researchers before significant capital concentrations build in DAO treasuries.

### Launch — $12,000

**Arc Mainnet deployment and DAO seeding — $3,000**
Factory contract deployment gas, implementation contract deployment, the first five DAO deployments seeded as pilot communities, and a contingency buffer for redeployment if post-audit changes require contract modifications.

**12 months production infrastructure — $5,000**
Vercel Pro ($20/month), Supabase Pro ($25/month), Pinata IPFS ($100/month), RabbitMQ cloud ($50/month), domain and SSL ($100/year). Total infrastructure burn is approximately $2,400/year; the remainder covers scaling costs as DAO count and member activity grow through Q4 2026.

**5 pilot DAO facilitations — $4,000**
Each pilot DAO receives two in-person facilitation sessions — one for onboarding and wallet setup, one for running the first proposal and vote — plus printed materials, transport to community venues, and ongoing support through the first complete investment cycle. At $800 per DAO this covers real facilitator time for street community groups, PTA committees, and university student unions.

### Growth — $45,000

**Mobile app deployment and maintenance — $8,000**
Apple Developer Program ($99), Google Play ($25), professional QA testing across Android and iOS devices representative of what target users in Nigeria and East Africa carry, app store submission and optimization, and 12 months of patch maintenance to keep the app current with OS updates and protocol changes.

**DApp (IPFS-hosted decentralized frontend) — $7,000**
ENS domain registration, Fleek Pro hosting, six to eight weeks of development adapting the current frontend to a fully trustless deployment with no backend dependency for core protocol functions, and testing across the decentralized deployment pipeline. This gives CivicVault a frontend that cannot be taken offline by any single provider — critical for communities in markets with infrastructure instability.

**Multi-language localization — $5,000**
Professional translation and UI adaptation for Portuguese, Hausa, Swahili, and French across all 11 views and all system messages. Four languages at approximately $1,000 per language for translation plus $250 per language for in-app testing and layout correction. Covers Nigeria, Kenya, Tanzania, Senegal, and Brazil.

**Community growth and outreach — $5,000**
Attendance at cooperative society association events in Lagos and Abuja, university outreach visits to student union bodies, social media content production for @CivicVaultDAO, and stipends for the first wave of community leads — trusted individuals inside pilot communities who champion CivicVault adoption within their existing networks.

**Developer stipend — $15,000**
12 months at $1,250/month covering continued smart contract maintenance, security patch response, subgraph updates, feature development across all three client surfaces (web app, mobile app, DApp), and integration work for Circle Paymaster and CCTP in Q1 2027.

**Mobile PWA optimization — $5,000**
Service worker implementation, offline mode for low-bandwidth environments, push notifications, install prompt, and Lighthouse performance optimization for the web app on mobile browsers.

### Total: $80,000

---

## Roadmap (Post-Grant)

**Q3 2026 — Security and Mainnet Launch**
- Complete independent security audit and remediate all findings
- Deploy to Arc Mainnet
- Submit mobile app to iOS App Store and Google Play
- Onboard 5 pilot DAOs with full facilitation support
- Activate Circle Paymaster for gasless first transactions

**Q4 2026 — Growth**
- Launch mobile PWA optimization
- Add multi-language support (Portuguese, Hausa, Swahili, French)
- Open public DAO creation with guided onboarding flow
- On-chain analytics dashboard powered by live subgraph

**Q1 2027 — Scale and Decentralization**
- Deploy IPFS-hosted DApp with ENS domain
- CCTP integration for multi-chain USDC deposits
- Cross-DAO governance layer (federations of local DAOs)
- Integration with traditional remittance entry points
- Publish open-source SDK for third-party DAO tooling built on CivicVault

---

## Why This Grant Matters

CivicVault is not a DeFi yield aggregator or a speculative token protocol. It is **infrastructure for real communities making real decisions about real money** — and it is the first protocol purpose-built for this market. There is no comparable infrastructure for rotating savings groups, neighborhood cooperatives, PTA development funds, or diaspora investment pools anywhere in Web3 today.

The existing codebase represents a substantial, completed body of work: three client surfaces (web app live, mobile app complete, DApp on roadmap), ~3,000 lines of audit-ready Solidity, a production-quality backend with email and queue infrastructure, a live subgraph, an active DAO with real members, and a deployed Circle Programmable Wallets integration. The single remaining blocker to mainnet is a professional security audit. This grant closes that gap and funds the community onboarding infrastructure needed to turn a completed protocol into a living network.

Communities deserve tools that are as secure as they are accessible. This grant makes that possible.

---

## Links & References

- **Live Web App:** https://civic-vault-aupu.vercel.app
- **Demo Video:** https://youtu.be/mkdc0uo4waQ
- **GitHub:** https://github.com/Jaydbrown/CivicVault
- **Subgraph:** https://thegraph.com/studio/subgraph/civicvault
- **X:** https://x.com/CivicVaultDAO
- **Target Chain:** Arc Testnet — https://testnet.arcscan.app
- **Factory Contract:** `0x5000F14A757d4488297772b694f18EaF0eC45C81`
- **Implementation Contract:** `0x5a9D34264Da36cd05B66Fab80e6e5D6feDC9fDBC`
- **First DAO:** `0xA80b7ca6A50C2424BA4C3bf7c0B7700f0D6DC5a6`

---

## Contact

**Email:** jaiyeolawety705@gmail.com
**Project:** CivicVault
**Chain:** Arc Network (Circle)
**X:** @CivicVaultDAO

---

*CivicVault is open-source and built in the public interest. All contract code is available for review. We welcome technical questions, audit inquiries, and partnership discussions.*
