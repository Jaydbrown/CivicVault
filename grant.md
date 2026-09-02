# CivicVault

**Programmable USDC treasury infrastructure for member-owned communities.**

Built on Circle's Arc Network · Live on Arc Testnet · Requesting $42,000 to secure and launch.

Circle's grant RFP names *treasury management — stablecoin-powered treasury products with embedded wallets, transfers, compliance tooling, and programmable liquidity* as a focus use case. That is CivicVault, exactly, aimed at the smallest and most underserved treasuries there are: the ones communities run themselves, today with a notebook and one person's bank account.

---

## The story this is built on

My street's transformer burned out. Everyone knew the power company wasn't coming, so we did what streets here always do: someone went door to door, every household gave what it could, and one trusted person held the money. Weeks passed. The transformer never came. The money was gone. Nobody could prove what happened to it, because nothing was ever written down anywhere that couldn't be quietly rewritten or quietly forgotten.

The street stayed dark. Whoever collected the money moved on. And everyone accepted it, because that's just how it works.

I watched that exact pattern repeat — different street, different collection, same ending — enough times to stop believing it was bad luck. It's not the transformer. It's the school levy every parent pays with no report. The class project that stalls halfway. The borehole fund that disappears from conversation the day it's collected. Every time people pool money by hand, the only thing between "invested in something real" and "gone" is one person's word.

**CivicVault removes the word.**

---

## What it is

CivicVault gives a community — a neighborhood association, a PTA, a cooperative, a union, a diaspora club — a programmable USDC treasury it governs by rule instead of by trust, deployed in one transaction.

- **Embedded wallets.** Members sign in with email or Google and get a non-custodial Circle smart-account wallet. No seed phrase, no gas token, no app to leave.
- **Controlled transfers.** Contributions land in the treasury contract, not a person's account. Disbursements to a project or vendor are milestone-gated (30 / 40 / 30%) and need multi-party authorization — no one moves funds alone or out of order.
- **Compliance tooling.** Members are KYC-verified as on-chain hash commitments (no personal data on-chain). Every backend-initiated transfer clears a transaction-policy allowlist and lands in an audit log. Institutions can export the full ledger.
- **Programmable liquidity.** Funds can be allocated to a local project and the escrow released against progress; members can vote to freeze a release or claw back what hasn't been spent; unclaimed returns are swept after a configurable grace period. When an allocation produces a return, the contract distributes it to contributors automatically, to the cent, in proportion to what each committed.

No treasurer holding the account. No chairman who can skip a phase. No contributor who quietly loses their claim. Every movement is on a public ledger that no admin can edit.

---

## This is not a concept. It's deployed.

| | |
|---|---|
| **Smart contracts** | 8 contracts, ~3,700 lines of Solidity. **89 Foundry tests passing** — full lifecycle, fuzzed treasury invariants, a malicious-token reentrancy test, multi-sig edge cases, a 17-test member-governance suite, an 11-test upgrade-safety suite. |
| **Live on Arc Testnet** | Factory, upgradeable beacon + timelock controller, member-governance contract, view layer, and a seed DAO — all deployed and verified at block 60010770. This stack replaced an earlier clone-based deployment when member governance and beacon upgradeability landed; the pilot cohort that had signed on is being re-onboarded onto it. Addresses in the reference section. |
| **Web app** | React 19, 12 views covering every action from treasury creation to disbursement, governance, and returns. Live at `civic-vault-aupu.vercel.app`. |
| **Mobile app** | React Native / Expo, feature-complete, pending store submission. |
| **Feature-phone access** | USSD (`*123#`) menu — balance, vote, governance — built end to end, including a PIN-authorised custodial signer with a hard balance cap and SMS confirmations. |
| **Backend** | Privy-authenticated Express API. Every Circle signing request passes an on-chain-verified transaction policy and lands in an audit log. Real-time chat, email notifications, a live subgraph. |

The single thing standing between this codebase and a mainnet communities can trust is a professional security audit. **That's what this grant is for.**

---

## The problem, at scale

