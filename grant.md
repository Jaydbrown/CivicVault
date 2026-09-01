# CivicVault

**On-chain infrastructure for the way communities actually pool money.**

Built on Circle's Arc Network · Live on Arc Testnet · Requesting $42,000 to audit and launch.

---

## The story this is built on

My street's transformer burned out. Everyone knew the power company wasn't coming, so we did what streets here always do: someone went door to door, every household gave what it could, and one trusted person held the money. Weeks passed. The transformer never came. The money was gone. Nobody could prove what happened to it, because nothing was ever written down anywhere that couldn't be quietly rewritten or quietly forgotten.

The street stayed dark. Whoever collected the money moved on. And everyone accepted it, because that's just how it works.

I watched that exact pattern repeat — different street, different collection, same ending — enough times to stop believing it was bad luck. It's not the transformer. It's the school levy every parent pays with no report. The class project that stalls halfway. The borehole fund that disappears from conversation the day it's collected. Every time people pool money by hand, the only thing between "invested in something real" and "gone" is one person's word.

**CivicVault removes the word.**

---

## What it is

CivicVault lets a neighborhood, a PTA, a savings group, or a diaspora club spin up its own on-chain treasury in one transaction. Members pool USDC. They vote — with real stake behind the vote — on which local investments to fund. Money is escrowed by the contract itself and released to projects in milestone phases, never all at once. When an investment returns a profit, the contract splits the yield automatically, to the exact cent, in proportion to what each member staked.

No treasurer holding the account. No chairman who can skip a phase. No contributor who quietly loses their claim. Every release, every vote, every payout is on a public ledger that no admin can edit.

You're not donating anymore. You're staking — and when the community's investment pays off, so do you.

---

## This is not a concept. It's deployed.

| | |
|---|---|
| **Smart contracts** | 8 contracts, ~3,700 lines of Solidity. **86 Foundry tests passing** — full lifecycle, fuzzed treasury invariants, a malicious-token reentrancy test, multi-sig edge cases, a 17-test member-governance suite, an 8-test upgrade-safety suite. |
| **Live on Arc Testnet** | Factory, upgradeable beacon + timelock controller, member-governance contract, view layer, and a seeded pilot DAO — all deployed and verified. Addresses in the reference section. |
| **Web app** | React 19, 12 views covering every action from DAO creation to yield claim. Live at `civic-vault-aupu.vercel.app`. |
| **Mobile app** | React Native / Expo, feature-complete, pending store submission. |
| **Feature-phone access** | USSD (`*123#`) menu — balance, vote, governance — built end to end, including a PIN-authorised custodial signer with a hard balance cap and SMS confirmations. |
| **Backend** | Privy-authenticated Express API. Every Circle signing request passes an on-chain-verified transaction policy and lands in an audit log. Real-time chat, email notifications, a live subgraph. |

The single thing standing between this codebase and a mainnet communities can trust is a professional security audit. **That's what this grant is for.**

---

## The problem, at scale

Rotating savings groups — chamas, susus, ajo, esusu, tontines, arisan — move **well over $100 billion a year**, almost entirely through WhatsApp threads, spreadsheets, and one person's bank account. Sub-Saharan Africa alone has 40M+ chama members. Add PTA development funds, community development associations, student union budgets, and diaspora investment clubs, and you have an enormous, entirely offline market whose defining failure mode is *money pooled by a group with no enforceable record of where it went.*

Three things have kept a solution out of reach:

1. **Web3 is built for traders, not organizers.** Seed phrases, gas tokens, wallet management — none of it survives contact with a PTA chairman or an esusu admin.
2. **Volatile chains destroy the point.** A community that pools $20,000 for a transformer should not wake up to a $14,000 treasury because ETH dropped.
3. **The nearest tool still makes you come to Web3.** A Gnosis Safe prevents unilateral fund movement, but it needs every signer to hold ETH, run a wallet, and be online for a threshold. That's not a street association.

CivicVault is the first protocol that brings Web3 *to* the community instead of the other way around — and Circle's Arc Network is the first place it's genuinely possible.

---

## Why Circle, why Arc — this only works here

