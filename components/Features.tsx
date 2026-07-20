
import React from 'react';
import { ShieldCheck, Users, TrendingUp, Coins } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <article className="relative overflow-hidden bg-card backdrop-blur-md p-8 rounded-3xl border border-border shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_34px_rgba(15,23,42,0.1)] transition-all">
    <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-green-50/80" />
    <div className="w-12 h-12 sage-bg rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-200 relative z-10">
      <Icon className="text-white w-6 h-6" />
    </div>
    <h3 className="text-xl font-bold text-foreground mb-3 relative z-10">{title}</h3>
    <p className="text-muted-foreground leading-relaxed relative z-10">{description}</p>
  </article>
);

const Features: React.FC = () => {
  return (
    <section className="py-24 lg:py-28 bg-card backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 lg:mb-18">
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl mb-4">
            Built for Real Communities
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Organize local projects, manage roles, and track all funding activity in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={ShieldCheck}
            title="Role-Based Access"
            description="Founders, admins, finance leads, and members each have clear permissions for safe day-to-day operations."
          />
          <FeatureCard
            icon={Users}
            title="Community Voting"
            description="Members can vote on local proposals by staking USDC support or casting a downvote."
          />
          <FeatureCard
            icon={TrendingUp}
            title="Transparent Returns"
            description="When a project earns money, finance leads deposit returns and members claim their share based on participation."
          />
          <FeatureCard
            icon={Coins}
            title="USDC-Native Finance"
            description="Built on Circle's Arc network — every stake, vote, and yield payout settles in USDC with no price volatility risk."
          />
        </div>
      </div>
    </section>
  );
};

export default Features;
