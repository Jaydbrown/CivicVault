import { useScroll, useTransform, useSpring, motion } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, PlayCircle } from "lucide-react";
import { TwistingRibbon } from "@/components/ui/twisting-ribbon";
import { CursorCard } from "@/components/ui/cursor-card";
import { HeroParallax } from "@/components/ui/hero-parallax";
import { FaqAccordion, FaqItem } from "@/components/ui/faq-accordion";

const FAQS: FaqItem[] = [
  {
    question: "What is CivicVault?",
    answer: "CivicVault is a decentralized platform where neighborhood residents pool USDC, vote on local investment proposals, and earn shared returns — all governed by smart contracts on Arc Testnet.",
  },
  {
    question: "How do I join a neighborhood DAO?",
    answer: "Connect your wallet, browse active DAOs in the Discover section, and deposit USDC to become a member. Membership grants you voting power proportional to your contribution.",
  },
  {
    question: "How does on-chain voting work?",
    answer: "Every proposal is submitted to the DAO's smart contract. Members cast votes weighted by their stake. Proposals that reach quorum are automatically executed — no intermediaries needed.",
  },
  {
    question: "What happens to my USDC after I invest?",
    answer: "Your USDC is held in a non-custodial smart contract controlled by the DAO. Funds are only released when a governance vote approves a specific disbursement or project milestone.",
  },
  {
    question: "Can anyone create a DAO?",
    answer: "Yes. Any verified wallet can deploy a new CivicVault DAO through the Create DAO flow. You set the membership rules, quorum threshold, and initial funding target.",
  },
  {
    question: "How are returns distributed?",
    answer: "When a funded project generates returns, the proceeds are split proportionally among DAO members based on their contribution at the time of the distribution snapshot.",
  },
];