The entire product thesis is *the blockchain is invisible*. That requires three things that exist together only on Arc:

- **USDC is the native gas token.** No ETH, no BNB, no "buy a gas token first." Every fee and every transfer is denominated in the same stable asset the community is saving in. Capital preservation is the whole point, and Arc is the only environment where it holds from deposit to payout.
- **Circle user-controlled wallets.** A member signs in with email or Google and gets a smart-contract wallet whose key is MPC-split between their own device passkey and Circle. No seed phrase. And critically: **CivicVault holds no signing share.** The backend can build a transaction and ask the member to approve it — it can never move their money. That's not a nice-to-have; it's the difference between our pitch and "trust another treasurer."
- **Circle Gas Station.** Every member action — verify, vote, claim, govern — has its gas sponsored. A first-time user's first vote costs them nothing.

Take any one of these away and the experience collapses back into "you need to understand crypto." Together, they make CivicVault feel like a modern banking app that happens to be trustless underneath.

---

## How it works

1. **A founder deploys a DAO** through a gas-efficient beacon-proxy factory — one transaction, no legal overhead. Every DAO shares one upgradeable implementation, so a future security fix reaches all of them without a migration.
2. **Admins onboard and KYC-verify members** with on-chain hash commitments — a cryptographic record that verification happened, zero personal data on-chain.
3. **Admins post investment proposals** — a transformer, a classroom block, a cooperative loan, a market stall — each with a funding target, deadline, risk grade, and IPFS-linked documents.
4. **Members vote by staking USDC.** An upvote moves real capital into escrow. Downvotes are free but carry no weight — no veto without accountability.
5. **On hitting target, funds escrow and release in three phases** (30% / 40% / 30%), enforced in sequence by an on-chain counter. An admin *cannot* release phase 2 before phase 1. If a vendor absconds, the community loses one tranche, not everything.
6. **Yield deposits need 3-of-N admin approval** — and the money must actually be in the proposer's wallet at execution, not promised. No ghost payouts.
7. **Members claim their exact pro-rata share** whenever they want. The contract doesn't do favoritism and never forgets the smallest contributor.
8. **Members — not the creator — hold ultimate control.** Stake-weighted member votes can evict an admin (and bar the creator from re-appointing them), freeze a suspicious release, or claw back an investment's unreleased funds pro-rata to its backers.

That last point is the one most protocols get wrong, so it's worth being explicit.

---

## Why it can't be captured

**Staked voting.** Votes are weighted by USDC actually committed to the DAO. A creator can add a hundred fake member addresses for free — but giving them voting power means funding them with real capital that then sits in escrow, at risk, claimable pro-rata by everyone else. To control the outcome you must control the at-risk money. That's the sybil defense: not a CAPTCHA, an economic one.

**Member governance with hardened math.** The pass rule — denominator and thresholds — is snapshotted the moment a proposal opens, so no one can inflate it mid-vote. Admin and clawback votes use a participation quorum with a turnout floor (not an absolute quorum that becomes unreachable as completed-investment stake piles up). Repeat freezes of the same investment face an escalating bar and a cooldown. A voter's stake is locked until the proposal closes, so "vote then withdraw" can't keep the weight. Covered by a dedicated fuzz-tested suite.

**Upgradeable without a single point of control.** Every DAO is a beacon proxy — one `upgradeTo` fixes a bug across all of them, no stranded contracts. But the beacon isn't a bare owner key: it's held by a controller that puts every upgrade through a **2-day timelock**, and DAOs holding ≥ 30% of total value-locked can **veto** it. The upgrade path exists; it is not a lever one person can pull over everyone's funds.

**Phased, multi-sig money movement.** No admin releases out of order. No finance manager moves yield alone. No disbursement happens without 3 separate approvals *and* the funds physically present.

