import { useEffect, useMemo, useRef, useState } from "react";
import { animate } from "framer-motion";
import { Leaf, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "How it works",  id: "how-it-works" },
  { label: "Governance",    id: "governance" },
  { label: "Properties",    id: "properties" },
  { label: "FAQs",          id: "faqs" },
];

const Navbar: React.FC<{ onLaunch: () => void; isAuthenticated?: boolean }> = ({
  onLaunch,
  isAuthenticated = false,
}) => {
  const navRef        = useRef<HTMLElement>(null);
  const [isOpen,      setIsOpen]      = useState(false);
  const [isScrolled,  setIsScrolled]  = useState(false);
  const [activeId,    setActiveId]    = useState(NAV_LINKS[0].id);
  const [hoverX,      setHoverX]      = useState<number | null>(null);
  const spotlightX    = useRef(0);
  const ambienceX     = useRef(0);
  const sectionIds    = useMemo(() => NAV_LINKS.map((l) => l.id), []);
  const launchLabel   = isAuthenticated ? "Open App" : "Launch App";

  // ── Scroll: shrink + active-section tracking ──────────────────────────────
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      const anchorY = window.innerHeight * 0.28;
      let next = sectionIds[0];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= anchorY) next = id;
      }
      setActiveId((cur) => (cur === next ? cur : next));
      ticking = false;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [sectionIds]);

  // ── Spotlight: follows mouse ───────────────────────────────────────────────
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const onMove = (e: MouseEvent) => {
      const x = e.clientX - nav.getBoundingClientRect().left;
      setHoverX(x);
      spotlightX.current = x;
      nav.style.setProperty("--sx", `${x}px`);
    };

    const onLeave = () => {
      setHoverX(null);
      const activeEl = nav.querySelector(`[data-id="${activeId}"]`);
      if (activeEl) {
        const navRect  = nav.getBoundingClientRect();
        const itemRect = activeEl.getBoundingClientRect();
        const target   = itemRect.left - navRect.left + itemRect.width / 2;
        animate(spotlightX.current, target, {
          type: "spring", stiffness: 200, damping: 20,
          onUpdate: (v) => { spotlightX.current = v; nav.style.setProperty("--sx", `${v}px`); },
        });
      }
    };

    nav.addEventListener("mousemove", onMove);
    nav.addEventListener("mouseleave", onLeave);
    return () => { nav.removeEventListener("mousemove", onMove); nav.removeEventListener("mouseleave", onLeave); };
  }, [activeId]);

  // ── Ambience: springs to active item ─────────────────────────────────────
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const activeEl = nav.querySelector(`[data-id="${activeId}"]`);
    if (!activeEl) return;
    const navRect  = nav.getBoundingClientRect();
    const itemRect = activeEl.getBoundingClientRect();
    const target   = itemRect.left - navRect.left + itemRect.width / 2;
    animate(ambienceX.current, target, {
      type: "spring", stiffness: 200, damping: 20,
      onUpdate: (v) => { ambienceX.current = v; nav.style.setProperty("--ax", `${v}px`); },
    });
  }, [activeId]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setIsOpen(false);
  };

  return (
    <div className="sticky top-[max(0.75rem,env(safe-area-inset-top,0px))] z-50 flex justify-center px-4">
      <div className="w-full max-w-4xl">
        {/* ── Main pill ─────────────────────────────────────────────────── */}
        <nav
          ref={navRef}
          className="relative w-full overflow-hidden rounded-full transition-all duration-300"
          style={{
            height: isScrolled ? "2.75rem" : "3.25rem",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.11)",
            boxShadow: "0 4px 32px rgba(0,0,0,0.45)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <div className="relative z-10 h-full grid grid-cols-[auto_1fr_auto] items-center px-4 sm:px-5">

            {/* Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2 shrink-0"
            >
              <div className="bg-emerald-500/20 border border-emerald-400/30 p-1.5 rounded-lg">
                <Leaf className="text-emerald-400 w-4 h-4" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-white hidden sm:block">
                CivicVault
              </span>
            </button>

            {/* Center nav links — desktop */}
            <div className="hidden md:flex items-center justify-center gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  data-id={link.id}
                  onClick={() => { setActiveId(link.id); scrollTo(link.id); }}
                  className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 ${
                    activeId === link.id
                      ? "text-white"
                      : "text-white/45 hover:text-white/80"
                  }`}
                >
                  {link.label}
                </button>
              ))}
              <a
                href="/whitepaper.html"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 text-sm font-medium rounded-full text-white/45 hover:text-white/80 transition-colors duration-200"
              >
                Whitepaper
              </a>
            </div>

            {/* Right: CTA + mobile toggle */}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onLaunch}
                className="hidden md:inline-flex items-center bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-1.5 rounded-full text-sm font-semibold transition-colors shadow-lg shadow-emerald-900/30"
              >
                {launchLabel}
              </button>
              <button
                onClick={() => setIsOpen((o) => !o)}
                className="md:hidden text-white/70 hover:text-white transition-colors p-1"
              >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Spotlight gradient — follows mouse */}
          <div
            className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-300"
            style={{
              opacity: hoverX !== null ? 1 : 0,
              background: "radial-gradient(140px circle at var(--sx) 100%, rgba(255,255,255,0.1) 0%, transparent 60%)",
            }}
          />

          {/* Ambience line — springs to active item */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 w-full h-[2px] z-[2]"
            style={{
              background: "radial-gradient(70px circle at var(--ax) 0%, rgba(52,211,153,0.9) 0%, transparent 100%)",
            }}
          />
        </nav>

        {/* ── Mobile dropdown ──────────────────────────────────────────── */}
        {isOpen && (
          <div
            className="md:hidden mt-2 rounded-2xl overflow-hidden"
            style={{
              background: "rgba(14,17,23,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(14px)",
            }}
          >
            <div className="p-3 flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  onClick={() => { setActiveId(link.id); scrollTo(link.id); }}
                  className="text-left px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/8 transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <a
                href="/whitepaper.html"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/8 transition-colors"
              >
                Whitepaper
              </a>
              <button
                onClick={() => { onLaunch(); setIsOpen(false); }}
                className="mt-1 w-full bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {launchLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
