import React from "react";
import FaqAccordion from "../Faqs";

const FAQS = [
  {
    question: "How do I know my funds are safe?",
    answer:
      "All CivicVault pools are built on audited smart contracts. Your funds remain in your custody until you explicitly vote to deploy them, and even then, they are held in a multi-sig vault controlled by the DAO. We never hold your keys or your crypto.",
  },
  {
    question: "Do I need crypto experience to join?",
    answer:
      "Not at all. While CivicVault runs on blockchain technology for transparency and security, our interface is designed for everyone. You can fund your wallet using standard payment methods and participate without needing to understand the underlying tech.",
  },
  {
    question: "How are returns distributed?",
    answer:
      "When a community-funded project generates revenue, it is deposited back into the DAO's smart contract. The contract automatically distributes the returns to all participating members proportional to their initial stake in USDC.",
  },
  {
    question: "Can I withdraw my stake at any time?",
    answer:
      "If you have deposited funds into the DAO but haven't committed them to an active project, you can withdraw at any time. Once funds are deployed to a project, they are locked according to the terms of that specific project's smart contract.",
  },
  {
    question: "Who decides which projects get funded?",
    answer:
      "You do. Every verified resident in a neighborhood DAO has voting rights. Proposals are submitted by community members, and funding is only released when a proposal reaches the required voting threshold set by the DAO.",
  },
];

const FaqSection: React.FC = () => {
  return (
    <section className="w-full min-h-screen bg-[#c2c0bb] flex flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-3xl mx-auto">
        <p className="text-center text-emerald-600 text-[11px] font-bold uppercase tracking-[0.2em] mb-4">
          Got questions?
        </p>
        <h2 className="text-center text-3xl sm:text-4xl font-extrabold text-neutral-900 mb-14 tracking-tight">
          Frequently asked questions
        </h2>
        <FaqAccordion items={FAQS} title="" className="py-0" />
      </div>
    </section>
  );
};

export default FaqSection;
