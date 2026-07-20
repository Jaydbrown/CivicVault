import React, { useMemo, useRef, useState } from "react";
import { UserPlus, Wallet, Vote, Gift, type LucideIcon } from "lucide-react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const segmentFill = (progress: number, segmentIndex: number, segmentCount: number) => {
  const scaled = progress * segmentCount - segmentIndex;
  return clamp01(scaled);
};

const segmentOpacity = (fill: number) => {
  if (fill < 0.85) return 1;
  return clamp01(1 - (fill - 0.85) / 0.15);
};

const steps: Array<{
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Community DAO",
    description:
      "A founder starts a community DAO and sets location, member limits, and project focus.",
  },
  {
    number: "02",
    icon: Wallet,
    title: "Add Team & Members",
    description:
      "Founders assign admins and finance leads. Members are invited and verified for participation.",
  },
  {
    number: "03",
    icon: Vote,
    title: "List and Vote on Projects",
    description:
      "Admins list proposals. Members vote with transparent on-chain participation and clear outcomes.",
  },
  {
    number: "04",
    icon: Gift,
    title: "Share Returns",
    description:
      "Finance leads deposit returns and members claim earnings according to their support and voting.",
  },
];

const HowItWorks: React.FC<{ onLaunch: () => void }> = ({ onLaunch }) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 70%", "end 35%"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setScrollProgress(latest);
  });

  const segmentCount = steps.length - 1;
  const activeStep = Math.min(segmentCount, Math.floor(scrollProgress * segmentCount + 0.4));
  const progressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const segmentFills = useMemo(
    () => Array.from({ length: segmentCount }, (_, index) => segmentFill(scrollProgress, index, segmentCount)),
    [scrollProgress, segmentCount],
  );

  return (
    <section id="how-it-works" ref={sectionRef} className="py-24 bg-card backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A simple flow for setting up a community and funding local projects.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-10 lg:gap-12 items-start">
          <div className="relative">
            <motion.div
              style={{ width: progressWidth }}
              className="absolute left-6 top-8 h-[2px] bg-primary/20 lg:hidden"
            />
            <div className="space-y-8 lg:space-y-10">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index <= activeStep;
                const fill = index < segmentCount ? segmentFills[index] : 0;

                return (
                  <div key={step.number} className="relative">
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: false, margin: "-20% 0px -20% 0px" }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className={`relative rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${
                        isActive
                          ? "bg-card backdrop-blur-md border-primary/40 shadow-lg shadow-[#1a4731]/10"
                          : "bg-card backdrop-blur-md/70 border-border"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`relative w-12 h-12 rounded-xl border flex items-center justify-center transition-colors ${
                            isActive
                              ? "bg-primary text-white border-primary"
                              : "bg-white/5 text-muted-foreground border-border"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                            {step.number}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-foreground">{step.title}</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed mt-2">{step.description}</p>
                        </div>
                      </div>
                    </motion.div>

                    {index < segmentCount && (
                      <div className="relative h-10 lg:h-12 flex items-center pl-6">
                        <div className="h-[2px] w-24 sm:w-28 lg:w-32 bg-slate-200" />
                        <motion.div
                          style={{ width: `${fill * 100}%`, opacity: segmentOpacity(fill) }}
                          className="absolute left-6 h-[2px] bg-primary"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:sticky lg:top-28">
            <div className="rounded-3xl overflow-hidden border border-border shadow-xl shadow-slate-900/10 bg-white/5">
              {/* Community investment illustration */}
              <svg viewBox="0 0 480 360" xmlns="http://www.w3.org/2000/svg" className="w-full">
                <rect width="480" height="360" fill="#f8fafc"/>

                {/* Ground */}
                <ellipse cx="240" cy="310" rx="200" ry="18" fill="#e8f5ec" opacity="0.7"/>

                {/* Central tree / vault icon */}
                <rect x="226" y="260" width="28" height="50" rx="4" fill="#2d7a4f"/>
                <path d="M240 270 C210 270 185 248 192 224 C199 200 240 210 240 240 C240 210 281 200 288 224 C295 248 270 270 240 270Z" fill="#1a4731"/>
                <path d="M240 252 C225 252 212 241 216 228 C220 215 240 222 240 240" fill="#2d7a4f"/>
                <path d="M240 252 C255 252 268 241 264 228 C260 215 240 222 240 240" fill="#5cb87a" opacity="0.7"/>

                {/* DAO circle nodes */}
                {/* Node 1 - top left */}
                <circle cx="100" cy="130" r="36" fill="#1a4731" opacity="0.08"/>
                <circle cx="100" cy="130" r="28" fill="white" stroke="#2d7a4f" strokeWidth="2"/>
                <rect x="88" y="118" width="24" height="20" rx="3" fill="#2d7a4f" opacity="0.2"/>
                <rect x="91" y="141" width="18" height="3" rx="1.5" fill="#2d7a4f" opacity="0.4"/>
                <path d="M94 122 L100 116 L106 122" fill="none" stroke="#1a4731" strokeWidth="2" strokeLinecap="round"/>
                <rect x="96" y="122" width="8" height="16" rx="1" fill="#1a4731" opacity="0.6"/>
                <text x="100" y="178" textAnchor="middle" fill="#2d7a4f" fontSize="10" fontWeight="600">DAO Alpha</text>

                {/* Node 2 - top right */}
                <circle cx="380" cy="130" r="36" fill="#1a4731" opacity="0.08"/>
                <circle cx="380" cy="130" r="28" fill="white" stroke="#2d7a4f" strokeWidth="2"/>
                <path d="M370 122 L380 114 L390 122 L390 138 L370 138Z" fill="#1a4731" opacity="0.2" stroke="#1a4731" strokeWidth="1.5"/>
                <circle cx="380" cy="130" r="6" fill="#2d7a4f"/>
                <text x="380" y="178" textAnchor="middle" fill="#2d7a4f" fontSize="10" fontWeight="600">DAO Beta</text>

                {/* Node 3 - bottom left */}
                <circle cx="100" cy="268" r="36" fill="#1a4731" opacity="0.08"/>
                <circle cx="100" cy="268" r="28" fill="white" stroke="#2d7a4f" strokeWidth="2"/>
                <circle cx="88" cy="260" r="5" fill="#5cb87a"/>
                <circle cx="100" cy="255" r="5" fill="#2d7a4f"/>
                <circle cx="112" cy="260" r="5" fill="#5cb87a"/>
                <circle cx="94" cy="272" r="5" fill="#2d7a4f"/>
                <circle cx="106" cy="272" r="5" fill="#5cb87a"/>
                <text x="100" y="308" textAnchor="middle" fill="#2d7a4f" fontSize="10" fontWeight="600">DAO Gamma</text>

                {/* Node 4 - bottom right */}
                <circle cx="380" cy="268" r="36" fill="#1a4731" opacity="0.08"/>
                <circle cx="380" cy="268" r="28" fill="white" stroke="#2d7a4f" strokeWidth="2"/>
                <text x="380" y="264" textAnchor="middle" fill="#1a4731" fontSize="14" fontWeight="700">$</text>
                <text x="380" y="280" textAnchor="middle" fill="#2d7a4f" fontSize="9">USDC</text>
                <text x="380" y="308" textAnchor="middle" fill="#2d7a4f" fontSize="10" fontWeight="600">Yield Pool</text>

                {/* Connecting lines — dashed */}
                <line x1="128" y1="145" x2="210" y2="220" stroke="#2d7a4f" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.4"/>
                <line x1="352" y1="145" x2="268" y2="220" stroke="#2d7a4f" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.4"/>
                <line x1="128" y1="255" x2="210" y2="265" stroke="#2d7a4f" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.4"/>
                <line x1="352" y1="255" x2="268" y2="265" stroke="#2d7a4f" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.4"/>

                {/* Flow arrows on lines */}
                <circle cx="170" cy="182" r="5" fill="#5cb87a" opacity="0.7"/>
                <circle cx="310" cy="182" r="5" fill="#5cb87a" opacity="0.7"/>
                <circle cx="168" cy="260" r="5" fill="#5cb87a" opacity="0.7"/>
                <circle cx="312" cy="260" r="5" fill="#5cb87a" opacity="0.7"/>

                {/* Vote/stake icons floating */}
                <rect x="195" y="130" width="90" height="32" rx="16" fill="#1a4731" opacity="0.06"/>
                <text x="240" y="151" textAnchor="middle" fill="#1a4731" fontSize="11" fontWeight="600" opacity="0.7">Stake · Vote · Earn</text>
              </svg>

              <div className="px-6 py-5 border-t border-green-100">
                <p className="text-sm font-semibold text-primary">Your community, on-chain</p>
                <p className="text-xs text-muted-foreground mt-1">
                  DAOs connect members, votes fund projects, and every yield payout settles transparently in USDC.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 text-center">
          <button
            onClick={onLaunch}
            className="bg-primary text-white px-10 py-4 rounded-xl font-bold hover:shadow-xl transition-shadow"
          >
            Get Started Now
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
