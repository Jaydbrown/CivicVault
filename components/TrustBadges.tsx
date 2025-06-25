
import React from 'react';
import { Shield, CircleDollarSign, Lock, Zap } from 'lucide-react';

const Badge = ({ icon: Icon, text }: { icon: any, text: string }) => (
  <div className="flex items-center gap-3 px-6 py-4 bg-white rounded-2xl border border-slate-200 shadow-[0_8px_22px_rgba(15,23,42,0.05)] hover:border-emerald-200 transition-all">
    <div className="p-2.5 bg-green-50 rounded-lg">
      <Icon className="w-5 h-5 sage-text" />
    </div>
    <span className="text-sm font-semibold text-slate-700 tracking-tight whitespace-nowrap">{text}</span>
  </div>
);

const TrustBadges: React.FC = () => {
  return (
    <section className="py-14 bg-[#0e1117] border-y border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center items-center gap-4 lg:gap-10">
          <Badge icon={Shield} text="Role-Based Security" />
          <Badge icon={CircleDollarSign} text="USDC-Native on Arc" />
          <Badge icon={Lock} text="On-Chain Contract Logic" />
          <Badge icon={Zap} text="Multi-Sig Yield Approval" />
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
