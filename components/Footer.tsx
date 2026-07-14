import { Leaf, Github, Twitter, Globe } from "lucide-react";

const LINKS = {
  Platform: [
    { label: "How it works",  href: "#how-it-works" },
    { label: "Governance",    href: "#governance"   },
    { label: "Properties",    href: "#properties"   },
    { label: "Launch App",    href: "#"             },
  ],
  Resources: [
    { label: "Whitepaper",       href: "/whitepaper.html"             },
    { label: "GitHub",           href: "https://github.com/Kenny-svg/CivicVault" },
    { label: "Arc Block Explorer", href: "https://testnet.arcscan.app" },
    { label: "FAQs",             href: "#faqs"                        },
  ],
  Legal: [
    { label: "Privacy Policy",   href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy",    href: "#" },
  ],
};

const SOCIALS = [
  { icon: Twitter, label: "Twitter", href: "https://twitter.com" },
  { icon: Github,  label: "GitHub",  href: "https://github.com/Kenny-svg/CivicVault" },
  { icon: Globe,   label: "Website", href: "#" },
];

const Footer: React.FC = () => (
  <footer className="w-full bg-[#0a0d12] border-t border-white/[0.06]">
    <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-20">

      {/* Top: brand + link columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">

        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-emerald-500/20 border border-emerald-400/30 p-1.5 rounded-lg">
              <Leaf className="text-emerald-400 w-4 h-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">CivicVault</span>
          </div>
          <p className="text-sm text-white/35 leading-relaxed max-w-[220px]">
            Empowering neighborhoods to invest, govern, and grow — together, on-chain.
          </p>

          {/* Socials */}
          <div className="flex items-center gap-3 mt-6">
            {SOCIALS.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors"
              >
                <Icon className="w-3.5 h-3.5" />
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {Object.entries(LINKS).map(([heading, items]) => (
          <div key={heading}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/25 mb-4">
              {heading}
            </p>
            <ul className="space-y-3">
              {items.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="text-sm text-white/45 hover:text-white transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-white/20">
          © {new Date().getFullYear()} CivicVault. Built on Circle's Arc Network.
        </p>
      </div>

    </div>
  </footer>
);

export default Footer;
