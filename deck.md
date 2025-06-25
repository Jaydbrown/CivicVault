# CivicVault — Investor Deck

---

## Slide 1 · Cover

# CivicVault
### Community Capital, On-Chain

Neighborhood DAOs that pool USDC, vote on local investments, and share yield — on-chain, transparent, no middlemen.

- **Chain:** Arc Network (Circle) · Chain ID 5042002
- **Status:** Live on Arc Testnet · Mainnet-ready pending audit
- **Demo:** https://final-project-sol-lx9v.vercel.app
- **Video:** https://youtu.be/mkdc0uo4waQ

---

## Slide 2 · The Problem

### Local communities are sitting on a massive coordination problem.

I grew up watching people around me pool money together — contribution groups, investment clubs, neighborhood cooperatives. The trust was there. The discipline was there. What wasn't there was any real structure to protect it.

Someone runs off with the pot. A trusted admin skims yield before distributing. Members have no idea where the money actually went. There's no receipt, no audit, no recourse.

This isn't a niche problem. Rotating savings groups — called chamas in Kenya, susus in West Africa, tontines in Cameroon, arisan in Indonesia — move well over **$100 billion every year globally**. And almost all of it runs on WhatsApp chats and spreadsheets.

The tools to fix this exist. Blockchain gives us transparency, on-chain escrow, and trustless yield distribution. But every DeFi protocol out there was built for traders and yield farmers — not for a community organizer in Lagos trying to manage 40 members and $30,000 in pooled savings.

That's the gap CivicVault fills.

---

## Slide 3 · The Market

### A $100B+ annual market with no on-chain infrastructure.

**Who we're building for:**
- Rotating savings groups (chamas, susus, tontines, arisan)
- Neighborhood investment cooperatives
- Diaspora remittance pools
- Local infrastructure and development co-ops
- Campus investment clubs

**Where:** Africa, Southeast Asia, Latin America, and diaspora communities globally.

**The numbers:**
- Sub-Saharan Africa alone has 40M+ chama members
- 0.1% on-chain penetration = $100M+ TVL
- At a 0.75% protocol yield fee, that's meaningful revenue from a small slice of the market

**Why this moment:**
Circle's Arc Network — where USDC is the native gas token — makes USDC-native community finance genuinely viable for the first time. Privy embedded wallets mean members never need to touch a seed phrase. And EIP-1167 clone factories make deploying a DAO as cheap as a single transaction. All three of these things exist now. They didn't two years ago.

---

## Slide 4 · The Solution

### CivicVault lets communities run their savings groups on-chain — from start to yield.

Here's how a community uses it:

**Step 1 — Create a DAO**
A founder deploys a neighborhood DAO through the CivicVaultFactory. The community name, location, governance rules, and membership cap are recorded on-chain.

**Step 2 — Onboard members**
Admins add members and verify their identity using a hash-based KYC system. No personal data ever touches the blockchain — only a cryptographic confirmation that verification happened.

**Step 3 — Propose an investment**
Admins create investment proposals — a local market stall, an agricultural co-op, a small business loan. Each proposal has a funding target, deadline, grade, and supporting documents stored on IPFS.

**Step 4 — Vote with real skin in the game**
Verified members vote by staking USDC. If you believe in a proposal, you put money behind it. Downvotes are free — but they don't count toward funding. No veto-without-accountability.

**Step 5 — Phased release (30 / 40 / 30)**
When a proposal hits its target, funds don't move all at once. They release in three milestone phases. The project executor has to show progress to unlock each tranche.

**Step 6 — Yield governance by multi-sig**
When investments return profit, a finance manager proposes a yield deposit. Three admins have to approve it before it executes. No single person can push money out unilaterally.

**Step 7 — Members claim their share**
Yield accrues proportionally based on each member's stake. Members claim whenever they want. The math handles partial deposits and rolling claims without double-counting.

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

### 11 screens. Full on-chain flows. Web and mobile.

**Web App (React 19 · TypeScript · Vite 6 · Tailwind 4)**

| Screen | Purpose |
|---|---|
| Landing | Hero, features, governance explainer, FAQ, AI assistant |
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
│   CivicVault (DAO)      │  │  Gemini AI assistant         │
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
| `CivicVaultFactory` | EIP-1167 minimal-proxy factory |
| `CivicVault` | Per-DAO: members, KYC, investments, voting, escrow, yield, claims |
| `CivicVaultView` | Gas-free read helpers for the frontend |
| `YieldCalculator` | Proportional yield math, overflow-safe |
| `InvestmentManager` | Phased release, activation logic, deadline rules |
| `StringUtils` | On-chain activity log formatting |

**Security:**
ReentrancyGuard · CEI ordering · Pausable emergency stop · SafeERC20 · Initializable · 35+ typed custom errors · 3-of-N multi-sig for yield

---

## Slide 8 · What Makes This Different

**Staked voting — not signaling.**
When you vote yes, you put USDC in escrow. You don't get to support a proposal without putting something at risk.

**Phased release — not a lump sum.**
30% up front. 40% at milestone two. 30% at completion. Project executors earn each tranche.

**Multi-sig yield — not admin discretion.**
Three admins must approve before a single dollar of yield moves. The proposer needs the actual balance at execution time, not at proposal time.

