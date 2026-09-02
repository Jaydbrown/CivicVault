# CivicVault

> Community-governed investment DAOs on Arc Testnet — stake USDC, vote on local infrastructure proposals, and earn proportional yield when investments succeed.

[![Arc Testnet](https://img.shields.io/badge/Chain-Arc%20Testnet%205042002-blue)](https://testnet.arcscan.app)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-brightgreen)](https://soliditylang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Smart Contracts](#smart-contracts)
7. [Environment Variables](#environment-variables)
8. [Local Development](#local-development)
9. [Backend API](#backend-api)
10. [DAO Chat (Messages)](#dao-chat-messages)
11. [Analytics (The Graph)](#analytics-the-graph)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## Overview

CivicVault lets communities pool USDC into a DAO treasury, propose and vote on local investments — roads, schools, utilities — and distribute yield back to members when projects complete.

**Why Arc Testnet?** Arc is Circle's L1 blockchain where USDC is the native gas token. Every fee and transfer is denominated in the same stable asset, eliminating the UX friction of needing a separate gas token alongside the investment currency.

**On-chain flow:**

1. A founder creates a DAO via `CivicVaultFactory` — a new beacon-proxy vault is deployed in one transaction
2. Admins onboard and KYC-verify members (proof hash stored on-chain, no personal data)
3. Admins post an investment proposal — USDC funding target, deadline, risk grade, IPFS documents — as the curation layer; members hold every lever that touches money
4. Verified members vote by staking USDC; governance weight is the stake a member has committed behind upvotes
5. When a proposal reaches its threshold it becomes ACTIVE — funds move to a phased escrow
6. Admins release funds in three phases (30 / 40 / 30%) as milestones are confirmed; members who see nothing built can vote to **freeze** the release or **claw back** the unreleased tranches (`CivicVaultGovernor`)
7. When the investment yields returns, those are deposited back and distributed to voters proportionally

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Browser (Vite + React SPA)                      │
│                                                                       │
│   ┌───────────┐  ┌───────────┐  ┌────────────────┐  ┌───────────┐  │
│   │   Privy   │  │Wagmi/Viem │  │Supabase Realtime│  │  Pinata  │  │
│   │Auth+Wallet│  │  on-chain │  │   (DAO chat)    │  │  (IPFS)  │  │
│   └─────┬─────┘  └─────┬─────┘  └───────┬─────────┘  └─────┬───┘  │
└─────────┼──────────────┼────────────────┼───────────────────┼──────┘
          │              │                │                   │
          ▼              ▼                ▼                   ▼
  ┌──────────────┐  ┌──────────────────────────┐   ┌───────────────┐
  │  Privy Auth  │  │      Arc Testnet           │   │ Express API   │
  │  Dashboard   │  │      Chain ID 5042002      │   │(Node+Prisma)  │
  └──────────────┘  │                            │   │               │
                    │  ┌──────────────────────┐  │   │ ┌───────────┐ │
                    │  │  CivicVaultFactory   │  │   │ │  Gmail    │ │
                    │  │  (beacon proxies)     │  │   │ │  OAuth    │ │
                    │  └──────────┬───────────┘  │   │ └───────────┘ │
                    │             │              │   │ ┌───────────┐ │
                    │  ┌──────────▼───────────┐  │   │ │  Circle   │ │
                    │  │    CivicVault (DAO)  │  │   │ │ Wallets + │ │
                    │  │  ┌────────────────┐  │  │   │ │ Gas Stn.  │ │
                    │  │  │ CivicVaultView │  │  │   │ │ + txPolicy│ │
                    │  │  │CivicVaultGov'r │  │  │   │ └───────────┘ │
                    │  │  └────────────────┘  │  │   │ ┌───────────┐ │
                    │  └──────────────────────┘  │   │ │ RabbitMQ  │ │
                    └──────────────────────────────   │ └───────────┘ │
                                   │               │ ┌───────────┐ │
                                   │               │ │  Gemini   │ │
                                   ▼               │ │    AI     │ │
                         ┌──────────────────┐      │ └───────────┘ │
                         │   The Graph      │      └───────────────┘
                         │  (Subgraph on    │
                         │  arc-testnet)    │
                         └──────────────────┘
```

---

## Features

### On-chain (Contracts + Frontend)

- **Create DAO** — deploy an isolated CivicVault proxy; upload a logo to IPFS via Pinata
- **Membership & stake** — admins onboard and KYC members; a member's committed stake (USDC put behind upvotes) sets governance weight
- **Investment proposals** — admin-curated: title, description, USDC target, deadline, risk grade (A–D), IPFS document
- **Stake-weighted voting** — upvotes stake USDC; downvotes are free; deadline-aware cutoff
- **Phased escrow** — three-phase fund release tied to milestone confirmations
- **Yield deposit & claim** — finance managers deposit returns; voters claim proportionally
- **KYC & roles** — member verification stored as on-chain hash; tiered admin roles
- **Member-initiated governance** — stake-weighted votes to remove an admin, freeze a release, or claw back an investment, so the creator can't control the membership or the money (`CivicVaultGovernor`)
- **Protocol yield fee** — capped, realized-yield-only fee to a factory-set treasury; never touches principal or escrow
- **Gasless & non-custodial** — Circle user-controlled wallets + Gas Station for email/Google users; the backend never holds a signing key

### Messaging & Notifications

- **Real-time DAO chat** — one room per DAO via Supabase Realtime WebSocket; falls back to `localStorage` for demos without Supabase
- **Chat images** — uploaded to Pinata; URL stored in `attachment_url` column; hydrated on read if column missing
- **Notification bell** — combines unread chat messages, open proposals needing votes, and claimable yields
- **Email alerts** — users link their Gmail account; get emails on new proposals, investment activations, yield deposits
- **Async queue** — optional RabbitMQ workers for fan-out email delivery with retries

### Profile & Identity

- **Privy login** — email, Google, or external wallet; embedded wallet created automatically for new users
- **Profile photo** — uploaded to IPFS; shown in sidebar, header, and chat
- **Display names** — resolved from Privy linked accounts (Google name, email prefix, or shortened wallet)
- **Circle user-controlled wallets** — email/Google users get a non-custodial Circle wallet (ERC-4337 smart account) on Arc; the key is split between the user's passkey/PIN and Circle, and CivicVault holds no signing share. Gas is sponsored by Circle Gas Station, so member actions cost nothing. Every backend-initiated call is checked against a transaction policy (factory-verified DAO targets, member functions only, never a raw transfer) and written to an audit log.

---

## Tech Stack

| Area | Technologies |
|------|-------------|
| Blockchain | Arc Testnet (Chain ID 5042002), USDC as native gas |
| Smart Contracts | Solidity ^0.8.20, Foundry, BeaconProxy (upgradeable), OpenZeppelin |
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4, Lucide icons |
| Auth & Wallets | Privy (social login + token auth), Circle user-controlled wallets + Gas Station |
| On-chain Reads | Wagmi v2, Viem |
| Real-time Chat | Supabase Realtime (WebSocket + REST fallback) |
| File Storage | Pinata (IPFS) |
| Analytics | The Graph (subgraph deployed on arc-testnet network) |
| Backend | Node.js 18, Express 5, Prisma ORM, SQLite |
| Email | Gmail OAuth 2.0, Nodemailer |
| Async Workers | RabbitMQ via `amqplib` (optional) |
| Circle Wallets | Circle W3S user-controlled wallets + Gas Station (`@circle-fin/w3s-pw-web-sdk`) |

---

## Project Structure

```
CivicVault/
│
├── App.tsx                        # Root router — view state machine
├── index.tsx                      # PrivyProvider + chain config + entry point
├── index.html
├── vite.config.ts
├── tsconfig.json                  # Frontend-only TS project (excludes backend/)
├── vite-env.d.ts                  # VITE_* type declarations
├── .env.example                   # Frontend env template
│
├── views/                         # Full-page React views
│   ├── LandingPage.tsx
│   ├── Dashboard.tsx              # TVL, active DAOs, proposals, yield summary
│   ├── Discover.tsx               # Browse all DAOs
│   ├── CreateDAO.tsx              # Deploy new DAO via factory
│   ├── InvestmentListing.tsx      # All proposals across DAOs
│   ├── VotingInterface.tsx        # Vote on a specific proposal
│   ├── KYCVerification.tsx        # Admin: verify/manage members
│   ├── Wallet.tsx                 # USDC + ₦ balance, Circle wallet, add funds
│   ├── Yields.tsx                 # Claimable yields overview
│   ├── Governance.tsx             # Open / vote / execute member governance proposals
│   ├── Messages.tsx               # Per-DAO real-time chat
│   └── Profile.tsx                # Preferences, Gmail link, notifications
│
├── layouts/
│   └── AppShell.tsx               # Nav sidebar, notification bell, profile chip
│
├── components/                    # Reusable UI components
│   ├── Hero.tsx
│   ├── Features.tsx
│   ├── HowItWorks.tsx
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── Faqs.tsx
│   ├── Properties.tsx
│   ├── TrustBadges.tsx
│   ├── Governance.tsx
│   ├── GmailNotificationSettings.tsx
│   ├── UserAvatar.tsx
│   └── UI.tsx                     # Shared primitives (Button, Card, Badge…)
│
├── utils/                         # Frontend utilities
│   ├── contract.ts                # Chain config + deployed addresses
│   ├── civicVaultContracts.ts     # All contract read/write helpers (incl. CivicVaultGovernor)
│   ├── walletResolution.ts        # Off-chain (canonical) + on-chain (getOnchainAddress) resolution
│   ├── apiFetch.ts                # Backend fetch wrapper — attaches the Privy access token
│   ├── txSigner.ts                # circleSubmit() — routes a member write through the Circle backend
│   ├── useMemberSigner.ts         # Hook: external wallet vs Circle user-controlled wallet
│   ├── circleWallet.ts            # Circle user-controlled wallet + passkey challenge
│   ├── fiat.ts                    # ₦ ⇄ USDC display formatting + rate
│   ├── backendUrl.ts              # VITE_BACKEND_URL with localhost fallback
│   ├── daoChat.ts                 # Supabase insert/select + local fallback
│   ├── subgraph.ts                # The Graph query helpers
│   ├── ipfs.ts                    # Pinata upload helpers
│   ├── daoImage.ts                # DAO logo resolution (IPFS → gateway URL)
│   ├── profileAvatar.ts           # Profile photo (IPFS, localStorage)
│   ├── userDisplay.ts             # Display name resolution from Privy user
│   ├── explorer.ts                # Block explorer URL builders
│   ├── chainUtils.ts              # Chain helpers
│   ├── address.ts                 # Address formatting
│   ├── clipboard.ts               # Copy to clipboard helper
│   ├── privyAuth.ts               # Privy hook wrappers
│   ├── toast.ts                   # React-toastify shortcuts
│   └── waitlist.ts
│
├── contract/                      # Foundry project
│   ├── src/
│   │   ├── CivicVault.sol         # Core DAO vault (~24.5KB runtime)
│   │   ├── CivicVaultFactory.sol  # BeaconProxy deployer + beacon + protocol-fee config
│   │   ├── CivicVaultView.sol     # Batched read helper (stateless)
│   │   ├── CivicVaultGovernor.sol # Member-initiated governance singleton
│   │   └── interfaces/
│   │       └── ICivicVault.sol
│   ├── test/                      # 89 tests across 5 suites (unit, factory, governance, beacon-upgrade, invariants)
│   │   ├── CivicVault.t.sol
│   │   ├── CivicVaultFactory.t.sol
│   │   ├── CivicVaultGovernance.t.sol
│   │   ├── CivicVaultBeacon.t.sol
│   │   └── CivicVaultInvariants.t.sol
│   ├── script/
│   │   └── DeployCivicVault.s.sol
│   └── broadcast/                 # Deployment receipts (Arc Testnet)
│       └── DeployCivicVault.s.sol/5042002/run-latest.json
│
├── backend/                       # Express API
│   ├── package.json
│   ├── .env.example
│   ├── .gitignore
│   ├── docker-compose.rabbitmq.yml
│   ├── prisma/
│   │   ├── schema.prisma          # User (+ walletTier), Notification, ChatSubscription, EmailPreference, CircleTxLog
│   │   └── migrations/
│   └── src/
│       ├── index.ts               # Server entry, CORS, route mounts
│       ├── db/prisma.ts           # Shared Prisma singleton
│       ├── middleware/
│       │   └── auth.ts            # Privy verifyAuthToken — requireAuth / optionalAuth
│       ├── chain/                 # arc.ts (chain + DAO verification + USDC), reads.ts (USSD menu reads)
│       ├── ussd/                  # session store, menu state machine, background tx actions, SMS
│       ├── routes/
│       │   ├── auth.routes.ts     # Gmail OAuth + identity sync (token-verified)
│       │   ├── chat.routes.ts     # Subscribe + webhook fan-out
│       │   ├── users.routes.ts    # Profile + preferences CRUD
│       │   ├── notifications.routes.ts
│       │   ├── wallet.routes.ts   # Circle wallet ensure / balance / call / tx status
│       │   ├── fiat.routes.ts     # ₦/USD rate + quote
│       │   ├── ussd.routes.ts     # Africa's Talking USSD callback + facilitator enrolment
│       │   ├── circleWallet.routes.ts   # deprecated shim
│       └── services/
│           ├── wallet/            # WalletProvider abstraction, txPolicy, user-controlled + custodial providers, audit log
│           ├── fiatRate.service.ts
│           ├── gmail.service.ts
│           ├── notification.service.ts
│           └── event-listener.service.ts
│       └── messaging/             # RabbitMQ topology + consumers + publishers
│
├── subgraph/                      # The Graph subgraph
│   ├── schema.graphql
│   ├── subgraph.yaml              # startBlock: 60010770 (Arc Testnet factory + governor deploy)
│   ├── src/
│   │   ├── factory.ts             # DAOCreated handler
│   │   └── civicVault.ts          # Investment/vote/yield event handlers
│   └── generated/                 # Auto-generated types (graph codegen)
│
├── supabase-scripts/
│   └── init.sql                   # Run once in Supabase SQL Editor
│
└── public/
```

---

## Smart Contracts

### CivicVault (per-DAO vault)

The core contract. Each DAO is an independent proxy pointing at the shared implementation. Key design decisions:

- **Kept under EIP-170's 24KB limit** (24,497 bytes) by externalising analytics to The Graph subgraph and moving the proposal/voting machinery into a separate `CivicVaultGovernor` singleton
- **No SafeMath** — Solidity 0.8+ overflow reverts built-in
- **USDC-denominated throughout** — all stakes, votes, and yields are in the same 6-decimal asset

Key functions:

| Function | Who can call | Description |
|----------|-------------|-------------|
| `addMember(wallet, kycProofHash)` | Admin | Onboard a member; KYC proof hash stored on-chain |
| `createInvestment(...)` | Admin | Post an investment proposal for members to fund |
| `vote(id, numberOfVotes, voteValue)` | Verified member | Stake USDC on an upvote (adds to committed stake); free downvote |
| `activateInvestment(id)` | Admin | Move a funded proposal to ACTIVE — funds enter phased escrow |
| `releaseNextPhase(id, recipient)` | Admin | Release the next 30/40/30% tranche (blocked if members froze it) |
| `proposeYieldDeposit(id, amount, cid)` | Finance Manager | Propose a yield deposit from a completed investment |
| `approveYieldDeposit(id)` / `executeYieldDeposit(id)` | Admin (3-of-N) / anyone | Approve then execute; funds must be present at execution |
| `claimYield(id)` | Voter | Claim proportional yield share |
| `withdrawStake(id)` | Member | Withdraw USDC once the vote is no longer locked |
| `reclaimClawback(id)` | Upvoter | After a clawback vote passes, reclaim unreleased escrow pro-rata |

### CivicVaultFactory + beacon

Each DAO is a `BeaconProxy` pointing at one `UpgradeableBeacon` the factory deploys. `createDAO` deploys the proxy and runs `initialize` atomically in its constructor. Emits `DAOCreated(...)` indexed by The Graph.

**Why a beacon, not clones:** EIP-1167 clones bake the implementation address into the proxy — a bug fix means a new factory and every existing DAO is stranded on the old code. With the beacon, one `upgradeTo` moves every DAO at once. No migration, no orphaning.

### CivicVaultBeaconController

Owns the beacon so `upgradeTo` isn't a bare owner call over every DAO's funds. An upgrade goes: `proposeUpgrade(newImpl)` → **2-day timelock** → `executeUpgrade()`. During the window, the creator or any admin of a DAO can `vetoUpgrade(dao)`; if DAOs holding **≥ 30% of total value-locked** veto, the upgrade cannot execute. The controller's own owner is meant to be a multisig / meta-DAO — there is no path back to an EOA-controlled beacon.

### CivicVaultView

Stateless read-only helper. The frontend calls this for batched state reads (DAO info + member status + investments) in a single RPC round-trip, avoiding waterfall reads.

### CivicVaultGovernor

Member-initiated governance singleton (deployed once, keyed by DAO address, like the View). Stake-weighted proposals that the DAO creator cannot block:

| Proposal | Effect |
|----------|--------|
| `RemoveAdmin` / `ReinstateAdmin` | Evict an admin and bar re-appointment until members reinstate |
| `FreezeRelease` / `UnfreezeRelease` | Pause a suspicious phased escrow release (auto-expires; repeat freezes escalate) |
| `Clawback` | Return an ACTIVE investment's unreleased escrow pro-rata to its upvoters |

Voting weight is USDC actually committed to the DAO. The pass rule is snapshotted at `openProposal`; admin/clawback votes use a participation quorum with a turnout floor; a voter's stake is locked until the proposal closes.

### Protocol yield fee

`CivicVaultFactory` holds a `protocolTreasury` address and `protocolYieldFeeBps` (owner-set, hard-capped at 500 bps). The fee is skimmed from **realized yield only** at `executeYieldDeposit` and emitted as `YieldFeeSkimmed`. Principal and escrow are never touched.

### Deployed Addresses (Arc Testnet — Chain ID 5042002)

Beacon-proxy stack with member governance + the protocol yield fee. Deployed at block `60010770`. Supersedes the earlier clone-based stacks — those DAOs are not carried over (testnet seeds).

| Contract | Address |
|----------|---------|
| **CivicVaultFactory** | `0x58Ff8ca3b9863e535845f58D5d7AA90B33fE635F` |
| CivicVault Implementation | `0x5d013b69f4a63c8D46E6AA3a9A89CDE424470dc4` |
| UpgradeableBeacon | `0x6c0ab09079659FAcE1108017eb67b05d1e2a9336` |
| **CivicVaultBeaconController** | `0x867Fa51A70F87E3CCDC2193079C2b3281350A012` |
| **CivicVaultView** | `0x4fdd011eCe547ddc148DA1316A7b979aA2cD6212` |
| **CivicVaultGovernor** | `0x1cE8328E08a4c93A37e5e03115BAdE0373b97310` |
| Seed DAO ("Essien Town Local DAO") | `0x7dD25bAa8f0109beDA1C79A328ae699D5F08D198` |
| USDC (Arc native) | `0x3600000000000000000000000000000000000000` |

Protocol fee: **300 bps** (3%) of realized yield → treasury `0x336d2787…` (deployer EOA on testnet; use a Safe for mainnet).

> View on explorer: [testnet.arcscan.app](https://testnet.arcscan.app)

---

## Environment Variables

### Frontend (`/.env`)

Copy from `.env.example`:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_PRIVY_APP_ID` | **Yes** | Privy app ID from [dashboard.privy.io](https://dashboard.privy.io) |
| `VITE_FACTORY_ADDRESS` | **Yes** | CivicVaultFactory contract address |
| `VITE_VIEW_ADDRESS` | **Yes** | CivicVaultView contract address |
| `VITE_CIRCLE_APP_ID` | No | Circle app ID — enables the non-custodial gasless wallet for email/Google users |
| `VITE_GOVERNOR_ADDRESS` | No | CivicVaultGovernor address — enables the Governance screen (set after the redeploy) |
| `VITE_CHAIN_ID` | No | Defaults to `5042002` |
| `VITE_RPC_URL` | No | Defaults to `https://rpc.testnet.arc.network` |
| `VITE_USDC_ADDRESS` | No | Defaults to Arc native USDC |
| `VITE_SUPABASE_URL` | No | Enables hosted real-time chat |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anon/public key |
| `VITE_PINATA_JWT` | No | Required for logo/photo/chat image uploads |
| `VITE_BACKEND_URL` | No | Defaults to `http://localhost:3001` |
| `VITE_SUBGRAPH_URL` | No | The Graph query URL for analytics dashboard |

### Backend (`/backend/.env`)

Copy from `backend/.env.example`:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | **Yes** | SQLite path: `file:./prisma/dev.db` |
| `PORT` | No | API port (default `3001`) |
| `FRONTEND_URL` | **Yes** | Frontend origin for CORS allowlist |
| `PRIVY_APP_ID` | For `/api/wallet` | Privy app ID (server-side) |
| `PRIVY_APP_SECRET` | For `/api/wallet` | Privy app secret — every mutating route verifies the caller's token with it |
| `FACTORY_ADDRESS` | For `/api/wallet` | Factory address the tx-policy uses to verify DAO targets on-chain |
| `GOVERNOR_ADDRESS` | No | Allows governance calls through the wallet tx-policy |
| `CIRCLE_API_KEY` | No | Circle W3S API key |
| `CIRCLE_APP_ID` | No | Circle app ID (user-controlled wallets) |
| `CIRCLE_GAS_STATION_POLICY_ID` | No | Gas Station policy for the wallet set on Arc |
| `ALERT_WEBHOOK_URL` | No | Slack/Discord webhook — policy rejections, failed txs, rate-limit trips |
| `FIAT_USD_NGN_RATE` | No | Stubbed ₦/USD display rate until a licensed on/off-ramp partner is wired |
| `CUSTODIAL_WALLET_CAP_USDC` | No | Per-USSD-wallet balance ceiling (default `50`) |
| `AT_USERNAME` / `AT_API_KEY` | For USSD | Africa's Talking credentials (`sandbox` username for testing) |
| `AT_SENDER_ID` / `AT_BASE_URL` | No | SMS sender id; base URL override |
| `GMAIL_CLIENT_ID` | No | Google OAuth client ID |
| `GMAIL_CLIENT_SECRET` | No | Google OAuth client secret |
| `GMAIL_FROM_EMAIL` | No | Sender address for notification emails |
| `GMAIL_MAILER_REFRESH_TOKEN` | No | OAuth refresh token for outbound mail |
| `RABBITMQ_URL` | No | If set, webhooks queue jobs; run `npm run worker` |
| `CIRCLE_ENTITY_SECRET` | No | Circle entity secret — **USSD custodial tier only (Milestone 2)** |
| `CIRCLE_WALLET_SET_ID` | No | Circle wallet set ID — USSD custodial tier only |

---

## Local Development

### Prerequisites

- Node.js 18+
- [Foundry](https://getfoundry.sh/) for contract compilation/testing
- A funded Arc Testnet wallet

### 1. Install dependencies

```bash
# Frontend
npm install

# Backend
cd backend && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env          # fill VITE_PRIVY_APP_ID at minimum
cp backend/.env.example backend/.env
```

### 3. Set up Supabase (optional but recommended for chat)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run `supabase-scripts/init.sql`
3. Copy **Project URL** and **anon public key** into `.env`

### 4. Run the backend

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
npm run dev
# → http://localhost:3001
```

Optional RabbitMQ workers:

```bash
docker compose -f docker-compose.rabbitmq.yml up -d
npm run worker   # separate terminal
```

### 5. Run the frontend

```bash
# from project root
npm run dev
# → http://localhost:5173
```

### 6. Health check

```
GET http://localhost:3001/api/health
```

Returns Gmail config status, and RabbitMQ reachability.

---

## Backend API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/sync-identity` | Upsert user; link wallet + email + Privy ID |
| `GET` | `/api/auth/gmail/connect` | Begin Gmail OAuth flow |
| `GET` | `/api/auth/gmail/callback` | OAuth redirect handler |
| `GET` | `/api/auth/preferences/:wallet` | Gmail connection status |
| `POST` | `/api/chat/subscribe` | Subscribe wallet to DAO notifications |
| `GET` | `/api/chat/subscriptions/:wallet` | List DAO subscriptions |
| `POST` | `/api/chat/webhook/new-message` | Fan-out chat email notifications |
| `GET` | `/api/users/:wallet` | Get user (with preferences + notifications) |
| `PATCH` | `/api/users/:wallet` | Update email address |
| `GET` | `/api/users/:wallet/profile` | Enriched profile with unread + subscription counts |
| `GET` | `/api/users/:wallet/preferences` | Get notification preferences |
| `PATCH` | `/api/users/:wallet/preferences` | Update notification preferences |
| `GET` | `/api/notifications/:wallet` | Paginated in-app notifications |
| `PATCH` | `/api/notifications/:id/read` | Mark one notification read (auth) |
| `PATCH` | `/api/notifications/all/:wallet/read` | Mark all read (auth) |
| `DELETE` | `/api/notifications/read/:wallet` | Purge read notifications (auth) |
| `POST` | `/api/wallet/ensure` | Provision / return the caller's Circle wallet (auth) |
| `GET` | `/api/wallet` | Address, tier, USDC + ₦ balance (auth) |
| `POST` | `/api/wallet/call` | Policy-checked contract call → Circle challenge or submitted ref (auth) |
| `GET` | `/api/wallet/tx/:refId` | Poll a submitted call (auth) |
| `GET` | `/api/fiat/rate` · `/api/fiat/quote` | ₦/USD display rate + conversion estimate |
| `POST` | `/api/ussd` | Africa's Talking USSD callback (menu state machine) |
| `POST` | `/api/ussd/enroll` | Facilitator enrols a phone → custodial member (must be a DAO admin/creator on-chain) (auth) |
| `GET` | `/api/circle-wallet/:wallet` | **Deprecated** — superseded by `/api/wallet` |
| `GET` | `/api/stats` | Platform-wide counts |
| `GET` | `/api/health` | Service health check |

Every mutating route (`/api/wallet/*`, `/api/users` writes, `/api/chat/subscribe`, `/api/notifications` writes) requires an `Authorization: Bearer <Privy access token>` header; the caller is derived from the verified token, never from the request body.

---

## Feature-phone access (USSD)

Members without a smartphone reach the same on-chain DAOs through a `*123#` session.

- **Two tiers, one DAO.** Smartphone/web members are non-custodial (Circle user-controlled wallet). A feature phone can't hold a key, so USSD members get a **custodial** Circle wallet — the backend signs, authorised by the member's PIN. Blast radius is bounded by the same transaction policy (member actions only, never a transfer-out), a per-wallet balance cap (`CUSTODIAL_WALLET_CAP_USDC`, default $50), and the audit log.
- **Naira in, USDC on-chain.** The menu shows ₦; amounts are converted at `FIAT_USD_NGN_RATE` (a licensed on/off-ramp partner replaces the stub in Milestone 3).
- **Onboarding is facilitator-assisted.** A DAO admin/creator calls `POST /api/ussd/enroll { phoneNumber, daoAddress }` to map a phone to a custodial wallet; the member sets a PIN on first dial-in.
- **Flow.** Dial in → PIN → menu: *My balance · My communities · Vote on a proposal · Governance*. Voting/governance actions run as background transactions; the member gets the result by SMS.
- **Setup.** Register `https://<host>/api/ussd` as the callback in the Africa's Talking dashboard; set `AT_USERNAME` / `AT_API_KEY` (+ `CIRCLE_ENTITY_SECRET` / `CIRCLE_WALLET_SET_ID` for the custodial wallets).

`backend/src/ussd/` — `session.ts` (in-memory session store; swap for Redis to run multi-instance), `menu.ts` (state machine), `actions.ts` (background approve→vote / governance-vote + SMS), `sms.ts`.

---

## DAO Chat (Messages)

- **Transport:** Supabase Realtime WebSocket when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set; falls back to `localStorage` + `BroadcastChannel` for single-browser demos
- **Table:** `dao_chat_messages` — schema in `supabase-scripts/init.sql`
- **Images:** uploaded to Pinata; stored as `attachment_url`; if column is missing (older DB), the URL is merged into `content` and hydrated on read by `hydrateChatImageAttachment` in `utils/daoChat.ts`
- **Notification bell:** counts messages from others since your last-seen timestamp (stored per DAO in `localStorage`)

---

## Analytics (The Graph)

The subgraph indexes all CivicVault events on Arc Testnet — DAO creation, investment proposals, votes, phase releases, yield deposits, claims, and member-governance proposals (`CivicVaultGovernor`).

**Public query endpoint (no login):** `https://api.studio.thegraph.com/query/1755424/civicvault/v0.0.2`

```bash
cd subgraph
npm install

# Authenticate
graph auth --studio <deploy-key>

# Build + deploy
npm run codegen
npm run build
npm run deploy:studio
```

After deploying, paste the query URL into `VITE_SUBGRAPH_URL` in `.env`.

---

## Smart Contract Development

```bash
cd contract

# Compile
forge build

# Test
forge test -vvv

# Deploy to Arc Testnet (deploys implementation, factory, view, governor, and
# seeds one DAO; reads optional PROTOCOL_TREASURY + PROTOCOL_YIELD_FEE_BPS env)
PROTOCOL_TREASURY=0x... PROTOCOL_YIELD_FEE_BPS=300 \
forge script script/DeployCivicVault.s.sol \
  --rpc-url https://rpc.testnet.arc.network \
  --broadcast \
  --non-interactive
```

After deploying, update `VITE_FACTORY_ADDRESS`, `VITE_VIEW_ADDRESS`, and `VITE_GOVERNOR_ADDRESS` in `.env` and `utils/contract.ts`, plus `FACTORY_ADDRESS` / `GOVERNOR_ADDRESS` in `backend/.env`, and bump the subgraph `startBlock` to the new factory's deploy block.

---

## Deployment

### Frontend

```bash
npm run build   # output: dist/
```

Deploy `dist/` to Vercel, Netlify, or any static host. Set all `VITE_*` variables as environment secrets. `VITE_BACKEND_URL` must point to your production API over HTTPS.

### Backend

```bash
cd backend
npm run build
npm start
```

Deploy to Railway, Render, Fly.io, or any Node host. Set all `backend/.env` keys as environment secrets. Run the worker as a separate process if using RabbitMQ:

```bash
npm run start:worker
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Setup required" screen | Add `VITE_PRIVY_APP_ID` to `.env` and restart dev server |
| Transactions fail / wrong chain | Wallet network vs `VITE_CHAIN_ID`; factory and USDC on the same chain |
| Chat fails to load | Check Supabase URL/key; run `supabase-scripts/init.sql`; inspect browser Network tab |
| Chat shows URL instead of image | Old rows — hydration should fix on read; check Pinata gateway URL format |
| No emails on new message | Check subscriptions, `email` on user record, Gmail tokens, `GMAIL_FROM_EMAIL`, `/api/health` |
| Workers idle | `RABBITMQ_URL` set; Docker Compose running; `npm run worker` started in `backend/` |
| TypeScript OOM | Root `tsconfig` excludes `backend/`; run `tsc` inside `backend/` for backend types |
| Contract deploy fails (size) | CivicVault is 24,497 bytes — 79 under the 24,576 limit; check Foundry version and `via_ir` / `optimizer_runs` in `foundry.toml` |

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Contracts: run `forge test` before opening a PR
4. Open a PR against `main`

---

## License

MIT
