import { sourceSerif } from '@/components/landing/fonts';
import LandingHeader from '@/components/landing/header';
import Hero from '@/components/landing/hero';
import ProblemSection from '@/components/landing/problem-section';
import FeaturesSection from '@/components/landing/features-section';
import HowItWorks from '@/components/landing/how-it-works';
import AboutSection from '@/components/landing/about-section';
import PricingSection from '@/components/landing/pricing-section';
import FinalCtaSection from '@/components/landing/final-cta-section';
import ContactSection from '@/components/landing/contact-section';
import LandingFooter from '@/components/landing/footer';
import LandingMotionConfig from '@/components/landing/motion-config';

export default function LandingPage() {
  return (
    <LandingMotionConfig>
      {/* sourceSerif.variable stellt --font-serif-display bereit, das die
          Überschriften dieser Seite über eine Tailwind-Arbitrary-Value-Klasse
          referenzieren (font-[family-name:var(--font-serif-display)]) – rein
          lokal für die Landingpage, ohne die App-weite Inter-Variable oder
          das Dashboard zu berühren. */}
      <div className={`min-h-screen flex flex-col bg-stone-50 ${sourceSerif.variable}`}>
        <LandingHeader />
        <main className="flex-1">
          <Hero />
          <ProblemSection />
          <FeaturesSection />
          <HowItWorks />
          <AboutSection />
          <PricingSection />
          <FinalCtaSection />
          <ContactSection />
        </main>
        <LandingFooter />
      </div>
    </LandingMotionConfig>
  );
}
