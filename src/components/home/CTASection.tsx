import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isIOSApp } from "@/utils/isIOSApp";

interface CtaContent {
  title: string;
  description: string;
  ctaButton1: string;
  ctaButton2: string;
  badge1: string;
  badge2: string;
  badge3: string;
}

const defaultContent: CtaContent = {
  title: "ابدأ تجربتك القانونية الذكية الآن",
  description: "استشارات فورية، تنبؤ أحكام، عقود جاهزة، بحث قانوني، وتقديم شكاوى… كل ذلك في منصة واحدة تحترم خصوصيتك وتدعم قراراتك القانونية.",
  ctaButton1: "ابدأ الآن",
  ctaButton2: "اطلع على الباقات",
  badge1: "خصوصية محمية",
  badge2: "دقة تتجاوز 95%",
  badge3: "سرعة فائقة"
};

export function CTASection() {
  const [content, setContent] = useState<CtaContent>(defaultContent);
  const iosApp = isIOSApp();

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data } = await supabase
          .from("site_content")
          .select("content")
          .eq("page_key", "home_cta")
          .maybeSingle();

        if (data?.content && typeof data.content === 'object') {
          setContent(prev => ({ ...prev, ...(data.content as Partial<CtaContent>) }));
        }
      } catch (error) {
        console.error("Error fetching CTA content:", error);
      }
    };

    fetchContent();
  }, []);

  return (
    <section className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-golden mb-8 shadow-golden animate-pulse-golden">
            <MessageCircle className="w-10 h-10 text-primary-foreground" />
          </div>

          {/* Content */}
          <h2 className="font-cairo font-bold text-3xl md:text-5xl text-foreground mb-6">
            {content.title}
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            {content.description}
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/consultation">
              <Button variant="hero" size="xl" className="group">
                <span>{content.ctaButton1}</span>
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </Button>
            </Link>
            {!iosApp && (
              <Link to="/pricing">
                <Button variant="golden-outline" size="xl">
                  {content.ctaButton2}
                </Button>
              </Link>
            )}
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-12 text-muted-foreground text-sm">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              {content.badge1}
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              {content.badge2}
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              {content.badge3}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
