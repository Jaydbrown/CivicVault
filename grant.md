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

## Founder

The transformer story above isn't a hypothetical — it's mine. I grew up watching my own street go through it: the transformer fails, someone goes door to door, everyone hands over what they can afford, and then the person holding the money disappears into it. No receipt. No report. No vote. Nothing anyone could point to and say "here's where it went." The street stayed dark, whoever collected the money moved on with it, and there was nothing anyone could do — because there was never a record that couldn't be quietly rewritten, or just as quietly forgotten. I watched that same pattern repeat, different street, different collection, same ending, enough times to stop believing it was bad luck.

And it's never just the transformer. The same pattern shows up everywhere I've looked — the school levy every parent pays every term with no report on what it actually funded. The class donation for a project that quietly stalls halfway with no explanation to anyone who paid. The fundraiser for a borehole, a road, a clinic wing that disappears from conversation the moment the money's been collected. Different cause, different collector, same ending: you hand over money, you lose all visibility and all claim to it, and you're expected to just trust it was used right. That's not generosity being honored. It's generosity being exploited, over and over, because nothing ever forced accountability back to the people who paid — everywhere in society, at every scale, from a street to a school to a whole community project.

It's a structural failure: the only thing standing between "invested in something real" and "gone" is one person's word, every single time people pool money by hand — and it doesn't stop at the money simply vanishing. Even when it doesn't, a donation is still a dead end. You give, the project succeeds or it doesn't, and either way your money is gone and you have nothing more to show for it than a memory of having given.

I built CivicVault so a contribution never has to be blind trust or a dead end again. When you back a proposal on CivicVault, you're not handing cash to a treasurer and hoping — you're staking USDC as an on-chain upvote, escrowed by the contract itself and released to the project only in phases, with every step recorded where no one can quietly rewrite or forget it. And when that investment produces a return, you don't just watch from the sidelines: `claimYield` computes your exact share of the yield proportional to what you staked and the contract pays it to you directly. You're not just donating anymore. You're staking — and when the community's investment pays off, so do you. No admin, no treasurer, no self-appointed "chairman" can quietly make any of it disappear, and no community has to just accept the dark.

Here's what that actually looks like, run through the same street from the story above. The transformer is dead again — except this time the money doesn't go into one person's account. An admin lists "New Transformer" on-chain with a funding target and a deadline. Every neighbor who wants in stakes their USDC directly into the contract — not into someone's pocket, into escrow the contract itself holds. Once the target is hit, the admins — the same trusted people the street would have picked anyway, just now accountable to a public ledger instead of a group chat — release the first 30% for materials. Nobody can touch phase two before phase one: `releasePhaseCompleted` is a counter the contract enforces, and no admin can skip ahead or release out of order. If a vendor takes the materials money and vanishes, the street has lost 30%, not everything — and every neighbor holding a stake can see exactly who released what, when, and to whom, forever. That's the whole point of the phases: not a promise that nothing can go wrong, but a guarantee that nothing can go wrong all at once, invisibly, the way it always used to.

And a transformer doesn't have to be the end of the story. Say the street backs a small business instead with what's left of the pooled capital — a provision store, a grinding machine, whatever the community decides is worth funding. If that business turns a profit, the finance manager overseeing it doesn't just hand cash back to whoever collected the funds originally. They propose a yield deposit on-chain, receipts attached. Three of the DAO's admins have to approve it before a dollar moves. And only once it's approved — and only once the finance manager actually has the money sitting in their own wallet, not a promise of it — does the contract pull it in and split it, automatically and exactly, among everyone who staked, in proportion to what they staked. Nobody negotiates their cut. Nobody quietly forgets the smallest contributor. The contract doesn't know favoritism. That's the real difference between a donation and a stake: a donation ends the moment you give it away. A stake keeps your name attached to the outcome — for better, verifiably, forever.

