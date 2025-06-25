
import React from 'react';
import { Code2, ExternalLink, FileText, Home, Search } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="navy-bg text-white pt-12 sm:pt-16 pb-[max(2.5rem,env(safe-area-inset-bottom,0px)+1.25rem)] sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-green-400/20 p-1.5 rounded-lg border border-green-400/30">
                <Home className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight">CivicVault</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Community investment DAOs powered by Circle's Arc network. Stake USDC, vote on
              local projects, and share returns transparently on-chain.
            </p>
            <div className="flex gap-3">
              <a
                href="https://github.com/Kenny-svg/CivicVault"
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-green-900 rounded-lg hover:bg-green-800 transition-colors"
                aria-label="GitHub"
              >
                <Code2 className="w-5 h-5 text-slate-300" />
              </a>
              <a
                href="/whitepaper.html"
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-green-900 rounded-lg hover:bg-green-800 transition-colors"
                aria-label="Whitepaper"
              >
                <FileText className="w-5 h-5 text-slate-300" />
              </a>
              <a
                href="https://testnet.arcscan.app"
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-green-900 rounded-lg hover:bg-green-800 transition-colors"
                aria-label="Arc block explorer"
              >
                <Search className="w-5 h-5 text-slate-300" />
              </a>
            </div>
          </div>

          <div>
            <h5 className="font-bold text-white mb-6">Resources</h5>
            <ul className="space-y-4">
              <li>
                <a href="/whitepaper.html" target="_blank" rel="noreferrer" className="text-slate-400 text-sm hover:text-white transition-colors inline-flex items-center gap-1">
                  Whitepaper <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://github.com/Kenny-svg/CivicVault" target="_blank" rel="noreferrer" className="text-slate-400 text-sm hover:text-white transition-colors inline-flex items-center gap-1">
                  GitHub Repository <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer" className="text-slate-400 text-sm hover:text-white transition-colors inline-flex items-center gap-1">
                  Arc Block Explorer <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://arc.network" target="_blank" rel="noreferrer" className="text-slate-400 text-sm hover:text-white transition-colors inline-flex items-center gap-1">
                  Circle Arc Network <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white mb-6">What This Solves</h5>
            <ul className="space-y-4">
              <li className="text-slate-400 text-sm">Transparent community treasury and voting.</li>
              <li className="text-slate-400 text-sm">Role-based controls for operations and safety.</li>
              <li className="text-slate-400 text-sm">USDC staking and yield distribution on-chain.</li>
              <li className="text-slate-400 text-sm">Multi-sig approval for every yield deposit.</li>
              <li className="text-slate-400 text-sm">Per-DAO communication channels for coordination.</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-green-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} CivicVault. Built on Circle's Arc Network.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
