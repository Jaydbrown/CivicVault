import React from "react";

const faqs = [
  {
    q: "How does voting power work in CivicVault?",
    a: "Members signal support by staking USDC on proposals. More stake carries more voting weight, and all voting actions are recorded on-chain. Downvotes cost nothing but cannot add stake.",
  },
  {
    q: "Who can create and manage project proposals?",
    a: "Admins create proposals and set the funding target, deadline, grade, and supporting documents. This keeps proposals structured and prevents spam.",
  },
  {
    q: "How are returns shared with members?",
    a: "Finance managers propose a yield deposit, which requires 3-of-5 admin approvals before it executes. Once deposited, each upvoting member claims their proportional share based on their recorded stake.",
  },
  {
    q: "Do I need to connect a wallet to use the app?",
    a: "You can browse public DAO listings without a wallet. To vote, stake, or claim yield you need a connected wallet and a verified KYC status granted by your DAO admin.",
  },
  {
    q: "What blockchain does CivicVault run on?",
    a: "CivicVault is deployed on Circle's Arc network — an EVM-compatible L1 where USDC is the native currency. This means every stake and yield payout settles in stablecoins with no gas-token volatility.",
  },
  {
    q: "What happens if a proposal doesn't reach its funding target?",
    a: "If a proposal fails to meet its funding target by the deadline, an admin can mark it Incomplete. Upvoting members can then withdraw their staked USDC in full.",
  },
  {
    q: "How are funds released to investment recipients?",
    a: "Active investments use a 3-phase escrow: 30% released at milestone 1, 40% at milestone 2, and the final 30% at completion. Admins release each phase separately, keeping recipients accountable.",
  },
];

const Faqs: React.FC = () => {
  return (
    <section id="faqs" className="py-24 lg:py-28 bg-gradient-to-b from-white to-slate-50/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">FAQs</h2>
          <p className="mt-3 text-muted-foreground">
            Quick answers to common questions about governance, voting, and returns.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group bg-card backdrop-blur-md rounded-2xl border border-border px-5 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
            >
              <summary className="cursor-pointer list-none font-semibold text-foreground flex items-start justify-between gap-4">
                <span>{item.q}</span>
                <span className="text-muted-foreground group-open:rotate-45 transition-transform shrink-0">+</span>
              </summary>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Faqs;
