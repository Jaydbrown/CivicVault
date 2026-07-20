import React from "react";
import { motion } from "framer-motion";

const MarqueeSection: React.FC = () => {
  return (
    <section className="py-24 bg-transparent overflow-hidden relative border-y border-white/10 backdrop-blur-md">
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      
      {/* Container for the scrolling text */}
      <div className="relative flex whitespace-nowrap overflow-hidden">
        
        {/* Perfect infinite loop by translating -50% of a container that has duplicated content */}
        <motion.div
          animate={{ x: [0, "-50%"] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 20,
          }}
          className="flex whitespace-nowrap w-max"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="text-7xl md:text-9xl font-display font-black uppercase mx-8 text-transparent tracking-tighter"
              style={{
                WebkitTextStroke: "2px rgba(255, 255, 255, 0.4)",
              }}
            >
              COMMUNITY LED <span className="text-emerald-500/50 mx-4">✦</span> ON-CHAIN WEALTH <span className="text-emerald-500/50 mx-4">✦</span>
            </span>
          ))}
        </motion.div>

      </div>
    </section>
  );
};

export default MarqueeSection;
