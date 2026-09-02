# CivicVault — Investor Deck

---

## Slide 1 · Cover

# CivicVault
### Programmable USDC treasuries for member-owned communities

Give an association, cooperative, union, or club a shared on-chain treasury it governs by rule instead of by trust — embedded wallets, milestone-gated disbursement, multi-party authorization, member freeze/clawback, a tamper-proof ledger. Circle's *treasury management* use case, for the treasuries that have never had it.

- **Chain:** Arc Network (Circle) · Chain ID 5042002
- **Status:** Live on Arc Testnet · Mainnet-ready pending audit
- **Demo:** https://civic-vault-aupu.vercel.app
- **Video:** https://youtu.be/mkdc0uo4waQ

---

## Slide 2 · The Problem

### Local communities are sitting on a massive coordination problem.

I grew up watching people around me pool money together — contribution groups, investment clubs, neighborhood cooperatives. The trust was there. The discipline was there. What wasn't there was any real structure to protect it.

Someone runs off with the pot. A trusted admin skims yield before distributing. Members have no idea where the money actually went. There's no receipt, no audit, and no way to remove the person holding the money.

This isn't a niche problem. Rotating savings groups — called chamas in Kenya, susus in West Africa, tontines in Cameroon, arisan in Indonesia — are a large informal-finance market. The World Bank's 2025 Global Findex counts 1.3 billion adults still unbanked — Nigeria among the eight countries holding over half of them — and almost all of this money is coordinated on WhatsApp chats and in paper ledgers.

The tools to fix this exist. Blockchain gives us transparency, on-chain escrow, and trustless yield distribution. But every DeFi protocol out there was built for traders and yield farmers — not for a community organizer in Lagos trying to manage 40 members and $30,000 in pooled savings.

That's the gap CivicVault fills.

---

## Slide 3 · The Market

### A large informal-finance market with no on-chain treasury infrastructure.

**Who we're building for:**
- Rotating savings groups (chamas, susus, tontines, arisan)
- Neighborhood investment cooperatives
- Diaspora remittance pools
- Local infrastructure and development co-ops
- Campus investment clubs

**Where:** Africa, Southeast Asia, Latin America, and diaspora communities globally.

**The numbers:**
- EFInA 2023: ~10% of Nigerian adults (about 10–11M people) rely on informal savings as their only financial channel
- Even a fraction of a percent of this on-chain is a large TVL base
- Revenue is the disbursement fee (30 bps launch, 100 bps cap) plus an institutional tier — recurring, not contingent on communities investing

**Why this moment:**
Circle's Arc Network — where USDC is the native gas token — makes USDC-native community finance genuinely viable for the first time. Circle user-controlled wallets plus Gas Station mean members sign in with an email, never touch a seed phrase, never hold a gas balance, and keep sole control of their key — CivicVault can't move their money. And a beacon-proxy factory makes deploying a DAO as cheap as a single transaction — with one upgradeable implementation behind a timelock, so a fix reaches every DAO. All of this exists now. It didn't two years ago.

---

## Slide 4 · The Solution

### CivicVault runs a community's treasury on-chain — from deposit to disbursement to returns.

Here's how a community uses it:

**Step 1 — Create a DAO**
A founder deploys a neighborhood DAO through the CivicVaultFactory. The community name, location, governance rules, and membership cap are recorded on-chain.

**Step 2 — Onboard members**
Admins add members and verify their identity using a hash-based KYC system. No personal data ever touches the blockchain — only a cryptographic confirmation that verification happened.

**Step 3 — Propose a treasury allocation**
Admins propose an allocation — a transformer, a classroom block, working capital for a member co-op. Each has an amount, deadline, risk grade, and supporting documents on IPFS. Admins curate; members hold every lever that touches the money.

**Step 4 — Vote with real skin in the game**
Verified members vote by staking USDC. If you believe in a proposal, you put money behind it. Downvotes are free — but they don't count toward funding. No veto-without-accountability.

**Step 5 — Phased release (30 / 40 / 30)**
When a proposal hits its target, funds don't move all at once. They release in three milestone phases. The project executor has to show progress to unlock each tranche.

**Step 6 — Returns come back under multi-sig**
When an allocation returns funds, a finance manager proposes the deposit and three admins must approve before it executes. No single person moves money.

**Step 7 — Members claim their share**
Yield accrues proportionally based on each member's stake. Members claim whenever they want. The math handles partial deposits and rolling claims without double-counting.

