import React from 'react';
import { ViewState } from '../App';
import { ArrowLeft, BookOpen } from 'lucide-react';

interface WhitepaperProps {
  onViewChange: (view: ViewState) => void;
}

const Whitepaper: React.FC<WhitepaperProps> = ({ onViewChange }) => {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8">
      <button
        onClick={() => onViewChange('landing')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </button>

      <div className="bg-card border border-border rounded-3xl p-8 md:p-12 shadow-sm">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">CivicVault Whitepaper</h1>
        <p className="text-muted-foreground mb-8">Version 1.0.0 | {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-invert max-w-none text-foreground/80 space-y-6">
          <p className="text-lg font-semibold text-foreground">
            Abstract: CivicVault is a decentralized platform designed to empower local communities by transforming neighborhood investments into governed, on-chain assets.
          </p>
          
          <h2 className="text-xl font-bold text-foreground mt-8">1. Introduction</h2>
          <p>
            Traditional local governance and community funding mechanisms are often opaque, slow, and disconnected from the digital economy. CivicVault bridges this gap by leveraging smart contracts on the Arc Network to create transparent, community-led Decentralized Autonomous Organizations (DAOs).
          </p>
          
          <h2 className="text-xl font-bold text-foreground mt-8">2. Architecture</h2>
          <p>
            The platform utilizes a Factory contract to spawn individual DAOs for different neighborhoods. Each DAO can propose investments, vote on proposals using on-chain governance, and distribute yields automatically in USDC.
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8">3. Governance Model</h2>
          <p>
            Governance is weighted based on verified community membership (KYC). Only verified residents or stakeholders can participate in proposals, ensuring that decisions are made by those who are directly impacted by the outcomes.
          </p>
          
          <h2 className="text-xl font-bold text-foreground mt-8">4. Future Roadmap</h2>
          <p>
            Future iterations of CivicVault will include advanced quadratic voting mechanisms, integration with local municipal APIs, and expanded cross-chain asset support.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Whitepaper;
