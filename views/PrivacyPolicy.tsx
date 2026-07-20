import React from 'react';
import { ViewState } from '../App';
import { ArrowLeft, Shield } from 'lucide-react';

interface PrivacyPolicyProps {
  onViewChange: (view: ViewState) => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onViewChange }) => {
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
          <Shield className="w-6 h-6 text-primary" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-invert max-w-none text-foreground/80 space-y-6">
          <p>
            This Privacy Policy describes how CivicVault ("we", "us", or "our") collects, uses, and shares your personal information when you use our decentralized application.
          </p>
          
          <h2 className="text-xl font-bold text-foreground mt-8">1. Information We Collect</h2>
          <p>
            When you connect to CivicVault, we may collect public blockchain data associated with your wallet address. Since we operate on the Arc Testnet, all transaction data is inherently public.
          </p>
          
          <h2 className="text-xl font-bold text-foreground mt-8">2. How We Use Information</h2>
          <p>
            We use your wallet address and associated on-chain data to facilitate decentralized governance, neighborhood investment tracking, and identity verification (KYC).
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8">3. Data Sharing</h2>
          <p>
            We do not sell your personal data. Any data submitted on-chain is permanently stored on the decentralized ledger and cannot be altered or removed by us.
          </p>
          
          <h2 className="text-xl font-bold text-foreground mt-8">4. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please reach out to the community via our official channels.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
