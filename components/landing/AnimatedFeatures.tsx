import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Users, TrendingUp, Coins } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 50 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
};

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <motion.article 
    variants={itemVariants}
    whileHover={{ y: -10 }}
    className="relative overflow-hidden bg-[#111] backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl transition-all"
  >
    <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-emerald-500/20 blur-2xl" />
    <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20 relative z-10">
      <Icon className="text-emerald-400 w-7 h-7" />
    </div>
    <h3 className="text-xl font-bold text-white mb-3 relative z-10">{title}</h3>
    <p className="text-white/60 leading-relaxed relative z-10">{description}</p>
  </motion.article>
);

const AnimatedFeatures: React.FC = () => {
  return (
    <section className="py-32 bg-transparent relative overflow-hidden backdrop-blur-sm">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-emerald-500 font-bold tracking-widest uppercase text-sm mb-4"
          >
            Built for Real Communities
          </motion.p>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold text-white tracking-tight"
          >
            Everything you need <br/> to run a DAO.
          </motion.h2>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
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
            title="USDC-Native"
            description="Built on Circle's network — every stake, vote, and yield payout settles in USDC with no price volatility risk."
          />
        </motion.div>
      </div>
    </section>
  );
};

export default AnimatedFeatures;
