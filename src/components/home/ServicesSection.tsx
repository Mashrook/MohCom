import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  MessageSquare, 
  Scale, 
  FileText, 
  Users, 
  Search, 
  AlertCircle,
  ArrowLeft,
  LucideIcon,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Service {
  icon: string;
  title: string;
  description: string;
  href: string;
}

interface ServicesContent {
  badge: string;
  title: string;
  description: string;
  services: Service[];
}

const iconMap: Record<string, LucideIcon> = {
  MessageSquare,
  Scale,
  FileText,
  Users,
  Search,
  AlertCircle
};

const defaultContent: ServicesContent = {
  badge: "الخدمات القانونية في محاميكم",
  title: "مجموعة متكاملة من الخدمات القانونية",
  description: "خدمات قانونية مدعومة بالذكاء الاصطناعي، مصممة لتمنحك سرعة، دقة، وخصوصية في كل خطوة.",
  services: [
    { icon: "MessageSquare", title: "استشارات قانونية فورية", description: "أدخل سؤالك القانوني واحصل على إجابة دقيقة خلال ثوانٍ، بأسلوب واضح ومتوافق مع الأنظمة السعودية.", href: "/consultation" },
    { icon: "Scale", title: "تنبؤ أحكام القضايا", description: "نظام ذكي يحلل معطيات القضية ويقدم تنبؤًا عالي الدقة لنتيجة الحكم بنسبة تتجاوز 95%.", href: "/predictions" },
    { icon: "FileText", title: "نماذج عقود احترافية", description: "مكتبة عقود تغطي المجالات التجارية، العمالية، العقارية، التقنية وغيرها، مع إمكانية تخصيصها تلقائيًا.", href: "/contracts" },
    { icon: "Search", title: "بحث قانوني ذكي", description: "محرك بحث قانوني يعتمد على الذكاء الاصطناعي لاستخراج الأنظمة، اللوائح، السوابق، والمبادئ القانونية بسرعة.", href: "/legal-search" },
    { icon: "AlertCircle", title: "تقديم الشكاوى الذكي", description: "تحليل الشكوى، تحديد الجهة المختصة، وصياغة الشكوى قانونيًا ثم تحويلها تلقائيًا للجهة المناسبة.", href: "/complaints" },
    { icon: "Users", title: "حماية كاملة لخصوصيتك", description: "تصميم المنصة يراعي سرية بياناتك القانونية، مع الحد الأدنى من تخزين المعلومات وحمايتها بأعلى المعايير.", href: "/about" }
  ]
};

export function ServicesSection() {
  const [content, setContent] = useState<ServicesContent>(defaultContent);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data } = await supabase
          .from("site_content")
          .select("content")
          .eq("page_key", "home_services")
          .maybeSingle();

        if (data?.content && typeof data.content === 'object') {
          setContent(prev => ({ ...prev, ...(data.content as Partial<ServicesContent>) }));
        }
      } catch (error) {
        console.error("Error fetching services content:", error);
      }
    };

    fetchContent();
    
    // Trigger animation on mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="py-24 relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header with Animation */}
        <div className={cn(
          "text-center max-w-3xl mx-auto mb-16 transition-all duration-1000",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        )}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 animate-pulse">
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

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.services.map((service, index) => {
            const IconComponent = iconMap[service.icon] || MessageSquare;
            
            return (
              <Link
                key={service.href}
                to={service.href}
                className={cn(
                  "group block transition-all duration-700",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"
                )}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div className={cn(
                  "h-full p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm",
                  "transition-all duration-500 ease-out",
                  "hover:-translate-y-3 hover:shadow-[0_20px_50px_-12px_hsl(43_66%_52%/0.35)]",
                  "hover:border-primary/60",
                  "relative overflow-hidden"
                )}>
                  {/* Animated Gradient Background */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
                  
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12" />
                  </div>

                  {/* Corner Glow */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10">
                    {/* Icon with Enhanced Animation */}
                    <div className="relative w-16 h-16 mb-6">
                      {/* Glow Ring */}
                      <div className="absolute inset-0 rounded-xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500 scale-150" />
                      
                      {/* Icon Container */}
                      <div className={cn(
                        "relative w-full h-full rounded-xl bg-gradient-to-br from-primary/20 to-primary/5",
                        "border border-primary/30 flex items-center justify-center",
                        "transition-all duration-500 ease-out",
                        "group-hover:scale-110 group-hover:rotate-3 group-hover:bg-gradient-to-br group-hover:from-primary/30 group-hover:to-primary/10",
                        "group-hover:border-primary/50 group-hover:shadow-[0_0_30px_-5px_hsl(43_66%_52%/0.5)]"
                      )}>
                        <IconComponent className="w-8 h-8 text-primary transition-all duration-500 group-hover:scale-110" />
                      </div>
                    </div>

                    {/* Content with Stagger Animation */}
                    <h3 className="font-cairo font-bold text-xl text-foreground mb-3 transition-all duration-300 group-hover:text-primary group-hover:translate-x-1">
                      {service.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-5 transition-all duration-300 group-hover:text-muted-foreground/90">
                      {service.description}
                    </p>

                    {/* Enhanced Link with Arrow Animation */}
                    <div className="flex items-center gap-2 text-primary font-medium text-sm overflow-hidden">
                      <span className="relative">
                        اكتشف المزيد
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
                      </span>
                      <div className="relative overflow-hidden w-5">
                        <ArrowLeft className="w-4 h-4 transition-all duration-300 group-hover:-translate-x-5" />
                        <ArrowLeft className="w-4 h-4 absolute top-0 translate-x-5 transition-all duration-300 group-hover:translate-x-0" />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Border Glow */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent transition-all duration-500 group-hover:w-3/4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
