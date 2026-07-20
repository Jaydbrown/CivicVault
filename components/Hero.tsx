import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const Hero: React.FC<{ onLaunch: () => void; isAuthenticated?: boolean }> = ({
  onLaunch,
  isAuthenticated = false,
}) => {
  const launchLabel = isAuthenticated ? "Open Dashboard" : "Launch App";

  return (
    <>
      {/* ── Screen 1: Hero (Normal Flow) ───────── */}
      <section className="relative w-full min-h-screen overflow-hidden bg-transparent flex flex-col justify-center">
        {/* Background Image */}
        <div className="absolute inset-0 w-full h-full opacity-40">
          <img
            src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1920&q=80"
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute inset-0 bg-black/40 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 w-full flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-24 pb-12">
          {/* Heading */}
          <motion.h1
            initial={{ opacity: 1, y: 30 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="font-display text-5xl sm:text-7xl lg:text-8xl xl:text-[9rem] font-bold text-white leading-[0.9] max-w-6xl mb-6 tracking-tighter"
          >
            We create<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
              Awesome
            </span><br/>
            Governance
          </motion.h1>

          {/* CTAs */}
          <motion.div 
            initial={{ opacity: 1, y: 30 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 mt-8"
          >
            <button
              onClick={onLaunch}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-5 rounded-full text-lg font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20"
            >
              {launchLabel}
              <ArrowRight className="w-6 h-6" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Marquee Section */}
      <section className="bg-primary text-primary-foreground py-6 overflow-hidden flex whitespace-nowrap">
        <motion.div 
          className="flex whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ ease: "linear", duration: 15, repeat: Infinity }}
        >
          {Array(8).fill("COMMUNITY GOVERNED • TRANSPARENT • ON-CHAIN YIELDS • ").map((text, i) => (
            <span key={i} className="font-display text-3xl md:text-4xl font-bold mx-4 uppercase tracking-widest shrink-0">
              {text}
            </span>
          ))}
        </motion.div>
      </section>
    </>
  );
};

export default Hero;