**Members hold the final say**
The creator appoints admins — but members, voting with the USDC they've committed to the DAO, can remove a captured admin (and bar re-appointment), freeze a suspicious escrow release, or claw back an investment's unreleased funds. Adding fake members is free; giving them a vote costs real capital that sits in escrow at risk. You can't buy the outcome without owning the exposure.

Every single one of these steps leaves a timestamped, on-chain record. Immutable. No indexer required.

---

## Slide 5 · Why Arc Network?

### Because community savings can't afford volatility.

Most crypto tools expose communities to a problem that has nothing to do with their investment: ETH price swings.

A neighborhood group in Abuja pools $20,000 to fund a local business. Two months later, even if the business is doing well, their treasury is worth $14,000 because ETH dropped 30%. That's not DeFi risk — that's broken product design.

Arc Network is Circle's EVM chain where USDC is the native gas token. That means:

- Every transaction is priced in USDC
- Members never need to acquire ETH or any other token for gas
- There's no price volatility between "depositing" and "using" the protocol

For communities where capital preservation is the whole point, this is the only environment where CivicVault makes sense to build.

Add Privy's embedded wallets — login with email, Google, or passkey, automatic Ethereum wallet creation — and you've removed every technical barrier that would have stopped a first-time user from participating.

---

## Slide 6 · Product

### 12 screens. Full on-chain flows. Web, mobile, and USSD.

**Web App (React 19 · TypeScript · Vite 6 · Tailwind 4)**

| Screen | Purpose |
|---|---|
| Landing | Hero, features, governance explainer, FAQ |
| Dashboard | TVL, active DAOs, open proposals, yield alerts |
| Create DAO | On-chain deployment with logo upload (IPFS) |
| Discover | Browse and search all active DAOs |
| Investments | Create and manage proposals with IPFS document attachments |
| Voting | Stake USDC upvotes · downvotes · live vote progress bar |
| Yields | Claimable balances · one-tap claim · full deposit history |
| Messages | Per-DAO real-time chat (Supabase Realtime) |
| KYC | Admin-guided member verification (4-step flow) |
| Wallet | USDC balance, allowances, transaction history |
| Profile | IPFS avatar, display name, Gmail notification preferences |

**Mobile App (React Native · Expo SDK 51)**
Everything above on your phone — wallet connection, governance, DAO chat, yield claims, push notifications.

---

## Slide 7 · Architecture

```
┌──────────────────────────────────────────────────────┐
│               React SPA (Vite + Privy)               │
│  Wallet login · Viem · IPFS via Pinata · Chat UI     │
└──────────────┬───────────────────────┬───────────────┘
               │ RPC                   │ HTTP
               ▼                       ▼
┌─────────────────────────┐  ┌──────────────────────────────┐
│   Arc Network (EVM)     │  │  Node.js / Express API       │
│   USDC native gas       │  │  Prisma · SQLite             │
│                         │  │  Gmail OAuth · Nodemailer    │
│   CivicVaultFactory     │  │  RabbitMQ workers            │
│   CivicVault (DAO)      │  │                              │
│   CivicVaultView        │  └──────────────────────────────┘
│   YieldCalculator       │                 │
│   InvestmentManager     │                 ▼
└─────────────────────────┘     ┌──────────────────────┐
                                │ Supabase Realtime    │
                                │ DAO chat messages    │
                                └──────────────────────┘
```

**Smart Contracts (Solidity 0.8.20 · Foundry · OpenZeppelin)**

| Contract | Role |
|---|---|
| `CivicVaultFactory` | Beacon-proxy factory + beacon + protocol-fee config |
| `CivicVaultBeaconController` | Owns the beacon; timelock + DAO veto on every upgrade |
| `CivicVault` | Per-DAO: members, KYC, investments, voting, escrow, yield, claims |
| `CivicVaultView` | Gas-free read helpers for the frontend |
| `CivicVaultGovernor` | Member-initiated, stake-weighted governance (remove admin / freeze / clawback) |
| `YieldCalculator` | Proportional yield math, overflow-safe |
| `InvestmentManager` | Phased release, activation logic, deadline rules |
| `StringUtils` | On-chain activity log formatting |

**Security:**
ReentrancyGuard · CEI ordering · Pausable emergency stop that halts new activity but cannot block exits, claims, or member governance · SafeERC20 · Initializable · 40+ typed custom errors · 3-of-N multi-sig for returns · stake-weighted governance with snapshotted pass rules · disbursement fee capped at 100 bps + returns fee capped at 500 bps, both from the tranche/return only · never sweeps unclaimed member funds · beacon upgrades behind a 4-day timelock + TVL-weighted DAO veto

