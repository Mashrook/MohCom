import { useState, useEffect } from "react";
import { Shield, Zap, Clock, Lock, Award, HeartHandshake, LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface FeaturesContent {
  badge: string;
  title: string;
  description: string;
  features: Feature[];
}

const iconMap: Record<string, LucideIcon> = {
  Zap,
  Shield,
  Clock,
  Lock,
  Award,
  HeartHandshake
};

const defaultContent: FeaturesContent = {
  badge: "لماذا محاميكم؟",
  title: "لأننا نجمع بين قوة الذكاء الاصطناعي وصرامة المنهج القانوني",
  description: "مع احترام كامل لخصوصيتك",
  features: [
    { icon: "Lock", title: "خصوصية محمية بالكامل", description: "نلتزم بحماية بياناتك وعدم مشاركتها مع أي طرف غير مخوّل، مع استخدام تقنيات حديثة لتأمين المعلومات." },
    { icon: "Shield", title: "ذكاء يفهم القانون السعودي", description: "النظام مبني على فهم عميق للأنظمة واللوائح السعودية، بما يضمن مواءمة المخرجات مع البيئة القانونية المحلية." },
    { icon: "Award", title: "دقة في التنبؤ والتحليل", description: "نماذج تحليل متقدمة تمنحك تنبؤات عالية الدقة لأحكام القضايا، وتساعدك على اتخاذ قرارات واثقة." },
    { icon: "Zap", title: "سرعة في الوصول للحل", description: "من الاستشارة إلى العقد إلى الشكوى… كل شيء يتم خلال دقائق، دون الحاجة لمواعيد أو انتظار." },
    { icon: "HeartHandshake", title: "سهولة الاستخدام", description: "واجهة بسيطة، خطوات واضحة، وتجربة مصممة لتناسب الأفراد وأصحاب الأعمال على حد سواء." },
    { icon: "Clock", title: "خدمات متكاملة", description: "استشارات، تنبؤ، عقود، بحث قانوني، وشكاوى… في منصة واحدة متكاملة." }
  ]
};

export function FeaturesSection() {
  const [content, setContent] = useState<FeaturesContent>(defaultContent);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data } = await supabase
          .from("site_content")
          .select("content")
          .eq("page_key", "home_features")
          .maybeSingle();

        if (data?.content && typeof data.content === 'object') {
          setContent(prev => ({ ...prev, ...(data.content as Partial<FeaturesContent>) }));
        }
      } catch (error) {
        console.error("Error fetching features content:", error);
      }
    };

    fetchContent();
  }, []);

  return (
    <section className="py-24 bg-card/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            {content.badge}
          </span>
          <h2 className="font-cairo font-bold text-3xl md:text-4xl text-foreground mb-6">
            {content.title}
          </h2>
          <p className="text-muted-foreground text-lg">
            {content.description}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {content.features.map((feature, index) => {
            const IconComponent = iconMap[feature.icon] || Zap;
            return (
              <div
                key={feature.title}
                className="group relative p-6 rounded-2xl bg-background border border-border/50 hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-primary/10 animate-fade-in overflow-hidden"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
                
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-golden-light/20 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 -z-10" />
                
                {/* Icon container with pulse animation */}
                <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-golden-light/20 flex items-center justify-center mb-5 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-500 group-hover:scale-110">
                  <IconComponent className="w-7 h-7 text-primary transition-transform duration-500 group-hover:scale-110" />
                  {/* Rotating border effect */}
                  <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-primary/30 transition-all duration-500 group-hover:rotate-12" />
                </div>
                
                <h3 className="font-cairo font-semibold text-xl text-foreground mb-3 transition-colors duration-300 group-hover:text-primary">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed transition-colors duration-300 group-hover:text-foreground/80">
                  {feature.description}
                </p>
                
                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
