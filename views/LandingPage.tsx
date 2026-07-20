import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import EditorialSection from "../components/landing/EditorialSection";
import CommunityGallery from "../components/landing/CommunityGallery";
import AnimatedFeatures from "../components/landing/AnimatedFeatures";
import JourneyTimeline from "../components/landing/JourneyTimeline";
import FaqSection from "../components/landing/FaqSection";
import DecorativeElements from "../components/landing/DecorativeElements";
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
    <div className="min-h-screen flex flex-col bg-[#050505] relative clip-x-scroll-fix overflow-x-clip">
      <DecorativeElements />
      <Navbar onLaunch={onLaunch} isAuthenticated={isAuthenticated} />
      <main className="flex-grow relative z-10">
        <Hero onLaunch={onLaunch} isAuthenticated={isAuthenticated} />
        <EditorialSection />
        <CommunityGallery />
        <AnimatedFeatures />
        <JourneyTimeline />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
