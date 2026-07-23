# CivicVault

> Community-governed investment DAOs on Arc Testnet — stake USDC, vote on local infrastructure proposals, and earn proportional yield when investments succeed.

[![Arc Testnet](https://img.shields.io/badge/Chain-Arc%20Testnet%205042002-blue)](https://testnet.arcscan.app)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-brightgreen)](https://soliditylang.org/)
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

1. A founder creates a DAO via `CivicVaultFactory` — a new proxy vault is deployed in one transaction
2. Admins verify members via KYC (hash stored on-chain)
3. Any verified member can propose a local investment with a USDC funding target and deadline
4. Members vote by staking USDC; vote weight is proportional to membership stake
5. When a proposal reaches its threshold it becomes ACTIVE — funds move to a phased escrow
6. Finance managers release funds in three phases (30 / 40 / 30%) as milestones are completed
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
                    │  │  (EIP-1167 proxies)  │  │   │ │  OAuth    │ │
                    │  └──────────┬───────────┘  │   │ └───────────┘ │
                    │             │              │   │ ┌───────────┐ │
                    │  ┌──────────▼───────────┐  │   │ │  Circle   │ │
                    │  │    CivicVault (DAO)  │  │   │ │  Wallets  │ │
                    │  │  ┌────────────────┐  │  │   │ └───────────┘ │
                    │  │  │ CivicVaultView │  │  │   │ ┌───────────┐ │
                    │  │  └────────────────┘  │  │   │ │ RabbitMQ  │ │
                    │  └──────────────────────┘  │   │ │ (workers) │ │
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
- **Join & stake** — deposit USDC to become a member; stake determines vote weight
- **Investment proposals** — title, description, USDC target, deadline, risk grade (A–D), IPFS document
- **Stake-weighted voting** — upvotes stake USDC; downvotes are free; deadline-aware cutoff
- **Phased escrow** — three-phase fund release tied to milestone confirmations
- **Yield deposit & claim** — finance managers deposit returns; voters claim proportionally
- **KYC & roles** — member verification stored as on-chain hash; tiered admin roles

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
- **Circle Programmable Wallets** — each user optionally gets a developer-controlled Circle wallet on Arc Testnet

---

## Tech Stack

| Area | Technologies |
|------|-------------|
| Blockchain | Arc Testnet (Chain ID 5042002), USDC as native gas |
| Smart Contracts | Solidity 0.8.24, Foundry, EIP-1167 minimal proxies, OpenZeppelin |
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS 4, Lucide icons |
| Auth & Wallets | Privy (embedded wallets + social login) |
| On-chain Reads | Wagmi v2, Viem |
| Real-time Chat | Supabase Realtime (WebSocket + REST fallback) |
| File Storage | Pinata (IPFS) |
| Analytics | The Graph (subgraph deployed on arc-testnet network) |
| Backend | Node.js 18, Express 5, Prisma ORM, SQLite |
| Email | Gmail OAuth 2.0, Nodemailer |
| Async Workers | RabbitMQ via `amqplib` (optional) |
| Circle Wallets | Circle W3S Programmable Wallets API |

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
│   ├── Wallet.tsx                 # USDC balance + Circle wallet
│   ├── Yields.tsx                 # Claimable yields overview
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
│   ├── civicVaultContracts.ts     # All contract read/write helpers (ABI + wagmi)
│   ├── walletResolution.ts        # Canonical wallet address from Privy user
│   ├── backendUrl.ts              # VITE_BACKEND_URL with localhost fallback
│   ├── daoChat.ts                 # Supabase insert/select + local fallback
│   ├── subgraph.ts                # The Graph query helpers
│   ├── circleWallet.ts            # Circle wallet frontend helpers
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
│   │   ├── CivicVault.sol         # Core DAO vault (~830 lines, 22KB)
│   │   ├── CivicVaultFactory.sol  # EIP-1167 proxy deployer
│   │   ├── CivicVaultView.sol     # Batched read helper (stateless)
│   │   └── interfaces/
│   │       └── ICivicVault.sol
│   ├── test/
│   │   └── CivicVault.t.sol
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
│   │   ├── schema.prisma          # User, Notification, ChatSubscription, EmailPreference
│   │   └── migrations/
│   └── src/
│       ├── index.ts               # Server entry, CORS, route mounts
│       ├── db/prisma.ts           # Shared Prisma singleton
│       ├── routes/
│       │   ├── auth.routes.ts     # Gmail OAuth + identity sync
│       │   ├── chat.routes.ts     # Subscribe + webhook fan-out
│       │   ├── users.routes.ts    # Profile + preferences CRUD
│       │   ├── notifications.routes.ts
│       │   ├── circleWallet.routes.ts
│       └── services/
│           ├── gmail.service.ts
│           ├── notification.service.ts
│           ├── circleWallet.service.ts
│           └── event-listener.service.ts
│       └── messaging/             # RabbitMQ topology + consumers + publishers
│
├── subgraph/                      # The Graph subgraph
│   ├── schema.graphql
│   ├── subgraph.yaml              # startBlock: 47718182 (Arc Testnet factory deploy)
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

- **Kept under EIP-170's 24KB limit** (22,773 bytes) by externalising analytics to The Graph subgraph instead of storing activity history on-chain
- **No SafeMath** — Solidity 0.8+ overflow reverts built-in
- **USDC-denominated throughout** — all stakes, votes, and yields are in the same 6-decimal asset

Key functions:

| Function | Who can call | Description |
|----------|-------------|-------------|
| `joinDAO(uint256 amount)` | Anyone | Deposit USDC, receive membership shares |
| `proposeInvestment(...)` | Member | Create a new investment proposal |
| `voteOnInvestment(id, votes, value)` | Verified member | Stake USDC votes on a proposal |
| `activateInvestment(id)` | Admin | Move funded proposal to ACTIVE state |
| `releasePhaseFunds(id, phase)` | Finance Manager | Release 30/40/30% of escrow |
| `proposeYieldDeposit(id, amount)` | Finance Manager | Deposit yield for distribution |
| `claimYield(id)` | Voter | Claim proportional yield share |
| `withdrawStake(amount)` | Member | Withdraw USDC if not locked in active votes |

### CivicVaultFactory

Deploys new CivicVault proxies using EIP-1167 minimal clone pattern. A new DAO costs under 100k gas to deploy. Emits `DAOCreated(address dao, address creator, string name)` indexed by The Graph.

### CivicVaultView

Stateless read-only helper. The frontend calls this for batched state reads (DAO info + member status + investments) in a single RPC round-trip, avoiding waterfall reads.

### Deployed Addresses (Arc Testnet — Chain ID 5042002)

| Contract | Address |
|----------|---------|
| CivicVault Implementation | See `contract/broadcast/.../run-latest.json` |
| **CivicVaultFactory** | `0x5a9D34264Da36cd05B66Fab80e6e5D6feDC9fDBC` |
| **CivicVaultView** | `0x5000F14A757d4488297772b694f18EaF0eC45C81` |
| USDC (Arc native) | `0x3600000000000000000000000000000000000000` |

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
| `GMAIL_CLIENT_ID` | No | Google OAuth client ID |
| `GMAIL_CLIENT_SECRET` | No | Google OAuth client secret |
| `GMAIL_FROM_EMAIL` | No | Sender address for notification emails |
| `GMAIL_MAILER_REFRESH_TOKEN` | No | OAuth refresh token for outbound mail |
| `RABBITMQ_URL` | No | If set, webhooks queue jobs; run `npm run worker` |
| `CIRCLE_API_KEY` | No | Circle W3S API key |
| `CIRCLE_ENTITY_SECRET` | No | Circle entity secret (32-byte hex) |
| `CIRCLE_WALLET_SET_ID` | No | Circle wallet set ID |

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
| `PATCH` | `/api/notifications/:id/read` | Mark one notification read |
| `PATCH` | `/api/notifications/all/:wallet/read` | Mark all read |
| `DELETE` | `/api/notifications/read/:wallet` | Purge read notifications |
| `GET` | `/api/circle-wallet/:wallet` | Get or provision Circle wallet |
| `GET` | `/api/stats` | Platform-wide counts |
| `GET` | `/api/health` | Service health check |

---

## DAO Chat (Messages)

- **Transport:** Supabase Realtime WebSocket when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set; falls back to `localStorage` + `BroadcastChannel` for single-browser demos
- **Table:** `dao_chat_messages` — schema in `supabase-scripts/init.sql`
- **Images:** uploaded to Pinata; stored as `attachment_url`; if column is missing (older DB), the URL is merged into `content` and hydrated on read by `hydrateChatImageAttachment` in `utils/daoChat.ts`
- **Notification bell:** counts messages from others since your last-seen timestamp (stored per DAO in `localStorage`)

---

## Analytics (The Graph)

The subgraph indexes all CivicVault events on Arc Testnet — DAO creation, investment proposals, votes, phase releases, yield deposits, and claims.

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

# Deploy to Arc Testnet
forge script script/DeployCivicVault.s.sol \
  --rpc-url https://rpc.testnet.arc.network \
  --broadcast \
  --non-interactive
```

After deploying, update `VITE_FACTORY_ADDRESS` and `VITE_VIEW_ADDRESS` in `.env` and `utils/contract.ts`.

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
| Contract deploy fails (size) | CivicVault is 22,773 bytes — safely under 24,576 limit; check Foundry version |

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Contracts: run `forge test` before opening a PR
4. Open a PR against `main`

---

## License

MIT
