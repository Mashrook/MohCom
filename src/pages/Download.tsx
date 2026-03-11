import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  Shield, 
  Zap, 
  MessageSquare, 
  Scale, 
  FileText,
  Star,
  Download,
  CheckCircle2,
  QrCode,
  Globe,
  Link2,
  ExternalLink,
  Search,
  TrendingUp,
  Users
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import newLogo from "@/assets/new-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePWA } from "@/hooks/usePWA";
import { DEEP_LINK_ROUTES, buildDeepLink } from "@/utils/deepLinkUtils";
import { toast } from "sonner";

export default function DownloadPage() {
  const { isAdmin } = useAuth();
  const [realStats, setRealStats] = useState({ users: 0, lawyers: 0, contracts: 0 });
  const [downloadLinks, setDownloadLinks] = useState({ ios: '#', android: '#' });
  const { isInstallable, installApp } = usePWA();

  // Fetch download links
  useEffect(() => {
    const fetchLinks = async () => {
      const { data } = await supabase
        .from('app_download_links')
        .select('platform, store_url')
        .eq('is_active', true);
      
      if (data) {
        const links: Record<string, string> = { ios: '#', android: '#' };
        data.forEach(link => {
          if (link.platform === 'ios' || link.platform === 'android') {
            links[link.platform] = link.store_url || '#';
          }
        });
        setDownloadLinks(links as { ios: string; android: string });
      }
    };
    fetchLinks();
  }, []);

  // Fetch real stats for admin
  useEffect(() => {
    if (isAdmin) {
      const fetchStats = async () => {
        const [usersRes, lawyersRes, contractsRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('lawyer_profiles').select('id', { count: 'exact', head: true }),
          supabase.from('contract_downloads').select('id', { count: 'exact', head: true })
        ]);
        setRealStats({
          users: usersRes.count || 0,
          lawyers: lawyersRes.count || 0,
          contracts: contractsRes.count || 0
        });
      };
      fetchStats();
    }
  }, [isAdmin]);
  
  const appStoreUrl = downloadLinks.ios;
  const playStoreUrl = downloadLinks.android;

  const handleInstallPWA = async () => {
    const success = await installApp();
    if (success) {
      toast.success('تم تثبيت التطبيق بنجاح!');
    }
  };

  const copyDeepLink = (route: string) => {
    const link = buildDeepLink(route as keyof typeof DEEP_LINK_ROUTES);
    navigator.clipboard.writeText(link);
    toast.success('تم نسخ الرابط!');
  };

  const deepLinkIcons: Record<string, React.ElementType> = {
    consultation: MessageSquare,
    search: Search,
    contracts: FileText,
    predictions: TrendingUp,
    lawyers: Users,
    messages: MessageSquare,
    settings: Shield,
  };

  const features = [
    {
      icon: MessageSquare,
      title: "استشارات قانونية ذكية",
      description: "احصل على إجابات فورية لأسئلتك القانونية"
    },
    {
      icon: Scale,
      title: "توقع الأحكام",
      description: "تحليل ذكي لقضيتك مع نسب النجاح المتوقعة"
    },
    {
      icon: FileText,
      title: "عقود جاهزة",
      description: "مكتبة شاملة من العقود القانونية"
    },
    {
      icon: Shield,
      title: "آمن وموثوق",
      description: "تشفير كامل لجميع بياناتك ومحادثاتك"
    }
  ];

  const appStats = isAdmin 
    ? [
        { value: `${realStats.users}`, label: "مستخدم مسجل" },
        { value: `${realStats.lawyers}`, label: "محامي", icon: Star },
        { value: `${realStats.contracts}`, label: "تحميل عقود" }
      ]
    : [
        { value: "10K+", label: "مستخدم نشط" },
        { value: "4.8", label: "تقييم المستخدمين", icon: Star },
        { value: "24/7", label: "دعم متواصل" }
      ];


  return (
    <Layout>
      <SEO 
        title="تحميل التطبيق | محامي كوم"
        description="حمّل تطبيق محامي كوم على هاتفك واحصل على استشارات قانونية ذكية في أي وقت ومن أي مكان. متوفر على iOS و Android."
        keywords="تحميل تطبيق محامي, تطبيق قانوني, استشارات قانونية, محامي كوم"
      />

      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-6 border-primary/30 text-primary">
              <Smartphone className="w-4 h-4 ml-2" />
              متوفر الآن على iOS و Android
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-gradient">محامي كوم</span>
              <br />
              <span className="text-foreground">في جيبك</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              احصل على استشارات قانونية ذكية، توقعات للأحكام، وعقود جاهزة
              في أي وقت ومن أي مكان مع تطبيق محامي كوم
            </p>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <a 
                href={appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto h-16 px-8 bg-foreground hover:bg-foreground/90 text-background gap-4"
                >
                  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div className="text-right">
                    <div className="text-xs opacity-80">حمّل من</div>
                    <div className="text-lg font-semibold">App Store</div>
                  </div>
                </Button>
              </a>
              
              <a 
                href={playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto h-16 px-8 bg-foreground hover:bg-foreground/90 text-background gap-4"
                >
                  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <div className="text-right">
                    <div className="text-xs opacity-80">حمّل من</div>
                    <div className="text-lg font-semibold">Google Play</div>
                  </div>
                </Button>
              </a>
            </div>

            {/* PWA Install Button */}
            {isInstallable && (
              <div className="mb-12">
                <Button 
                  onClick={handleInstallPWA}
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 border-primary/50 hover:bg-primary/10 gap-3"
                >
                  <Globe className="w-6 h-6" />
                  <div className="text-right">
                    <div className="text-xs opacity-80">أو ثبّت مباشرة</div>
                    <div className="text-base font-semibold">تثبيت من المتصفح</div>
                  </div>
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  تثبيت سريع بدون متجر التطبيقات • <Link to="/install-guide" className="text-primary hover:underline">دليل التثبيت</Link>
                </p>
              </div>
            )}

            {/* Install Guide Link */}
            {!isInstallable && (
              <div className="mb-12">
                <Link to="/install-guide">
                  <Button variant="outline" className="gap-2">
                    <Globe className="w-4 h-4" />
                    دليل التثبيت خطوة بخطوة
                  </Button>
                </Link>
              </div>
            )}

            {/* App Preview */}
            <div className="relative max-w-md mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(43,66%,52%,0.2)] to-[hsl(48,90%,60%,0.1)] rounded-3xl blur-3xl" />
              <div className="relative bg-gradient-to-br from-card to-card/50 border border-border/50 rounded-3xl p-8 backdrop-blur-sm">
                <div className="w-28 h-28 mx-auto mb-6 rounded-full overflow-hidden shadow-2xl shadow-[hsl(43,66%,52%,0.3)] border-2 border-[hsl(43,66%,52%,0.4)]">
                  <img src={newLogo} alt="محامي كوم" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-2xl font-bold mb-2 bg-gradient-to-l from-[hsl(43,66%,52%)] via-[hsl(48,90%,60%)] to-[hsl(43,66%,52%)] bg-clip-text text-transparent">محامي كوم</h3>
                <p className="text-muted-foreground mb-4">ADVISOR AI - مستشارك القانوني الذكي</p>
                <div className="flex items-center justify-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-5 h-5 fill-[hsl(43,66%,52%)] text-[hsl(43,66%,52%)]" />
                  ))}
                  <span className="text-sm text-muted-foreground mr-2">(4.8)</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  <Download className="w-3 h-3 ml-1" />
                  مجاني مع اشتراكات اختيارية
                </Badge>
              </div>
            </div>
          </div>

          {/* QR Codes Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-4">
              <QrCode className="w-8 h-8 inline ml-2 text-primary" />
              تحميل سريع
            </h2>
            <p className="text-center text-muted-foreground mb-10">
              امسح رمز QR لتحميل التطبيق مباشرة على هاتفك
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* iOS QR Code */}
              <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <h3 className="text-xl font-bold">App Store</h3>
                  </div>
                  
                  {/* QR Code Placeholder - Will be replaced with actual QR code */}
                  <div className="w-48 h-48 mx-auto bg-white rounded-2xl p-4 mb-4">
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">قريباً</p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    امسح باستخدام كاميرا iPhone
                  </p>
                </CardContent>
              </Card>

              {/* Android QR Code */}
              <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                    <h3 className="text-xl font-bold">Google Play</h3>
                  </div>
                  
                  {/* QR Code Placeholder - Will be replaced with actual QR code */}
                  <div className="w-48 h-48 mx-auto bg-white rounded-2xl p-4 mb-4">
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">قريباً</p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    امسح باستخدام كاميرا Android
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-16">
            {appStats.map((stat, index) => (
              <Card key={index} className="bg-card/50 border-border/50 text-center">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-primary mb-1 flex items-center justify-center gap-1">
                    {stat.value}
                    {stat.icon && <stat.icon className="w-5 h-5 fill-primary" />}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Deep Links Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-4">
              <Link2 className="w-8 h-8 inline ml-2 text-primary" />
              روابط الوصول السريع
            </h2>
            <p className="text-center text-muted-foreground mb-10">
              افتح أقسام التطبيق مباشرة من أي مكان باستخدام Deep Links
            </p>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {Object.entries(DEEP_LINK_ROUTES).slice(0, 6).map(([key, route]) => {
                const IconComponent = deepLinkIcons[key] || Link2;
                return (
                  <Card key={key} className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 group">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <IconComponent className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm">{route.titleAr}</h4>
                          <p className="text-xs text-muted-foreground truncate" dir="ltr">
                            mohamie://{key}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="shrink-0"
                          onClick={() => copyDeepLink(key)}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <p className="text-center text-sm text-muted-foreground mt-6">
              💡 استخدم هذه الروابط في الاختصارات، Siri، أو Google Assistant
            </p>
          </div>

          {/* Features */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-10">
              مميزات التطبيق
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 group">
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <Card className="bg-card/50 border-border/50 max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold mb-6 text-center">متطلبات التشغيل</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    iOS
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      iOS 13.0 أو أحدث
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      متوافق مع iPhone و iPad
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                    Android
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Android 8.0 أو أحدث
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      متوافق مع جميع الأجهزة
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center mt-16">
            <p className="text-muted-foreground mb-4">
              <Zap className="w-5 h-5 inline ml-2 text-primary" />
              حمّل التطبيق الآن وابدأ تجربتك المجانية
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={appStoreUrl} target="_blank" rel="noopener noreferrer">
                <img 
                  src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" 
                  alt="Download on App Store" 
                  className="h-12"
                />
              </a>
              <a href={playStoreUrl} target="_blank" rel="noopener noreferrer">
                <img 
                  src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" 
                  alt="Get it on Google Play" 
                  className="h-[72px] -my-3"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
