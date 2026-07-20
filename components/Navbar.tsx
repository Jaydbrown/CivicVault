import { useEffect, useState } from "react";
import { Leaf, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "About Us", id: "about-us" },
  { label: "Cases", id: "cases" },
  { label: "Reviews", id: "reviews" },
  { label: "Contact Us", id: "contact-us" },
];

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

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setIsOpen(false);
  };

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          isScrolled ? "bg-white/90 backdrop-blur-md shadow-sm py-3" : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
          
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3 shrink-0 group"
          >
            <div className={`p-2 rounded-xl transition-colors duration-300 ${isScrolled ? 'bg-primary/10' : 'bg-white/10'}`}>
              <Leaf className={`w-6 h-6 transition-colors duration-300 ${isScrolled ? 'text-primary' : 'text-white'}`} />
            </div>
            <span className={`font-display font-bold text-2xl tracking-tight transition-colors duration-300 ${isScrolled ? 'text-foreground' : 'text-white'}`}>
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

          {/* Right side CTA & Mobile menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={onLaunch}
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
              className={`md:hidden p-2 transition-colors duration-300 ${isScrolled ? 'text-foreground' : 'text-white'}`}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-sm pt-24 px-6 md:hidden">
          <div className="flex flex-col gap-6">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="text-3xl font-display font-bold text-foreground text-left"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-8 border-t border-border mt-4">
              <button
                onClick={() => { onLaunch(); setIsOpen(false); }}
                className="w-full bg-primary text-primary-foreground py-4 rounded-xl text-lg font-bold"
              >
                {launchLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
