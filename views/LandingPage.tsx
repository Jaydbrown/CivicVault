import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import { ViewState } from "@/App";

interface LandingPageProps {
  onViewChange: (view: ViewState) => void;
  onLogin: () => void;
  isAuthenticated?: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({
  onViewChange,
  onLogin,
  isAuthenticated = false,
}) => {
  const onLaunch = () => {
    if (isAuthenticated) {
      onViewChange('dashboard');
      return;
    }
    onLogin();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onLaunch={onLaunch} isAuthenticated={isAuthenticated} />
      <main className="flex-grow">
        <Hero onLaunch={onLaunch} isAuthenticated={isAuthenticated} />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
