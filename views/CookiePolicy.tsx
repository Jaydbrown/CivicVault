import React from 'react';
import { ViewState } from '../App';
import { ArrowLeft, Cookie } from 'lucide-react';

interface CookiePolicyProps {
  onViewChange: (view: ViewState) => void;
}

const CookiePolicy: React.FC<CookiePolicyProps> = ({ onViewChange }) => {
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
          <Cookie className="w-6 h-6 text-primary" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">Cookie Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-invert max-w-none text-foreground/80 space-y-6">
          <p>
            This Cookie Policy explains how CivicVault uses cookies and similar technologies to recognize you when you visit our application.
          </p>
          
          <h2 className="text-xl font-bold text-foreground mt-8">1. What are Cookies?</h2>
          <p>
            Cookies are small data files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide reporting information.
          </p>
          
          <h2 className="text-xl font-bold text-foreground mt-8">2. How We Use Cookies</h2>
          <p>
            We use strictly necessary cookies to ensure the application functions correctly (e.g., maintaining your session when connected via Privy). We may also use local storage to cache UI preferences (like the last chat room you visited).
          </p>

          <h2 className="text-xl font-bold text-foreground mt-8">3. Managing Cookies</h2>
          <p>
            You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your web browser controls to accept or refuse cookies.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