**Wallets:** Circle user-controlled (non-custodial) + Gas Station (gasless) for the smartphone tier; every backend-initiated transaction is checked against a fixed policy and audit-logged.

---

## Slide 8 · What Makes This Different

**Staked voting — not signaling.**
When you vote yes, you put USDC in escrow. You don't get to support a proposal without putting something at risk.

**Phased release — not a lump sum.**
30% up front. 40% at milestone two. 30% at completion. Project executors earn each tranche.

**Multi-sig yield — not admin discretion.**
Three admins must approve before a single dollar of yield moves. The proposer needs the actual balance at execution time, not at proposal time.

**Members can overrule the creator — not just the admins.**
Stake-weighted member votes remove a captured admin, freeze a release, or claw back an investment. The pass rule is snapshotted when the proposal opens so it can't be gamed after the fact.

**Non-custodial by design.**
Members' wallets are Circle user-controlled smart accounts — the key is theirs (passkey/PIN + Circle MPC). The backend orchestrates transactions but holds no signing power, and every call it makes is checked against a fixed policy.

**KYC without a data leak.**
Identity verification is a `bytes32` hash on-chain. No name, no ID number, no biometric ever touches a contract.

**Full activity timeline — no indexer needed.**
Every vote, phase release, yield deposit, and claim is stored in an on-chain `Activity[]` array. Any member can audit the full history directly from the contract.

---

## Slide 9 · Current Status

| Milestone | Status |
|---|---|
| Smart contracts (~3,700 lines, 5 contracts + 3 libraries, incl. member governance + beacon upgrades) | ✅ Done |
| Foundry test suite (93 tests, 6 suites) | ✅ Done |
| Frontend — all views + governance + non-custodial Circle wallet | ✅ Done |
| Backend — auth, chat, notifications | ✅ Done |
| IPFS integration | ✅ Done |
| Real-time chat | ✅ Done |
| Email notifications (Gmail OAuth) | ✅ Done |
| RabbitMQ async queue | ✅ Done |
| Arc Testnet deployment | ✅ Live |
| Public demo | ✅ Live |
| React Native mobile app | ✅ Built |
| Security audit | 🔲 Grant-funded |
| Arc Mainnet | 🔲 Post-audit |

**Live on Arc Testnet** (block 60010770, with member governance + protocol fee):
Factory — `0x58Ff8ca3b9863e535845f58D5d7AA90B33fE635F` · Governor — `0x1cE8328E08a4c93A37e5e03115BAdE0373b97310`

---

## Slide 10 · Business Model

**Monetize the treasury, not the treasury's investment results.**

| Line | What | Why it holds |
|---|---|---|
| **Disbursement fee (primary)** | 25–50 bps, hard-capped, skimmed when escrow releases to a project/vendor | Every active treasury generates it; scales with usage, not investment outcomes; funds the Gas Station pool |
| **Institutional tier (recurring)** | Flat annual subscription — branding, compliance exports, named signers, higher limits | Predictable recurring revenue from entities with an admin budget line |
| **Deployment fee** | Small one-time fee on treasury creation (waived for pilots) | — |
| **Realized-returns fee (secondary)** | 3% of realized returns only, capped at 5%, on-chain | Upside for treasuries that invest — not the plan |

| Metric | 6 Months | 12 Months |
|---|---|---|
| Treasuries on mainnet | 5 | 15 |
| Verified members | 100 | 400 |
| USDC committed | $2,000 | $8,000 |
| Funds disbursed | $1,200 | $6,000 |

Growth is deliberately conservative — this is a trust-based, facilitation-heavy product, not a viral one. Nothing in this model depends on communities succeeding at investing.

---

## Slide 11 · Roadmap

**Phase 1 (Q3 2026) — Security & Launch**
Five-layer security program (audit → remediation → competitive contest → bug bounty → monitoring) → Arc Mainnet → 3 pilot DAOs onboarded with full facilitation support.
Target: 5 DAOs · 100 members · $2K USDC staked.

**Phase 2 (Q4 2026) — Nigeria Reach**
Social + field community team · React Native app to the stores · USSD tier live via a licensed on/off-ramp partner · Hausa / Yoruba / Igbo / Pidgin localization · public DAO creation · analytics dashboard.
Target: 15 DAOs · 400 members · $8K staked.