I'm a self-taught developer based in Lagos — trained across multiple bootcamps, with several years building in production, mostly solo. CivicVault isn't my first shipped project: I built **ARESprotocol**, **BID-IT** (a marketplace built for and by students), and **Socrates** (a real-time vulnerability-scanning browser extension). Solo doesn't mean unproven — it means I've already shown I can take an idea from nothing to something people actually use, and CivicVault is that same track record pointed at the problem I care about most.

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
- Factory: `0x5a9D34264Da36cd05B66Fab80e6e5D6feDC9fDBC`
- Implementation: `0x088Caea4f6f3aA51392fd7DaFb9C5eb63E1E1431`
- View: `0x5000F14A757d4488297772b694f18EaF0eC45C81`
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
| Landing Page | Hero, features, governance visualization, FAQ |
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
| `/api/auth` | Magic link / OAuth session management via Privy |
| `/api/chat` | Chat subscriptions; webhook fan-out for new message alerts |
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
| **CCTP** | Q4 2026 | Multi-chain USDC deposits from Base, Ethereum, and Solana directly into DAO treasuries |

---

## Key Technical Differentiators

### 1. EIP-1167 Clone Factory
Each DAO is a gas-efficient minimal proxy. Communities never pay to redeploy 900+ lines of contract logic.

### 2. Staked Voting (Proof of Conviction)
Upvotes transfer real USDC into escrow. Members who believe in a proposal put capital behind it. Downvotes are free but carry no weight — preventing veto-without-accountability dynamics.

### 3. Phased Escrow Release
Funds release to a project in three tranches (30% / 40% / 30%) instead of all at once, enforced in sequence by `releasePhaseCompleted` — an admin cannot release phase 2 before phase 1. This bounds the maximum possible loss to a single tranche instead of the full investment; it's a blast-radius limit, not on-chain milestone verification — admins still decide when a phase has earned its release, same as the trusted signers a community would rely on off-chain, just now accountable to a public, unforgeable ledger of every release.

### 4. Multi-Sig Yield Governance
Yield deposits require 3-of-N admin approval. The proposer must have USDC balance and allowance at execution time — not at proposal time — preventing ghost proposals. Approvals are snapshotted at cast-time, the same pattern used by Gnosis Safe: a signature already cast isn't retroactively invalidated if that admin is later removed. Removing an admin is a forward-looking control — it stops them casting future approvals — not a rollback of votes already counted toward a proposal's threshold.

Role *assignment* itself is deliberately not multi-sig, and it's worth being explicit about that trust boundary: only the DAO creator can call `addAdmin` or `addFinanceManager` — one signer, no vote, no eligibility check beyond a non-zero address. That's a single point of trust over who holds the keys, but not over what the keys can do. A finance manager can propose a yield deposit alone, but cannot move a single dollar without 3 separate admins approving it, and only then if the funds are actually sitting in their wallet at execution time. A compromised or coerced creator could install a malicious admin or finance manager — but even that person still can't drain the treasury solo; every disbursement still passes through the 3-of-N gate above.

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
| Foundry test suite | ✅ 61 tests — full DAO lifecycle and access control, plus fuzzed yield/escrow invariants, a malicious-token reentrancy test, proxy re-initialization, and multi-sig edge cases |
| Web app frontend (11 views) | ✅ Live — `civic-vault-aupu.vercel.app` |
| Mobile app (React Native + Expo) | ✅ Complete — pending app store submission |
| Backend API (auth, chat, notifications, wallets) | ✅ Complete |
| IPFS integration (Pinata) | ✅ Complete |
| Supabase Realtime chat | ✅ Complete |
| Email notifications (Gmail OAuth) | ✅ Complete |
| Real-time DAO chat (Supabase) | ✅ Complete |
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

## Grant Budget: $42,000

### Security — $15,000

**Smart contract audit — $15,000**
Reputable audit firms — Cyfrin, Halborn, Code4rena — charge between $5,000 and $8,000 per week of review. CivicVault's codebase spans six contracts and approximately 3,000 lines of Solidity covering DAO lifecycle management, staked voting, phased escrow, multi-sig yield governance, EIP-1167 proxy factory logic, and yield distribution math. Pre-audit hardening is already in place: 61 Foundry tests, including fuzzed invariants (claimed yield never exceeds deposited yield, phased escrow release never exceeds the funded amount), a malicious-ERC20 reentrancy test against `claimYield`, proxy re-initialization checks, and multi-sig edge cases (duplicate approvals, approved-but-unfunded "ghost" proposals). Line coverage can't be reported as a percentage — `forge coverage` fails with a stack-too-deep compiler error on this codebase even under `--ir-minimum`, a known Foundry limitation on larger contracts, not a gap we're hiding behind test count alone. A thorough engagement covering all attack surfaces — reentrancy, flash loan vectors, proxy storage collisions, yield accounting edge cases, and access control — requires a minimum of two weeks with a firm credible enough to provide assurance to communities putting real USDC into the protocol. The audit is the single remaining blocker between the hardened codebase and a mainnet deployment communities can trust.

