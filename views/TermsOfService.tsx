import React from 'react';
import { ViewState } from '../App';
import { ArrowLeft, FileText } from 'lucide-react';

interface TermsOfServiceProps {
  onViewChange: (view: ViewState) => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onViewChange }) => {
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
          <FileText className="w-6 h-6 text-primary" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-invert max-w-none text-foreground/80 space-y-6">
          <p>
            Welcome to CivicVault. By accessing or using our decentralized application, you agree to be bound by these Terms of Service.
          </p>
          
          <h2 className="text-xl font-bold text-foreground mt-8">1. Acceptance of Terms</h2>
          <p>
            By connecting your wallet and interacting with our smart contracts, you acknowledge that you have read, understood, and agree to these terms.
          </p>
          
          <h2 className="text-xl font-bold text-foreground mt-8">2. Decentralized Nature</h2>
          <p>
            CivicVault is a decentralized platform built on the blockchain. We do not have custody over your funds, nor can we reverse transactions. You are solely responsible for managing your private keys and wallet security.
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8">3. Smart Contract Risks</h2>
          <p>
            While our smart contracts have been tested, interacting with blockchain protocols inherently carries risk. We are not liable for any funds lost due to vulnerabilities, exploits, or user error.
          </p>
          
          <h2 className="text-xl font-bold text-foreground mt-8">4. Modifications</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of the new terms.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