Every one of these groups is running a treasury — they just don't call it that, and they run it with a notebook. Rotating savings groups — chamas, susus, ajo, esusu, tontines, arisan — move **well over $100 billion a year**, almost entirely through WhatsApp threads, spreadsheets, and one person's bank account. Sub-Saharan Africa alone has 40M+ chama members. Add PTA development funds, community development associations, student union budgets, and diaspora investment clubs, and you have an enormous, entirely offline market whose defining failure mode is *money pooled by a group with no enforceable record of where it went.*

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
3. **Admins propose a treasury allocation** — a transformer, a classroom block, working capital for a member co-op, a market stall — each with an amount, deadline, risk grade, and IPFS-linked documents.
4. **Members authorize it by committing USDC behind it.** A commit moves real capital into escrow and sets that member's governance weight; a free "no" carries no weight — no veto without exposure.
5. **On reaching the amount, funds escrow and disburse in three phases** (30% / 40% / 30%), enforced in sequence by an on-chain counter. An admin *cannot* release phase 2 before phase 1 — but sequencing is not verification, and a colluding admin could still walk all three tranches to a vendor who builds nothing. That is exactly what member governance is for: any member who sees no progress can open a proposal to **freeze the release**, and if the money is already gone dark, to **claw back every unreleased tranche** pro-rata to the people who funded it. The admin controls the schedule; the members control whether the money keeps moving.
6. **Returns flow back into the treasury under 3-of-N approval** — and the money must actually be in the depositor's wallet at execution, not promised. No ghost entries.
7. **Contributors receive their exact pro-rata share** of any return, whenever they want. The contract doesn't do favoritism and never forgets the smallest contributor.
8. **Members — not the creator — hold ultimate control.** Stake-weighted member votes can evict an admin (and bar the creator from re-appointing them), freeze a suspicious release, or claw back an allocation's unspent funds pro-rata to its backers.

That last point is the one most protocols get wrong, so it's worth being explicit.

---

## Why it can't be captured

**Staked voting.** Votes are weighted by USDC actually committed to the DAO. A creator can add a hundred fake member addresses for free — but giving them voting power means funding them with real capital that then sits in escrow, at risk, claimable pro-rata by everyone else. To control the outcome you must control the at-risk money. That's the sybil defense: not a CAPTCHA, an economic one.

**Member governance with hardened math.** The pass rule — denominator and thresholds — is snapshotted the moment a proposal opens, so no one can inflate it mid-vote. Admin and clawback votes use a participation quorum with a turnout floor (not an absolute quorum that becomes unreachable as completed-investment stake piles up). Repeat freezes of the same investment face an escalating bar and a cooldown. A voter's stake is locked until the proposal closes, so "vote then withdraw" can't keep the weight. Covered by a dedicated fuzz-tested suite.

**Admins curate, members decide.** Investment proposals are posted by admins, not by any member — a deliberate curation step (diligence, supporting documents, a risk grade) that stops the proposal list from becoming a spam channel. But origination is the *only* thing an admin holds unilaterally. Funding a proposal takes member stake. Each escrow tranche can be frozen by a member vote. Unspent escrow can be clawed back by a member vote. The admin who posted it can be evicted by a member vote, and barred from reinstatement. Curating the menu is not controlling the money.

**Upgradeable without a single point of control.** Every DAO is a beacon proxy — one `upgradeTo` fixes a bug across all of them, no stranded contracts. But the beacon isn't a bare owner key: it's held by a controller that puts every upgrade through a **2-day timelock**, and DAOs holding ≥ 30% of total value-locked can **veto** it. The upgrade path exists; it is not a lever one person can pull over everyone's funds.

**Phased, multi-sig money movement.** No admin releases out of order. No finance manager moves yield alone. No disbursement happens without 3 separate approvals *and* the funds physically present.