const COMMUNITY_PRODUCTS = [
  { title: "Riverside Commons",     link: "#", thumbnail: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80" },
  { title: "Downtown Co-op",        link: "#", thumbnail: "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=600&q=80" },
  { title: "Sunset Heights",        link: "#", thumbnail: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80" },
  { title: "Tech District Hub",     link: "#", thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80" },
  { title: "Harbor View",           link: "#", thumbnail: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=600&q=80" },
  { title: "Green Valley Estate",   link: "#", thumbnail: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?auto=format&fit=crop&w=600&q=80" },
  { title: "Arts Quarter",          link: "#", thumbnail: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80" },
  { title: "Midtown Lofts",         link: "#", thumbnail: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80" },
  { title: "Eastside Market",       link: "#", thumbnail: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=80" },
  { title: "North Shore Retreat",   link: "#", thumbnail: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=600&q=80" },
  { title: "Innovation Park",       link: "#", thumbnail: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=600&q=80" },
  { title: "Cultural Center",       link: "#", thumbnail: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=600&q=80" },
  { title: "Lakeside Gardens",      link: "#", thumbnail: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=600&q=80" },
  { title: "Business District",     link: "#", thumbnail: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=600&q=80" },
  { title: "Community Farm",        link: "#", thumbnail: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=600&q=80" },
];

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 32 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: EASE, delay },
});

const Hero: React.FC<{ onLaunch: () => void; isAuthenticated?: boolean }> = ({
  onLaunch,
  isAuthenticated = false,
}) => {
  const launchLabel   = isAuthenticated ? "Open Dashboard" : "Launch App";
  // Refs go on the tall wrapper divs, not the sticky sections
  const heroRef      = useRef<HTMLDivElement>(null);
  const section2Ref  = useRef<HTMLDivElement>(null);

  const smooth = (v: ReturnType<typeof useScroll>["scrollYProgress"]) =>
    useSpring(v, { stiffness: 80, damping: 20, mass: 0.5 });

  // ── Screen 1 parallax (scrolling through 200vh wrapper) ───────────────
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const smoothHero = smooth(heroProgress);
  const ribbonY    = useTransform(smoothHero, [0, 1], ["0%", "-25%"]);
  const contentY   = useTransform(smoothHero, [0, 1], ["0%", "-55%"]);
  const heroAlpha  = useTransform(smoothHero, [0, 0.6], [1, 0]);

  // ── Screen 2 parallax (scrolling through 200vh wrapper) ───────────────
  const { scrollYProgress: s2Progress } = useScroll({
    target: section2Ref,
    offset: ["start start", "end start"],
  });
  const smoothS2     = smooth(s2Progress);
  const s2ImageY     = useTransform(smoothS2, [0, 1], ["0%", "-12%"]);
  const s2TextY      = useTransform(smoothS2, [0, 1], ["0%", "-28%"]);
  const s2ExitAlpha  = useTransform(smoothS2, [0.5, 1], [1, 0]);

  return (
    <>
      {/* ── Screen 1: Hero (sticky inside 200vh scroll container) ───────── */}
      <div ref={heroRef} className="relative h-[200vh]">
      <section className="sticky top-0 w-full h-screen overflow-hidden">

        {/* Ribbon — moves slower (behind) */}
        <motion.div style={{ y: ribbonY }} className="absolute inset-0 w-full h-full">
          <TwistingRibbon
            className="w-full h-full rounded-none"
            twistCycles={6}
            waveAmplitude={1.2}
            waveSpeed={0.018}
            lightColors={{ face: "#1a4731", foldA: "#2d7a4f", foldB: "#10b981", foldC: "#34d399" }}
            darkColors={  { face: "#1a4731", foldA: "#2d7a4f", foldB: "#10b981", foldC: "#34d399" }}
          />
        </motion.div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-[#0e1117]/55 pointer-events-none" />

        {/* Content — moves faster + fades out on scroll */}
        <motion.div
          style={{ y: contentY, opacity: heroAlpha }}
          className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 sm:px-6"
        >
          {/* Heading */}
          <motion.h1
            {...fadeUp(0.3)}
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white leading-[1.08] max-w-4xl mb-6 tracking-tight"
          >
            Welcome to the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              #1 Community
            </span>{" "}
            Investment Platform
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            {...fadeUp(0.48)}
            className="text-lg sm:text-xl text-white/60 max-w-2xl mb-10 leading-relaxed"
          >
            Communities create local investment groups, vote on projects with
            USDC, and share returns transparently — all on-chain.
          </motion.p>

          {/* CTAs */}
          <motion.div {...fadeUp(0.62)} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={onLaunch}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-lg shadow-emerald-900/40 active:translate-y-0"
            >
              {launchLabel}
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="https://youtu.be/TtE1mm7DtrA"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/8 border border-white/15 text-white backdrop-blur-sm px-8 py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 hover:bg-white/15 transition-colors"
            >
              <PlayCircle className="w-5 h-5" />
              Learn How It Works
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          {...fadeUp(1.1)}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
        >
          <span className="text-white/30 text-xs tracking-widest uppercase">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="w-[1px] h-8 bg-gradient-to-b from-white/30 to-transparent"
          />
        </motion.div>
      </section>
      </div>{/* end heroRef wrapper */}

      {/* ── Screen 2: Editorial split (sticky inside 200vh wrapper) ─────── */}
      <div ref={section2Ref} className="relative h-[200vh]">
      <section className="sticky top-0 w-full h-screen bg-[#c8c6c1] flex items-center overflow-hidden">
        {/* Large image panel — bleeds in from right edge */}
        <motion.div style={{ y: s2ImageY }} className="absolute inset-y-0 right-0 w-[52%] hidden md:block pointer-events-none select-none">
          <img
            src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=85"
            alt="Community"
            className="w-full h-full object-cover"
          />
          {/* Gradient: fades left edge into light bg */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, #c8c6c1 0%, #c8c6c1 8%, transparent 45%)",
            }}
          />
          <div className="absolute inset-0 bg-[#c8c6c1]/15" />
        </motion.div>

        {/* Text — left column, compact editorial */}
        <motion.div
          style={{ y: s2TextY, opacity: s2ExitAlpha }}
          className="relative z-10 px-8 sm:px-14 lg:px-20 xl:px-28 py-24 w-full md:max-w-[54%]"
        >
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
            className="text-emerald-600 text-[10px] font-bold uppercase tracking-[0.2em] mb-5"
          >
            What is our Goal?
          </motion.p>

          {/* Compact headline */}
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: EASE, delay: 0.07 }}
            className="text-xl sm:text-2xl font-extrabold text-neutral-900 leading-snug tracking-tight mb-5"
          >
            CivicVault turns{" "}
            <CursorCard
              image="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=480&q=80"
              description="Neighborhoods pool resources to invest in what matters most to them."
              className="text-emerald-600 hover:bg-emerald-50"
            >
              neighborhoods
            </CursorCard>{" "}
            into investors.
          </motion.h2>

          {/* Body */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: EASE, delay: 0.15 }}
            className="space-y-4 text-sm text-neutral-500 leading-[1.9] max-w-sm"
          >
            <p>
              We built this because{" "}
              <CursorCard
                image="https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=480&q=80"
                description="Local communities deserve the same financial tools as institutions."
                className="text-neutral-700 hover:bg-neutral-100"
              >
                local communities
              </CursorCard>{" "}
              deserve access to the same wealth-building infrastructure
              that institutions have had for decades — not in ten years,
              but right now.
            </p>

            <p>
              Through{" "}
              <CursorCard
                image="https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=480&q=80"
                description="Every vote is recorded on-chain. No black boxes, no back rooms."
                className="text-neutral-700 hover:bg-neutral-100"
              >
                transparent on-chain governance
              </CursorCard>
              , residents pool USDC, vote on{" "}
              <CursorCard
                image="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=480&q=80"
                description="From community gardens to local co-ops — you decide what gets funded."
                className="text-neutral-700 hover:bg-neutral-100"
              >
                local projects
              </CursorCard>
              , and share returns — together.
            </p>

            <p>
              No venture fund. No middleman. Just a{" "}
              <CursorCard
                image="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=480&q=80"
                description="Smart contracts handle every transaction. Auditable by anyone."
                className="text-neutral-700 hover:bg-neutral-100"
              >
                smart contract
              </CursorCard>{" "}
              and a community with a shared vision.
            </p>
          </motion.div>

          {/* Stat strip */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.28 }}
            className="mt-10 flex gap-8 border-t border-neutral-200 pt-8"
          >
            {[
              { value: "100%", label: "On-chain"       },
              { value: "USDC", label: "Native currency" },
              { value: "DAO",  label: "Governed by you" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-base font-extrabold text-neutral-900">{value}</p>
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>
      </div>{/* end section2Ref wrapper */}

      {/* ── Screen 3: Parallax community gallery (dark) ─────────────────── */}
      <div className="dark">
        <HeroParallax
          products={COMMUNITY_PRODUCTS}
          title={<>Communities<br />investing together.</>}
          subtitle="Every project below is run by a real neighborhood DAO — funded by residents, governed on-chain, and open to anyone."
        />
      </div>

      {/* ── Screen 4: FAQ (warm ash — light mode) ───────────────────────── */}
      <section className="w-full min-h-screen bg-[#c2c0bb] flex flex-col items-center justify-center px-4 py-24">
        <div className="w-full max-w-3xl mx-auto">
          <p className="text-center text-emerald-600 text-[11px] font-bold uppercase tracking-[0.2em] mb-4">
            Got questions?
          </p>
          <h2 className="text-center text-3xl sm:text-4xl font-extrabold text-neutral-900 mb-14 tracking-tight">
            Frequently asked questions
          </h2>
          <FaqAccordion
            items={FAQS}
            title=""
            className="py-0"
          />
        </div>
      </section>
    </>
  );
};

export default Hero;
