import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import splashLogo from "@/assets/splash-logo.jpg";
import { isIOSApp } from "@/utils/isIOSApp";

const footerLinks = {
  services: [
    { href: "/consultation", label: "الاستشارات القانونية" },
    { href: "/predictions", label: "التنبؤ بالأحكام" },
    { href: "/contracts", label: "إدارة العقود" },
    { href: "/lawyers", label: "تجمع المحامين" },
    { href: "/legal-search", label: "البحث القانوني" },
  ],
  company: [
    { href: "/auth", label: "تسجيل الدخول" },
    { href: "/about", label: "عن المنصة" },
    { href: "/pricing", label: "خطط الاشتراك" },
    
    { href: "/contact", label: "تواصل معنا" },
    { href: "/faq", label: "الأسئلة الشائعة" },
    { href: "/privacy", label: "سياسة الخصوصية" },
    { href: "/terms", label: "الشروط والأحكام" },
    { href: "/refund", label: "سياسة الاسترجاع" },
  ],
};

interface FooterContent {
  description: string;
  email: string;
  phone: string;
  address: string;
  copyright: string;
  tagline: string;
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
}

const defaultContent: FooterContent = {
  description: "منصة احترافية تجمع نخبة من المحامين لتقديم الاستشارات والخدمات القانونية من خلال خبرة جماعية موثوقة بتقنية ذكية.",
  email: "info@mohamie.com",
  phone: "+966 53 109 9732",
  address: "المملكة العربية السعودية",
  copyright: "محامي كوم. جميع الحقوق محفوظة.",
  tagline: "مدعوم بتقنيات الذكاء الاصطناعي",
  facebookUrl: "#",
  twitterUrl: "#",
  instagramUrl: "#",
  linkedinUrl: "#"
};

export function Footer() {
  const [content, setContent] = useState<FooterContent>(defaultContent);
  const iosApp = isIOSApp();

  const filteredCompanyLinks = iosApp
    ? footerLinks.company.filter(link => link.href !== "/pricing")
    : footerLinks.company;

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data } = await supabase
          .from("site_content")
          .select("content")
          .eq("page_key", "footer")
          .maybeSingle();

        if (data?.content && typeof data.content === 'object') {
          setContent(prev => ({ ...prev, ...(data.content as Partial<FooterContent>) }));
        }
      } catch (error) {
        console.error("Error fetching footer content:", error);
      }
    };

    fetchContent();
  }, []);

  const socialLinks = [
    { icon: Facebook, href: content.facebookUrl, label: "Facebook" },
    { icon: Twitter, href: content.twitterUrl, label: "Twitter" },
    { icon: Instagram, href: content.instagramUrl, label: "Instagram" },
    { icon: Linkedin, href: content.linkedinUrl, label: "LinkedIn" },
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="group flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/20 transition-all duration-300 group-hover:border-primary/60 group-hover:shadow-[0_0_20px_hsl(43,66%,52%,0.5)] group-hover:scale-105">
                <img src={splashLogo} alt="محامي كوم" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold bg-gradient-to-l from-[hsl(43,66%,52%)] via-[hsl(48,90%,60%)] to-[hsl(43,66%,52%)] bg-clip-text text-transparent">
                  محامي كوم
                </span>
                <span className="text-xs text-muted-foreground font-medium -mt-0.5">ADVISOR AI</span>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {content.description}
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-cairo font-semibold text-lg text-foreground mb-6">خدماتنا</h4>
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors duration-300 text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-cairo font-semibold text-lg text-foreground mb-6">الشركة</h4>
            <ul className="space-y-3">
              {filteredCompanyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors duration-300 text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-cairo font-semibold text-lg text-foreground mb-6">تواصل معنا</h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-muted-foreground text-sm">
                <Mail className="w-5 h-5 text-primary" />
                <span>{content.email}</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground text-sm">
                <Phone className="w-5 h-5 text-primary" />
                <span dir="ltr">{content.phone}</span>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground text-sm">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>{content.address}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} {content.copyright}
          </p>
          <p className="text-muted-foreground text-sm">
            {content.tagline}
          </p>
        </div>
      </div>
    </footer>
  );
}
