import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import { TeamSection } from "@/components/landing/team-section";
import { WhyEsgSection } from "@/components/landing/why-esg-section";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { MarketingHeader } from "@/components/layout/marketing-header";

export default function HomePage() {
  return (
    <>
      <MarketingHeader />
      <HeroSection />
      <HowItWorksSection />
      <WhyEsgSection />
      <TeamSection />
      <LandingCtaSection />
      <MarketingFooter />
    </>
  );
}