**No custodial backend.** The web/mobile tier is fully non-custodial. The feature-phone tier is necessarily custodial (a `*123#` session can't hold a key), but it's bounded: signing is limited by policy to vote / claim / capped-approve — never a transfer-out — with a per-wallet balance cap, full audit logging, and PIN lockout. Disclosed in-product and here.

---

## Who uses it, and how we reach them

Community-first, not crypto-first. The user is an organizer, not a DeFi native.

- **Personal network first.** The first three DAOs are hands-on onboardings of groups already in reach — a family ajo, a church investment arm, an alumni club. Real communities, real money, real on-chain records. These become the case studies every later group references.
- **Street and estate associations** — reached through estate WhatsApp groups and neighborhood meetings, deployed the next time a transformer dies and a collection starts.
- **PTA and school development committees** — CivicVault replaces the spreadsheet and the treasurer's account; every parent sees what was collected, what it was voted for, and what milestone unlocks the next payment to the contractor.
- **Student union governments** at UNILAG, OAU, Covenant, LASU — offered a free first year to run a budget cycle on-chain. Student-union finance is one of the most visible accountability failures in Nigerian campus life; one campus running on CivicVault is a story that spreads to every other campus for free.
- **Ajo and esusu cooperatives** — one supported cycle each, then they run independently, and every group in the network wants to know how.
- **Diaspora investment clubs** in the UK and US — a neutral coordination layer that doesn't depend on one person holding a foreign bank account.

---

## The business

CivicVault earns nothing when a DAO is idle. It earns when a community's investment pays off.

**Protocol yield fee** — skimmed from **realized yield only** (never principal, never escrow) when a deposit executes, paid to a protocol treasury. Set on the factory, **hard-capped at 5% in the contract**, launching at **3%**. Enforced on-chain, emitted as an event, visible to every member before they join. On $500,000 of realized yield flowing through the protocol, that's $15,000 to the treasury.

Secondary lines as the network scales: a small one-time DAO creation fee, and an institutional tier for registered cooperatives and unions that need branding, compliance exports, and higher limits.

The model works because every alternative costs a community far more — a lawyer to structure an investment vehicle, a joint bank account with fees and no audit trail, or a cooperative administrator whose management cut dwarfs a 3% protocol fee with none of the transparency.

---

## The ask: $42,000

One number, three jobs: **get it audited, get it on mainnet, get the first communities on it.**

### Security — $15,000
A professional smart-contract audit (Cyfrin / Halborn / Code4rena tier, ~2 weeks). Scope: the 8 contracts and ~3,700 lines covering DAO lifecycle, staked voting, phased escrow, multi-sig yield, member governance, the beacon-proxy factory and its timelock/veto upgrade controller, plus the backend transaction-policy layer that gates every Circle signing request. Pre-audit hardening is already done — 86 tests including fuzzed invariants (claimed yield never exceeds deposited; escrow release never exceeds funded), a malicious-ERC20 reentrancy test, and multi-sig edge cases. This audit is the *only* thing between the codebase and a mainnet communities can put real money into.

### Launch — $9,600
- **Mainnet deployment + initial seeding — $2,000.** Factory, implementation, beacon + controller, governor; first three pilot DAOs; contingency for post-audit redeployment.
- **12 months infrastructure — $3,600.** Vercel Pro, Supabase Pro, Pinata IPFS, RabbitMQ, domain/SSL (~$2,400/yr) plus scaling headroom through Q4 2026.
- **Facilitation of 3 pilot DAOs — $4,000.** Two in-person sessions each (onboarding + first vote), printed materials, transport, and support through one full investment cycle. ~$1,300/DAO. These aren't placeholders — they're the case studies every future onboarding is built on.

### Growth — $17,400
- **Mobile app store launch — $3,000.** Apple + Google registration, QA across the low-end Android devices target users actually carry, submission, and OS-update maintenance. The most important surface for a market where many users never open a laptop.
- **Localization — $2,400.** Professional translation and layout adaptation for Portuguese, Hausa, and Swahili across all views and system messages — covering Nigeria, Kenya, and Brazil.
- **Developer stipend — $12,000**, released in $2,000 increments against shipped deliverables: audit remediation, pilot onboarding, mobile submission, localization, CCTP groundwork. Solo build; this keeps the protocol maintained and accountable to work shipped, not time elapsed.

---

## Roadmap

**Q3 2026 — Audit & mainnet.** Complete the audit (contracts + backend policy layer), remediate, deploy the post-audit stack to Arc Mainnet, submit the mobile app, onboard the three pilot DAOs, Gas Station live on mainnet.

**Q4 2026 — Growth.** Mobile PWA optimization; Portuguese / Hausa / Swahili / French; open public DAO creation with guided onboarding; live subgraph analytics dashboard; CCTP for cross-chain USDC deposits (pulled forward — diaspora deposits from the UK/US are one of the strongest usage stories).

**Q1 2027 — Scale & decentralize.** IPFS-hosted DApp with an ENS domain; cross-DAO federation layer; licensed Naira on/off-ramp partner for the feature-phone tier; open-source SDK for third-party tooling.

---

## Why this matters

CivicVault is not a yield aggregator or a token play. It is **infrastructure for real communities making real decisions about real money**, and nothing purpose-built for this exists in Web3 today — not for savings groups, not for neighborhood cooperatives, not for PTA funds, not for diaspora pools.

The hard part is done. Three client surfaces, audit-ready contracts with member governance that closes the last centralization gap, a non-custodial wallet layer, a live subgraph, a pilot DAO on-chain. The last mile is an audit and three communities to prove it in the field.

Fund that mile, and a street never has to just accept the dark again.

---
---

# Technical Reference

## Smart contracts (Solidity ^0.8.20 · Foundry · OpenZeppelin)

| Contract | Role |
|---|---|
| `CivicVaultFactory` | Beacon-proxy factory + the shared `UpgradeableBeacon`; one deploy creates unlimited DAO proxies. Holds the protocol-fee config (treasury + rate, `Ownable`-set, hard-capped in code). |
| `CivicVaultBeaconController` | Owns the beacon. Every implementation upgrade goes through a 2-day timelock and can be vetoed by DAOs holding ≥ 30% of total value-locked. Veto weight accrues as vetoes arrive and total TVL is snapshotted at propose time, so `executeUpgrade` is O(1) and cannot be gas-bricked as DAO count grows. `withdrawVeto` lets a DAO reverse course. |
| `CivicVault` | Per-DAO logic: members, KYC, investments, staked voting, phased escrow, yield multi-sig, proportional claim, stake-weight accounting, and one `govApply` hook the governor calls after a passed vote. |
| `CivicVaultGovernor` | Member-initiated governance singleton, keyed by DAO address. Proposal types: remove / reinstate admin, freeze / unfreeze a release, quorum clawback. Pass rule snapshotted at open; participation quorum + turnout floor; escalating repeat-freeze bar + cooldown; per-proposer cooldown; voter stake locked until close; superseded-proposal tombstoning. |
| `CivicVaultView` | Gas-free batched read helpers for the frontend (incl. governance power, clawback-reclaimable). |
| `YieldCalculator` · `InvestmentManager` · `StringUtils` | Libraries: overflow-safe proportional yield math; activation / deadline-extension / phase gating; on-chain formatting for the activity log. |
| `ICivicVault` | Interface + shared structs. |

### Deployed on Arc Testnet (block 60010770)

| Contract | Address |
|---|---|
| CivicVaultFactory | `0x58Ff8ca3b9863e535845f58D5d7AA90B33fE635F` |
| CivicVault Implementation | `0x5d013b69f4a63c8D46E6AA3a9A89CDE424470dc4` |
| UpgradeableBeacon | `0x6c0ab09079659FAcE1108017eb67b05d1e2a9336` |
| CivicVaultBeaconController | `0x867Fa51A70F87E3CCDC2193079C2b3281350A012` |
| CivicVaultView | `0x4fdd011eCe547ddc148DA1316A7b979aA2cD6212` |
| CivicVaultGovernor | `0x1cE8328E08a4c93A37e5e03115BAdE0373b97310` |
| Seed DAO | `0x7dD25bAa8f0109beDA1C79A328ae699D5F08D198` |
| USDC (Arc native) | `0x3600000000000000000000000000000000000000` |

### Security patterns

`ReentrancyGuard` on every ERC-20 transfer path · CEI ordering throughout · `Pausable` creator-only emergency stop · `SafeERC20` for all USDC · `Initializable` against proxy re-init · 40+ typed custom errors · 3-of-N multi-sig on yield execution · stake-weighted, sybil-resistant governance with a pass rule snapshotted at proposal open · banned-admin re-appointment guard · protocol fee taken from realized yield only, hard-capped at 5%, treasury fixed at DAO creation · 90-day configurable grace period before unclaimed yield can be swept · beacon upgrades behind a timelock + TVL-weighted DAO veto.

`forge coverage` cannot emit a percentage — it hits a stack-too-deep compiler error on a codebase this size even under `--ir-minimum`, a known Foundry limitation, not a gap hidden behind test count. Coverage is demonstrated by the 86-test suite and its fuzzed invariants.

## Clients

**Web (live)** — React 19 · TypeScript · Vite 6 · Tailwind 4 · Wagmi/Viem. 12 views: Landing, Dashboard, Create DAO, Discover, Investments, Voting, **Governance**, KYC, Yields, Wallet, Messages, Profile. `civic-vault-aupu.vercel.app`.

**Mobile (complete)** — React Native · Expo. Full protocol access, mobile-first, low-bandwidth. Pending iOS/Android submission.

**DApp (roadmap)** — IPFS-hosted, ENS domain, no backend dependency — direct on-chain interaction for markets with infrastructure instability.

## Backend (Node · Express 5 · Prisma)

| Route | Role |
|---|---|
| `/api/auth` | Privy `verifyAuthToken` on every mutating route; caller derived from the token, never from the request body. |
| `/api/wallet` | Circle user-controlled wallet orchestration — builds calldata, returns a device challenge, polls status. Every request passes a transaction policy (target must be a factory-verified DAO, checked on-chain; only `vote` / `claimYield` / `withdrawStake` / capped `approve` / governance calls; never a raw transfer) and is written to an audit log with anomaly alerts. Backend holds no signing share. |
| `/api/ussd` | Africa's Talking USSD callback — a menu state machine (balance, communities, vote, governance) + facilitator enrolment. Sensitive actions run as background transactions, confirmed by SMS. |
| `/api/fiat` | Naira ⇄ USDC display rate + quotes. |
| `/api/chat` · `/api/notifications` | Real-time DAO chat subscriptions + webhook fan-out; in-app notification store. |
| RabbitMQ workers | Async chat-dispatch and email-delivery consumers with retries and a DLQ. |

## Circle integration

| Product | Status | Use |
|---|---|---|
| Arc | ✅ | Sole deployment chain. |
| USDC | ✅ | Native gas + settlement across all staking, escrow, voting, yield. |
| Circle User-Controlled Wallets | ✅ | Auto-provisioned ERC-4337 smart account on email/Google sign-in; MPC-split key; backend holds no share. |
| Circle Gas Station | ✅ | Sponsors gas for every member action. |
| CCTP | Q4 2026 | Multi-chain USDC deposits from Base / Ethereum / Solana into DAO treasuries. |
| Licensed Naira on/off-ramp partner | Q4 2026 – Q1 2027 | Mobile-money ⇄ USDC for the feature-phone tier. |

## Storage & analytics

IPFS (Pinata) for DAO logos, avatars, proposal documents, chat images · Supabase Realtime for chat persistence · a custom subgraph indexing all DAOs, members, TVL, investments, votes, yield flows, and governance proposals in real time.

## Founder

Self-taught developer based in Lagos, trained across multiple bootcamps, several years shipping production software, mostly solo. Prior shipped work: **ARESprotocol**, **BID-IT** (a student marketplace), **Socrates** (a real-time vulnerability-scanning browser extension). Solo doesn't mean unproven — it means a track record of taking an idea from nothing to something people use, now pointed at the problem I grew up inside.

## Links

- Web app — https://civic-vault-aupu.vercel.app
- Demo video — https://youtu.be/mkdc0uo4waQ
- GitHub — https://github.com/Jaydbrown/CivicVault
- Subgraph — https://thegraph.com/studio/subgraph/civicvault
- X — https://x.com/CivicVaultDAO
- Explorer — https://testnet.arcscan.app

## Contact

**jaiyeolawety705@gmail.com** · CivicVault · Arc Network (Circle) · @CivicVaultDAO