**No custodial backend.** The web/mobile tier is fully non-custodial. The feature-phone tier is necessarily custodial (a `*123#` session can't hold a key), but it's bounded: signing is limited by policy to vote / claim / capped-approve — never a transfer-out — with a per-wallet balance cap, full audit logging, and PIN lockout. Disclosed in-product and here.

**Regulatory status.** CivicVault currently operates as a testnet pilot with no live custody of member funds. Before mainnet, the custodial USSD tier and the returns-distribution feature will be reviewed with Nigerian counsel; a legal entity will be incorporated, and the on/off-ramp for the feature-phone tier will run through a licensed partner rather than the protocol. The engineering controls above (policy-scoped signing, balance caps, audit logging) are risk mitigation, not a substitute for that review — and part of what this grant makes possible.

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

The revenue model is a treasury model — it charges for running the treasury, not for the treasury succeeding at investing. Nothing here depends on a community generating a return, which is not something a grant reviewer should be asked to bank on.

**1. Disbursement fee (primary).** A small basis-point fee — target **25–50 bps**, factory-set and hard-capped — skimmed when funds are released from escrow to a project or vendor. Every active treasury generates it; it scales with usage, not with investment outcomes, and it's predictable. It also funds the Circle Gas Station sponsorship pool directly: usage pays for usage. (This is a small addition to `releaseNextPhase` and is in the audit scope below — the contract today implements only the returns fee.)

**2. Institutional tier (recurring).** A flat annual subscription for registered cooperatives, unions, and associations that need branding, compliance ledger exports, named/enterprise signers, higher member caps, and priority support. Predictable recurring revenue, sold to entities that already have a budget line for administration.

**3. One-time deployment fee.** A small fee on treasury creation, waived for the pilot cohort.

**4. Realized-returns fee (secondary).** For treasuries that *do* allocate to yield-bearing projects, the contract skims from **realized returns only** (never principal, never escrow) — hard-capped at 5%, launching at 3%, emitted on-chain. This is upside, not the plan.

Every alternative costs a community far more — a lawyer to structure a vehicle, a joint bank account with fees and no audit trail, or an administrator whose cut dwarfs a fee measured in basis points, with none of the transparency.

---

## The ask: $42,000

CivicVault is a community product, not a typical blockchain product. It is won or lost on exactly two things, and the budget is built around them in equal measure: **the pooled USDC treasury in every DAO must be provably safe**, and **real community groups must actually find it, trust it, and use it.** An audited protocol nobody adopts fails. An adopted protocol that loses a community's money fails worse.

### Security of funds — $17,000
Every DAO holds a live USDC treasury — members' committed deposits plus disbursement escrow — in one contract. That treasury is defended in five independent layers, not one audit:
- **Independent audit — $12,000.** Full-scope engagement (Cyfrin / Halborn / Trail of Bits tier) across the 8 contracts and ~3,700 lines: treasury lifecycle, deposit/commit accounting, phased disbursement escrow, the basis-point disbursement fee (added pre-audit), 3-of-N multi-sig on returns, member governance, the beacon-proxy factory and its timelock/veto upgrade controller, plus the backend transaction-policy layer. Pre-audit hardening is done — 89 tests including fuzzed invariants (distributed returns never exceed deposited; escrow release never exceeds funded), a malicious-ERC20 reentrancy test, multi-sig edge cases.
- **Competitive review — $3,000.** A Code4rena / Cantina contest after primary-audit remediation, focused on the upgradeability and governance surface — the newest, highest-leverage code.
- **Bug bounty — $1,000.** An Immunefi listing plus an initial payout reserve, live from the first mainnet deposit and scaling with TVL.
- **Real-time monitoring — $700 / 12 months.** Alerts on every large withdrawal, admin change, upgrade proposal, freeze, and clawback, routed to the founder and DAO admins, with an automated pause trigger.
- **Signer hardening — $300.** Hardware wallets for the 3-of-N yield signers and the upgrade controller; a Safe for the protocol treasury.

### Marketing & community adoption — $16,000
This is where a community product is won, and it is not a channel a solo technical founder can run alone.
- **Social media & community manager — $6,000.** Six months part-time, running the WhatsApp / Telegram / X channels the target groups actually use — daily presence, weekly transparency updates, answering association chairmen and cooperative leaders in plain language and local languages.
- **Field community organizers — $5,000.** Two to three local organizers doing ground outreach across Lagos and at least one northern and one south-eastern city — association meetings, market unions, PTA gatherings, campus groups. Trust here is built in person.
- **Localized content — $3,000.** Short explainer videos, pilot-DAO testimonials, and a "how your money is protected" series in English, Pidgin, Hausa, Yoruba, and Igbo.
- **Community radio & noticeboards — $2,000.** Paid spots for organizers who aren't online at all.

### Operations & launch — $9,000
- **Mainnet deployment — $2,000.** Full contract set + post-audit redeploy contingency. One beacon `upgradeTo` then propagates fixes to every live DAO — no migration.
- **Post-audit remediation — $2,500.** Capped engineering time to implement audit + contest findings, wire in the monitoring/pause tooling, re-verify the suite.
- **12 months infrastructure — $2,500.** Vercel Pro, Supabase Pro, Pinata IPFS, managed backend + USSD gateway, domain/SSL.
- **Structured pilot-DAO onboarding — $2,000.** In-person onboarding + first-vote facilitation for the three seed DAOs.

Mobile store submission and the rest of the localization work are already scoped and funded through the two pillars above, but deliberately sit behind security in priority.

---

## Roadmap

**Phase 1 (Q3 2026) — Security & mainnet.** Run the five-layer security program (audit → remediation → competitive contest → bug bounty → monitoring). Deploy the post-audit stack to Arc Mainnet. Onboard the three pilot DAOs with in-person facilitation. USDC-native escrow, non-custodial Circle wallets, and Gas Station live on mainnet.

**Phase 2 (Q4 2026) — Nigeria reach.** Ship the React Native app to the App Store and Google Play. Multi-language support — Hausa, Yoruba, Igbo, Nigerian Pidgin — across all 12 views. Take the built USSD feature-phone tier live via a licensed Naira↔USDC on/off-ramp partner. Open public DAO creation with guided onboarding. Publish the on-chain analytics dashboard from the live subgraph.

**Phase 3 (Q1 2027) — Scale, federation & multi-country expansion.** Cross-DAO federation layer for coordinated proposals. First expansion beyond Nigeria — Ghana (*susu*), Kenya (*chama*), and outward — run in parallel with Nigerian growth, not after it. CCTP for cross-chain USDC deposits from Base / Ethereum / Solana into DAO treasuries. Open-source SDK for third-party tooling.

---

## Why this matters

CivicVault is not a yield aggregator or a token play. It is **stablecoin treasury infrastructure for member-owned organizations** — the same embedded wallets, controlled transfers, compliance tooling, and programmable liquidity Circle names as a focus use case, built for the treasuries that have never had any of it: the ones communities run themselves. Nothing purpose-built for this exists in Web3 today — not for savings groups, not for neighborhood cooperatives, not for PTA funds, not for diaspora pools.

The hard part is done. Three client surfaces, audit-ready contracts with member governance that closes the last centralization gap, a non-custodial wallet layer, a live subgraph, a treasury deployed on-chain. The last mile is an audit and three communities to prove it in the field.

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

`forge coverage` cannot emit a percentage — it hits a stack-too-deep compiler error on a codebase this size even under `--ir-minimum`, a known Foundry limitation, not a gap hidden behind test count. Coverage is demonstrated by the 89-test suite and its fuzzed invariants.

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
| USDC | ✅ | Native gas + settlement across treasury deposits, escrow, disbursement, and returns. |
| Circle User-Controlled Wallets | ✅ | Auto-provisioned ERC-4337 smart account on email/Google sign-in; MPC-split key; backend holds no share. |
| Circle Gas Station | ✅ | Sponsors gas for every member action. |
| CCTP | Q1 2027 | Multi-chain USDC deposits from Base / Ethereum / Solana into DAO treasuries. |
| Licensed Naira on/off-ramp partner | Q4 2026 – Q1 2027 | Mobile-money ⇄ USDC for the feature-phone tier. |

## Storage & analytics

IPFS (Pinata) for DAO logos, avatars, proposal documents, chat images · Supabase Realtime for chat persistence · a custom subgraph indexing all DAOs, members, TVL, investments, votes, yield flows, and governance proposals in real time.

## Founder

B.Sc. in Computer Engineering, based in Lagos. Several years shipping production software, mostly solo. Prior shipped work: **ARESprotocol**, **BID-IT** (a student marketplace), **Socrates** (a real-time vulnerability-scanning browser extension). Solo doesn't mean unproven — it means a track record of taking an idea from nothing to something people use, now pointed at the problem I grew up inside.

## Links

- Web app — https://civic-vault-aupu.vercel.app
- Demo video — https://youtu.be/mkdc0uo4waQ
- GitHub — https://github.com/Jaydbrown/CivicVault
- Subgraph (public query endpoint) — https://api.studio.thegraph.com/query/1755424/civicvault/v0.0.2
- X — https://x.com/CivicVaultDAO
- Explorer — https://testnet.arcscan.app

## Contact

**jaiyeolawety705@gmail.com** · CivicVault · Arc Network (Circle) · @CivicVaultDAO