### Launch — $9,600

**Arc Mainnet deployment and initial DAO seeding — $2,000**
Covers factory contract deployment gas, implementation contract deployment, the first three DAO deployments seeded as pilot communities, and a contingency buffer for redeployment if post-audit changes require contract modifications.

**12 months production infrastructure — $3,600**
Vercel Pro ($20/month), Supabase Pro ($25/month) for Realtime chat and database, Pinata IPFS ($100/month) for DAO logos, member avatars, proposal documents, and chat attachments, RabbitMQ cloud hosting ($50/month) for async email delivery queuing, and domain registration with SSL ($100/year). Total infrastructure burn is approximately $2,400 per year; the remainder covers scaling costs as DAO count and member activity grow through Q4 2026.

**Facilitation of 3 pilot DAOs — $4,000**
Each pilot DAO receives two in-person facilitation sessions — one for onboarding and wallet setup, one for running the first proposal and vote — plus printed materials, transport to community venues, and ongoing support through the first complete investment cycle. At approximately $1,300 per DAO this covers real facilitator time for street community groups, PTA committees, and university student unions where the organizer cannot be expected to self-onboard without guidance. These three pilot DAOs are not placeholders — they are the first working case studies that every subsequent community onboarding references.

### Growth — $17,400

CivicVault is building across two live client surfaces with a third on the roadmap.

The web app is already live — a full React 19 frontend with 11 views covering every protocol action from DAO creation to yield claiming. This is the primary interface for desktop users and requires ongoing maintenance, performance optimization, and feature additions as the protocol grows. Maintenance is folded into the developer stipend below.

The mobile app is already built as a React Native application using Expo. Grant funding of $3,000 covers the Apple Developer Program enrollment ($99), Google Play registration ($25), professional QA testing across Android and iOS devices representative of what target users in Nigeria and East Africa actually carry, app store submission and optimization, and patch maintenance to keep the app current with OS updates. This is the most critical surface for the African market where mobile is the primary computing device and many users will never open a laptop.

**Multi-language localization — $2,400**
Professional translation and UI adaptation for Portuguese, Hausa, and Swahili across all 11 views and all system messages. These three languages cover Nigeria, Kenya, and Brazil — the three highest-priority markets for the rotating savings group and cooperative finance use case. Each language receives approximately $700 for translation and $100 for in-app layout testing and correction.

**Developer stipend — $12,000**
Released in $2,000 increments tied to milestone deliverables rather than paid as a flat six-month salary: mainnet audit remediation, pilot DAO onboarding support, mobile app store submission, localization rollout, and integration groundwork for Circle Paymaster and CCTP. Each increment covers the smart contract maintenance, security patch response, subgraph updates, and feature development across both client surfaces required to hit that deliverable. As a solo build, this keeps the protocol actively maintained and accountable to shipped work rather than elapsed time.

### Total: $42,000

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
- CCTP integration for multi-chain USDC deposits — diaspora club deposits from the UK/US are one of the strongest usage stories, pulled forward from Q1 2027

**Q1 2027 — Scale and Decentralization**
- Deploy IPFS-hosted DApp with ENS domain
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
- **Factory Contract:** `0x5a9D34264Da36cd05B66Fab80e6e5D6feDC9fDBC`
- **Implementation Contract:** `0x088Caea4f6f3aA51392fd7DaFb9C5eb63E1E1431`
- **View Contract:** `0x5000F14A757d4488297772b694f18EaF0eC45C81`
- **First DAO:** `0xA80b7ca6A50C2424BA4C3bf7c0B7700f0D6DC5a6`

---

## Contact

**Email:** jaiyeolawety705@gmail.com
**Project:** CivicVault
**Chain:** Arc Network (Circle)
**X:** @CivicVaultDAO

---
