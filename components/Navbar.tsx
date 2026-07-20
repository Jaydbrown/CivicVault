import { useEffect, useState } from "react";
import { Leaf, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { label: "About Us", id: "about-us" },
  { label: "Cases", id: "cases" },
  { label: "Reviews", id: "reviews" },
  { label: "Contact Us", id: "contact-us" },
];

const menuVariants = {
  hidden: { y: "-100%" },
  visible: { 
    y: "0%",
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  },
  exit: { 
    y: "-100%",
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }
  }
};

const linkContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.05, staggerDirection: -1 }
  }
};

const linkVariants = {
  hidden: { y: 50, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  },
  exit: { 
    y: 20, 
    opacity: 0,
    transition: { duration: 0.3 }
  }
};

const Navbar: React.FC<{ onLaunch: () => void; isAuthenticated?: boolean }> = ({
  onLaunch,
  isAuthenticated = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const launchLabel = isAuthenticated ? "Open App" : "Launch App";

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  const scrollTo = (id: string) => {
    setIsOpen(false);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 400); // Wait for menu close animation
  };

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          isScrolled && !isOpen ? "bg-white/90 backdrop-blur-md shadow-sm py-3" : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
          
          {/* Logo */}
          <button
            onClick={() => {
              setIsOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-3 shrink-0 group relative z-[60]"
          >
            <div className={`p-2 rounded-xl transition-colors duration-300 ${isScrolled || isOpen ? 'bg-primary/10' : 'bg-white/10'}`}>
              <Leaf className={`w-6 h-6 transition-colors duration-300 ${isScrolled || isOpen ? 'text-primary' : 'text-white'}`} />
            </div>
            <span className={`font-display font-bold text-2xl tracking-tight transition-colors duration-300 ${(isScrolled && !isOpen) || isOpen ? 'text-foreground' : 'text-white'}`}>
              CivicVault
            </span>
          </button>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className={`text-sm font-semibold tracking-wide transition-colors duration-200 hover:text-primary ${
                  isScrolled ? "text-foreground/80" : "text-white/80"
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right side CTA & Mobile Menu Toggle */}
          <div className="flex items-center gap-4 relative z-[60]">
            <button
              onClick={() => { setIsOpen(false); onLaunch(); }}
              className={`hidden md:inline-flex items-center px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                isScrolled 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "bg-white text-black hover:bg-white/90"
              }`}
            >
              {launchLabel}
            </button>
            
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`md:hidden relative w-12 h-12 flex items-center justify-center rounded-full border transition-all duration-300 ${
                (isScrolled && !isOpen) || isOpen 
                  ? 'border-black/10 bg-white/50 backdrop-blur-md hover:bg-white/80' 
                  : 'border-white/20 bg-black/20 backdrop-blur-md hover:bg-black/40'
              }`}
            >
              <motion.span
                animate={{ 
                  top: isOpen ? "50%" : "38%", 
                  rotate: isOpen ? 45 : 0,
                  y: "-50%",
                  x: "-50%"
                }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={`absolute left-1/2 block w-5 h-[2px] rounded-full transition-colors ${
                  (isScrolled && !isOpen) || isOpen ? 'bg-black' : 'bg-white'
                }`}
              />
              <motion.span
                animate={{ 
                  top: isOpen ? "50%" : "62%", 
                  rotate: isOpen ? -45 : 0,
                  y: "-50%",
                  x: "-50%"
                }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={`absolute left-1/2 block w-5 h-[2px] rounded-full transition-colors ${
                  (isScrolled && !isOpen) || isOpen ? 'bg-black' : 'bg-white'
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* AWSMD-style Fullscreen Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-40 bg-[#f4f4f0] md:hidden flex flex-col justify-between pt-32 pb-12 px-8"
          >
            <motion.div 
              variants={linkContainerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col gap-6"
            >
              {NAV_LINKS.map((link, i) => (
                <motion.div key={link.id} variants={linkVariants} className="overflow-hidden">
                  <button
                    onClick={() => scrollTo(link.id)}
                    className="text-5xl font-display font-black text-[#1a1a1a] tracking-tighter hover:text-primary transition-colors text-left"
                  >
                    {link.label}
                  </button>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              variants={linkVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col gap-8 border-t border-black/10 pt-8"
            >
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-2 text-sm font-semibold text-black/60 uppercase tracking-widest">
                  <a href="#" className="hover:text-primary transition-colors">Twitter</a>
                  <a href="#" className="hover:text-primary transition-colors">LinkedIn</a>
                  <a href="#" className="hover:text-primary transition-colors">Instagram</a>
                </div>
                <button
                  onClick={() => { setIsOpen(false); onLaunch(); }}
                  className="bg-[#1a1a1a] text-white px-8 py-4 rounded-full text-sm font-bold tracking-widest uppercase hover:bg-primary transition-colors"
                >
                  {launchLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
