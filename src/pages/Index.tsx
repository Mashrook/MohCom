import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { HeroSection } from "@/components/home/HeroSection";
import { VideoSection } from "@/components/home/VideoSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { CTASection } from "@/components/home/CTASection";
import { useSectionSettings } from "@/hooks/useSectionSettings";
import { Loader2 } from "lucide-react";

const sectionComponents: Record<string, React.ComponentType> = {
  hero: HeroSection,
  video: VideoSection,
  services: ServicesSection,
  features: FeaturesSection,
  howitworks: HowItWorksSection,
  cta: CTASection,
};

const Index = () => {
  const { getOrderedHomepageSections, loading, isSectionEnabled } = useSectionSettings();

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const orderedSections = getOrderedHomepageSections();

  return (
    <Layout>
      <SEO 
        url="/"
        keywords="محامي, استشارات قانونية, محامي السعودية, ذكاء اصطناعي قانوني, تحليل عقود, التنبؤ بالأحكام, شكاوى قانونية, محامي كوم, استشارة قانونية فورية"
      />
      {orderedSections.map((sectionKey) => {
        const Component = sectionComponents[sectionKey];
        if (!Component) return null;
        return <Component key={sectionKey} />;
      })}
      {/* Fallback for sections not in database yet */}
      {orderedSections.length === 0 && (
        <>
          {isSectionEnabled('hero') && <HeroSection />}
          {isSectionEnabled('video') && <VideoSection />}
          {isSectionEnabled('services') && <ServicesSection />}
          {isSectionEnabled('features') && <FeaturesSection />}
          {isSectionEnabled('howitworks') && <HowItWorksSection />}
          {isSectionEnabled('cta') && <CTASection />}
        </>
      )}
    </Layout>
  );
};

export default Index;
