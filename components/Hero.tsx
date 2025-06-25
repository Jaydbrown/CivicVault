import React from "react";
import { ArrowRight, PlayCircle } from "lucide-react";

const Hero: React.FC<{ onLaunch: () => void; isAuthenticated?: boolean }> = ({
  onLaunch,
  isAuthenticated = false,
}) => {
  const launchLabel = isAuthenticated ? "Open Dashboard" : "Launch App";
  return (
    <section
      className="relative pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-32 overflow-x-clip overflow-y-visible"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1400&q=80&v=3')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Forest green tinted overlay so text stays readable */}
      <div className="absolute inset-0 bg-[#0d2b1a]/65" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center gap-8 sm:gap-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            Live on Arc Testnet
          </div>

          <h1 className="text-[1.875rem] min-[375px]:text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-5 sm:mb-6 hyphens-auto drop-shadow-lg">
            Invest in Your Neighborhood,{" "}
            <span className="text-emerald-400">Together</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-200 mb-8 max-w-2xl mx-auto leading-relaxed">
            Communities create local investment groups, add members, vote on
            projects with USDC, and share returns transparently.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              onClick={onLaunch}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 hover:translate-y-[-2px] transition-all shadow-lg shadow-emerald-900/40 active:translate-y-0"
            >
              {launchLabel}
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="https://youtu.be/TtE1mm7DtrA"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 border border-white/30 text-white backdrop-blur-sm px-8 py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors active:bg-white/25"
            >
              <PlayCircle className="w-5 h-5" />
              Learn How It Works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
