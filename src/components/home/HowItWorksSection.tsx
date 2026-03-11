import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Step {
  number: string;
  title: string;
  description: string;
}

interface HowItWorksContent {
  badge: string;
  title: string;
  description: string;
  steps: Step[];
}

const defaultContent: HowItWorksContent = {
  badge: "كيف تعمل المنصة؟",
  title: "خطوات بسيطة تمنحك تجربة قانونية متكاملة",
  description: "مدعومة بالذكاء الاصطناعي",
  steps: [
    {
      number: "1",
      title: "اختر نوع الخدمة",
      description: "استشارة، تنبؤ حكم، عقد، بحث قانوني، أو تقديم شكوى."
    },
    {
      number: "2",
      title: "أدخل البيانات المطلوبة",
      description: "بأقل قدر ممكن من المعلومات، مع توضيح النقاط الأساسية."
    },
    {
      number: "3",
      title: "استلم النتيجة فورًا",
      description: "تحليل، صياغة، أو تحويل تلقائي للجهة المختصة – خلال ثوانٍ أو دقائق."
    }
  ]
};

export function HowItWorksSection() {
  const [content, setContent] = useState<HowItWorksContent>(defaultContent);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data } = await supabase
          .from("site_content")
          .select("content")
          .eq("page_key", "home_how_it_works")
          .maybeSingle();

        if (data?.content && typeof data.content === 'object') {
          setContent(prev => ({ ...prev, ...(data.content as Partial<HowItWorksContent>) }));
        }
      } catch (error) {
        console.error("Error fetching how it works content:", error);
      }
    };

    fetchContent();
    
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="py-24 relative">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className={cn(
          "text-center max-w-3xl mx-auto mb-16 transition-all duration-1000",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            {content.badge}
          </span>
          <h2 className="font-cairo font-bold text-3xl md:text-4xl text-foreground mb-6">
            {content.title}
          </h2>
          <p className="text-muted-foreground text-lg">
            {content.description}
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {content.steps.map((step, index) => (
            <div
              key={step.number}
              className={cn(
                "group relative transition-all duration-700",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"
              )}
              style={{ transitionDelay: `${index * 200}ms` }}
            >
              <div className="relative p-8 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-primary/10">
                {/* Step Number */}
                <div className="absolute -top-6 right-8">
                  <div className="w-12 h-12 rounded-xl bg-gradient-golden flex items-center justify-center text-primary-foreground font-bold text-xl shadow-golden">
                    {step.number}
                  </div>
                </div>
                
                {/* Content */}
                <div className="pt-4">
                  <h3 className="font-cairo font-bold text-xl text-foreground mb-3 transition-colors duration-300 group-hover:text-primary">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Connector Line (except last item) */}
                {index < content.steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -left-4 w-8 h-0.5 bg-gradient-to-l from-primary/50 to-transparent" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
