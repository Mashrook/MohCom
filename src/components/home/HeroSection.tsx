import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scale, Sparkles, ArrowLeft, Shield, Users, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface HeroContent {
  badge: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  ctaButton1: string;
  ctaButton2: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
}

// إحصاءات توضيحية للزوار والمستخدمين العاديين
const defaultContent: HeroContent = {
  badge: "منصة قانونية ذكية",
  titleLine1: "حلول قانونية فورية",
  titleLine2: "بذكاء يحمي خصوصيتك",
  description: "محاميكم منصة قانونية متقدمة تعتمد على الذكاء الاصطناعي لتقديم استشارات فورية، تنبؤ أحكام القضايا بدقة تتجاوز 95%، نماذج عقود احترافية، بحث قانوني ذكي، وتقديم الشكاوى تلقائيًا للجهة المختصة – في مكان واحد.",
  ctaButton1: "جرّب الخدمة الآن",
  ctaButton2: "استشارة قانونية فورية",
  stat1Value: "95%+",
  stat1Label: "دقة التنبؤ",
  stat2Value: "ثوانٍ",
  stat2Label: "سرعة الاستجابة",
  stat3Value: "100%",
  stat3Label: "حماية الخصوصية"
};

export function HeroSection() {
  const { isAdmin } = useAuth();
  const [content, setContent] = useState<HeroContent>(defaultContent);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        // جلب محتوى الهيرو من قاعدة البيانات
        const { data } = await supabase
          .from("site_content")
          .select("content")
          .eq("page_key", "home_hero")
          .maybeSingle();

        if (data?.content && typeof data.content === 'object') {
          setContent(prev => ({ ...prev, ...(data.content as Partial<HeroContent>) }));
        }

        // إذا كان المستخدم أدمن، جلب الإحصاءات الحقيقية
        if (isAdmin) {
          await fetchRealStats();
        }
      } catch (error) {
        console.error("Error fetching hero content:", error);
      }
    };

    const fetchRealStats = async () => {
      try {
        // عدد المحامين الحقيقيين
        const { count: lawyersCount } = await supabase
          .from("user_roles")
          .select("*", { count: 'exact', head: true })
          .eq("role", "lawyer");

        // عدد الاستشارات (من جدول support_chats أو يمكن استخدام جدول آخر)
        const { count: consultationsCount } = await supabase
          .from("contract_analyses")
          .select("*", { count: 'exact', head: true });

        // نسبة الرضا (يمكن حسابها من التقييمات)
        const { data: ratings } = await supabase
          .from("contract_ratings")
          .select("rating");

        let satisfactionRate = 0;
        if (ratings && ratings.length > 0) {
          const avgRating = ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length;
          satisfactionRate = Math.round((avgRating / 5) * 100);
        }

        setContent(prev => ({
          ...prev,
          stat1Value: String(lawyersCount || 0),
          stat1Label: "محامي حقيقي",
          stat2Value: String(consultationsCount || 0),
          stat2Label: "تحليل منجز",
          stat3Value: satisfactionRate > 0 ? `${satisfactionRate}%` : "0%",
          stat3Label: "نسبة الرضا الفعلية"
        }));
      } catch (error) {
        console.error("Error fetching real stats for admin:", error);
      }
    };

    fetchContent();
  }, [isAdmin]);

  return (
    <section className="relative min-h-[90vh] flex items-center">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-hero-pattern pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 animate-fade-up">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{content.badge}</span>
            {isAdmin && (
              <span className="text-xs bg-primary/20 px-2 py-0.5 rounded-full text-primary">
                إحصاءات حقيقية
              </span>
            )}
          </div>

          {/* Main Heading */}
          <h1 className="font-cairo font-black text-4xl md:text-6xl lg:text-7xl text-foreground leading-tight animate-fade-up" style={{ animationDelay: "0.1s" }}>
            {content.titleLine1}
            <br />
            <span className="text-gradient-golden">{content.titleLine2}</span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: "0.2s" }}>
            {content.description}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <Link to="/consultation">
              <Button variant="hero" size="xl" className="group">
                <span>{content.ctaButton1}</span>
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="golden-outline" size="xl">
                {content.ctaButton2}
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-12 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="font-cairo font-bold text-3xl text-foreground">{content.stat1Value}</p>
              <p className="text-sm text-muted-foreground">{content.stat1Label}</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="font-cairo font-bold text-3xl text-foreground">{content.stat2Value}</p>
              <p className="text-sm text-muted-foreground">{content.stat2Label}</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="font-cairo font-bold text-3xl text-foreground">{content.stat3Value}</p>
              <p className="text-sm text-muted-foreground">{content.stat3Label}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