**KYC without a data leak.**
Identity verification is a `bytes32` hash on-chain. No name, no ID number, no biometric ever touches a contract.

**Full activity timeline — no indexer needed.**
Every vote, phase release, yield deposit, and claim is stored in an on-chain `Activity[]` array. Any member can audit the full history directly from the contract.

---

## Slide 9 · Current Status

| Milestone | Status |
|---|---|
| Smart contracts (~3,000 lines of Solidity) | ✅ Done |
| Foundry test suite | ✅ Done |
| Frontend — all 11 views | ✅ Done |
| Backend — auth, chat, notifications, AI | ✅ Done |
| IPFS integration | ✅ Done |
| Real-time chat | ✅ Done |
| Email notifications (Gmail OAuth) | ✅ Done |
| RabbitMQ async queue | ✅ Done |
| Arc Testnet deployment | ✅ Live |
| Public demo | ✅ Live |
| React Native mobile app | ✅ Built |
| Security audit | 🔲 Grant-funded |
| Arc Mainnet | 🔲 Post-audit |

**Live contract on Arc Testnet:**
Factory — `0x12B50bc584d839E7FFE6aEefF2DC02CDeE93617C`

---

## Slide 10 · Business Model

**Protocol fee: 0.5–1% of yield distributed.**

Communities pay nothing to create a DAO, onboard members, or vote. CivicVault earns only when members earn.

| Metric | 6 Months | 12 Months |
|---|---|---|
| DAOs on mainnet | 10 | 50 |
| Verified members | 200 | 1,500 |
| USDC staked in voting | $5,000 | $50,000 |
| Yield distributed | $500 | $10,000 |

At scale — 150 DAOs averaging $1M TVL — yield fees alone reach $7,500/month. Enterprise tiers and SDK licensing add additional revenue streams.

---

## Slide 11 · Roadmap

**Q3 2026 — Launch**
Security audit → Arc Mainnet → 3 pilot DAOs onboarded with full facilitation support.
Target: 10 DAOs · 200 members · $5K USDC staked.

**Q4 2026 — Grow**
Mobile PWA · Portuguese, Hausa, Swahili localization · public DAO creation · analytics dashboard.
Target: 50 DAOs · 1,500 members · $50K staked.

**Q1 2027 — Scale**
Cross-DAO federation layer · remittance entry-point integrations · CCTP for cross-chain USDC deposits · open-source SDK.
Target: 150+ DAOs · $200K+ TVL.

---

## Slide 12 · The Ask

**$42,000 grant**

| Item | Amount |
|---|---|
| Smart contract security audit | $15,000 |
| Arc Mainnet deployment & gas | $2,000 |
| Infrastructure — 12 months | $3,600 |
| 3 pilot DAO community onboarding | $4,000 |
| Mobile PWA | $3,000 |
| Localization — PT / Hausa / Swahili | $2,400 |
| Developer stipend — 6 months | $12,000 |
| **Total** | **$42,000** |

CivicVault is the first protocol purpose-built for hyperlocal community investment on-chain — there is no comparable infrastructure for rotating savings groups, neighborhood cooperatives, or diaspora investment pools anywhere in Web3 today. Every dollar of this grant accelerates that first-mover position into a market that has been entirely unserved by decentralized finance.

The grant directly funds the single remaining blocker to mainnet: an independent security audit ($15,000). Once cleared, CivicVault becomes the first live, audited DAO protocol where ordinary community members — not crypto natives — can pool USDC, govern real investments, and claim yield on Arc Network, expanding the practical utility of the blockchain far beyond trading and speculation into everyday economic coordination.

The remainder covers what's needed to make that launch real: Arc Mainnet deployment gas costs ($2,000), 12 months of infrastructure — Vercel, Supabase, Pinata, domain ($3,600), facilitation of 3 pilot DAOs with real communities ($4,000), mobile PWA development for low-bandwidth markets ($3,000), multi-language localization in Portuguese, Hausa, and Swahili ($2,400), and 6 months of developer stipend for continued maintenance and feature work ($12,000). Total: $42,000.

This is not a speculative roadmap. The protocol is built, tested, and deployed on Arc Testnet. The grant closes the final gap between a completed codebase and a live, audited product that brings an entirely new category of user — community organizers, cooperative members, savings group leaders — onto the Arc Network for the first time.

---

## Slide 13 · Team

**Jaiyeola Akinjide — Founder & Lead Developer**

I built CivicVault from scratch — every contract, every screen, every API route. I've been thinking about this problem for a long time, and I wanted to prove it was possible to ship a complete, production-quality protocol as a solo builder.

What that looks like in practice:
- ~3,000 lines of Solidity across contracts, libraries, interfaces, and deploy scripts
- 11 fully connected frontend views in React 19
- A full Node.js backend with Gmail OAuth, RabbitMQ, Gemini AI, and Supabase Realtime
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
| Live Demo | https://final-project-sol-lx9v.vercel.app |
| Demo Video | https://youtu.be/mkdc0uo4waQ |
| GitHub | https://github.com/Jaydbrown/CivicVault |
| Arc Testnet Explorer | https://testnet.arcscan.app |
| Factory Contract | `0x12B50bc584d839E7FFE6aEefF2DC02CDeE93617C` |
| Email | jaiyeolawety705@gmail.com |