**Phase 3 (Q1 2027) — Scale, Federation & Multi-Country Expansion**
Cross-DAO federation layer · expansion beyond Nigeria (Ghana, Kenya, outward) in parallel with Nigerian growth · remittance entry-point integrations · CCTP for cross-chain USDC deposits · open-source SDK.
Target: 30 DAOs · 800 members · $20K staked.

---

## Slide 12 · The Ask

**$42,000 grant — built around the two things a community product lives or dies on: is the money safe, and do communities adopt it.**

| Pillar | Item | Amount |
|---|---|---|
| **Security of funds — $17,000** | Independent audit | $12,000 |
| | Competitive contest (post-remediation) | $3,000 |
| | Bug bounty (Immunefi listing + reserve) | $1,000 |
| | Real-time monitoring — 12 months | $700 |
| | Signer hardening (hardware wallets, Safe) | $300 |
| **Marketing & community adoption — $16,000** | Social media & community manager (6 mo, part-time) | $6,000 |
| | Field community organizers (Lagos + 2 regions) | $5,000 |
| | Localized content (EN / Pidgin / Hausa / Yoruba / Igbo) | $3,000 |
| | Community radio & noticeboard placements | $2,000 |
| **Operations & launch — $9,000** | Arc Mainnet deployment + contingency | $2,000 |
| | Post-audit remediation | $2,500 |
| | Infrastructure — 12 months | $2,500 |
| | Structured pilot-DAO onboarding | $2,000 |
| | **Total** | **$42,000** |

CivicVault is the first protocol purpose-built for hyperlocal community investment on-chain — there is no comparable infrastructure for rotating savings groups, neighborhood cooperatives, or diaspora investment pools anywhere in Web3 today.

This is a community product, not a typical blockchain product. Every DAO holds a pooled USDC treasury — that pool is the entire point and the entire risk. So roughly $17,000 goes to defending it in five independent layers (audit, competitive contest, bug bounty, monitoring, signer hardening), and roughly $16,000 to the on-the-ground marketing and community work that a solo technical founder cannot do alone — the channel where a community product is actually won. The remaining $9,000 covers mainnet deployment, post-audit remediation, infrastructure, and hands-on onboarding of the first three DAOs.

This is not a speculative roadmap. The protocol is built, tested (93 Foundry tests), and deployed on Arc Testnet, with a live web app, a complete mobile app, a built USSD tier, and a public subgraph. The grant funds the two things still left to prove: that the pool is safe, and that communities will adopt it.

---

## Slide 13 · Team

**Jaiyeola Akinjide — Founder & Lead Developer**

I built CivicVault from scratch — every contract, every screen, every API route. I've been thinking about this problem for a long time, and I wanted to prove it was possible to ship a complete, production-quality protocol as a solo builder.

What that looks like in practice:
- ~3,000 lines of Solidity across contracts, libraries, interfaces, and deploy scripts
- 11 fully connected frontend views in React 19
- A full Node.js backend with Gmail OAuth, RabbitMQ, and Supabase Realtime
- A React Native mobile app
- IPFS media storage, push notifications, email alerts
- Live deployment on Arc Testnet

Stack: Solidity · Foundry · OpenZeppelin · React · TypeScript · Node.js · Viem · Privy · Supabase · Pinata · Expo

The solo build was intentional — I wanted to understand every layer before scaling. Grant funding brings in the auditor, the facilitators, and the first communities.

---

## Slide 14 · Why This Matters

The rotating savings group organizer in Abuja managing $50,000 across 40 members through WhatsApp deserves the same financial transparency as any institutional fund manager.

CivicVault gives it to them — on their phone, in their language, without a seed phrase, without volatility risk, without trusting any single administrator.

Communities deserve tools that are as secure as they are accessible. That's what this is.

---

## Slide 15 · Links

| | |
|---|---|
| Live Demo | https://civic-vault-aupu.vercel.app/ |
| Demo Video | https://youtu.be/mkdc0uo4waQ |
| GitHub | https://github.com/Jaydbrown/CivicVault |
| Arc Testnet Explorer | https://testnet.arcscan.app |
| Factory Contract | `0x58Ff8ca3b9863e535845f58D5d7AA90B33fE635F` |
| Governor Contract | `0x1cE8328E08a4c93A37e5e03115BAdE0373b97310` |
| Email | jaiyeolawety705@gmail.com |
