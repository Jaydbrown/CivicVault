import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const STEPS = [
  {
    title: 'Connect Wallet',
    description: 'Sign in with your crypto wallet. No complex KYC, just web3 native access.',
    number: '01'
  },
  {
    title: 'Join a DAO',
    description: 'Find your local neighborhood DAO and deposit USDC to become a voting member.',
    number: '02'
  },
  {
    title: 'Vote on Projects',
    description: 'Review community proposals and vote with your staked USDC on-chain.',
    number: '03'
  },
  {
    title: 'Earn Yield',
    description: 'When projects succeed, smart contracts automatically distribute your share of the returns.',
    number: '04'
  }
];

const JourneyTimeline: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  // Animate the SVG line drawing based on scroll
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section ref={containerRef} className="py-32 bg-transparent relative backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            How it works
          </h2>
          <p className="text-white/60 text-lg">Four simple steps to community wealth.</p>
        </div>

        <div className="relative">
          {/* Connecting Line (Background) */}
          <div className="absolute left-[39px] md:left-[50%] top-0 bottom-0 w-[2px] bg-white/10 md:-translate-x-[1px]" />
          
          {/* Connecting Line (Animated Foreground SVG) */}
          <svg className="absolute left-[39px] md:left-[50%] top-0 h-full w-[4px] md:-translate-x-[2px] overflow-visible z-0">
            <motion.line
              x1="2"
              y1="0"
              x2="2"
              y2="100%"
              stroke="#10b981" // emerald-500
              strokeWidth="4"
              strokeLinecap="round"
              style={{ pathLength }}
            />
          </svg>

          {/* Steps */}
          <div className="space-y-24 relative z-10">
            {STEPS.map((step, index) => {
              const isEven = index % 2 === 0;
              return (
                <div key={step.number} className={`flex flex-col md:flex-row items-center ${isEven ? 'md:flex-row-reverse' : ''}`}>
                  
                  {/* Content */}
                  <motion.div 
                    initial={{ opacity: 0, x: isEven ? 50 : -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.7, type: 'spring' }}
                    className={`w-full md:w-1/2 pl-20 md:pl-0 ${isEven ? 'md:text-left md:pl-16' : 'md:text-right md:pr-16'}`}
                  >
                    <h3 className="text-3xl font-bold text-white mb-4">{step.title}</h3>
                    <p className="text-white/60 text-lg leading-relaxed">{step.description}</p>
                  </motion.div>

                  {/* Node */}
                  <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-20 h-20 bg-black border-4 border-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <span className="text-xl font-bold text-emerald-400">{step.number}</span>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};

export default JourneyTimeline;
