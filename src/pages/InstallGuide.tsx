import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Smartphone, 
  Download, 
  CheckCircle2, 
  ChevronLeft,
  Globe,
  Share,
  Plus,
  MoreVertical,
  ArrowDown,
  Monitor,
  Apple,
  Layers
} from "lucide-react";
import { Link } from "react-router-dom";
import { usePWA } from "@/hooks/usePWA";
import { toast } from "sonner";
import newLogo from "@/assets/new-logo.png";

export default function InstallGuide() {
  const { isInstallable, installApp } = usePWA();

  const handleInstallPWA = async () => {
    const success = await installApp();
    if (success) {
      toast.success('تم تثبيت التطبيق بنجاح!');
    }
  };

  const iosSteps = [
    {
      step: 1,
      title: "افتح Safari",
      description: "افتح متصفح Safari على جهاز iPhone أو iPad",
      icon: Globe,
    },
    {
      step: 2,
      title: "زر موقع محامي كوم",
      description: "اذهب إلى mohamie.com في شريط العنوان",
      icon: Globe,
    },
    {
      step: 3,
      title: "اضغط على زر المشاركة",
      description: "اضغط على أيقونة المشاركة (المربع مع السهم للأعلى) في أسفل الشاشة",
      icon: Share,
    },
    {
      step: 4,
      title: "إضافة إلى الشاشة الرئيسية",
      description: "مرر للأسفل واختر 'إضافة إلى الشاشة الرئيسية'",
      icon: Plus,
    },
    {
      step: 5,
      title: "تأكيد التثبيت",
      description: "اضغط 'إضافة' في الزاوية العلوية اليسرى",
      icon: CheckCircle2,
    },
  ];

  const androidSteps = [
    {
      step: 1,
      title: "افتح Chrome",
      description: "افتح متصفح Chrome على جهاز Android",
      icon: Globe,
    },
    {
      step: 2,
      title: "زر موقع محامي كوم",
      description: "اذهب إلى mohamie.com في شريط العنوان",
      icon: Globe,
    },
    {
      step: 3,
      title: "اضغط على القائمة",
      description: "اضغط على النقاط الثلاث (⋮) في أعلى يمين الشاشة",
      icon: MoreVertical,
    },
    {
      step: 4,
      title: "تثبيت التطبيق",
      description: "اختر 'تثبيت التطبيق' أو 'إضافة إلى الشاشة الرئيسية'",
      icon: Download,
    },
    {
      step: 5,
      title: "تأكيد التثبيت",
      description: "اضغط 'تثبيت' في النافذة المنبثقة",
      icon: CheckCircle2,
    },
  ];

  const desktopSteps = [
    {
      step: 1,
      title: "افتح المتصفح",
      description: "افتح Chrome أو Edge على جهاز الكمبيوتر",
      icon: Monitor,
    },
    {
      step: 2,
      title: "زر موقع محامي كوم",
      description: "اذهب إلى mohamie.com",
      icon: Globe,
    },
    {
      step: 3,
      title: "اضغط على أيقونة التثبيت",
      description: "ستظهر أيقونة تثبيت في شريط العنوان (أو اضغط على القائمة واختر 'تثبيت')",
      icon: ArrowDown,
    },
    {
      step: 4,
      title: "تأكيد التثبيت",
      description: "اضغط 'تثبيت' في النافذة المنبثقة",
      icon: CheckCircle2,
    },
  ];

  const appStoreSteps = [
    {
      step: 1,
      title: "افتح App Store",
      description: "افتح تطبيق App Store على جهاز iPhone أو iPad",
      icon: Apple,
    },
    {
      step: 2,
      title: "ابحث عن محامي كوم",
      description: "اكتب 'محامي كوم' في شريط البحث",
      icon: Globe,
    },
    {
      step: 3,
      title: "اضغط تحميل",
      description: "اضغط على زر 'تحميل' أو أيقونة السحابة",
      icon: Download,
    },
    {
      step: 4,
      title: "افتح التطبيق",
      description: "بعد التثبيت، افتح التطبيق وسجّل الدخول",
      icon: CheckCircle2,
    },
  ];

  const playStoreSteps = [
    {
      step: 1,
      title: "افتح Play Store",
      description: "افتح تطبيق Google Play Store على جهاز Android",
      icon: Layers,
    },
    {
      step: 2,
      title: "ابحث عن محامي كوم",
      description: "اكتب 'محامي كوم' في شريط البحث",
      icon: Globe,
    },
    {
      step: 3,
      title: "اضغط تثبيت",
      description: "اضغط على زر 'تثبيت'",
      icon: Download,
    },
    {
      step: 4,
      title: "افتح التطبيق",
      description: "بعد التثبيت، افتح التطبيق وسجّل الدخول",
      icon: CheckCircle2,
    },
  ];

  const StepsList = ({ steps }: { steps: typeof iosSteps }) => (
    <div className="space-y-4">
      {steps.map((item, index) => (
        <div 
          key={item.step}
          className="flex gap-4 p-4 bg-card/50 rounded-xl border border-border/50 hover:border-primary/30 transition-all"
        >
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">{item.step}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <item.icon className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">{item.title}</h3>
            </div>
            <p className="text-muted-foreground text-sm">{item.description}</p>
          </div>
          {index < steps.length - 1 && (
            <div className="hidden sm:flex items-center">
              <ChevronLeft className="w-5 h-5 text-muted-foreground rotate-90" />
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Layout>
      <SEO 
        title="دليل التثبيت | محامي كوم"
        description="تعلم كيفية تثبيت تطبيق محامي كوم على جهازك خطوة بخطوة. متوفر على iOS، Android، والمتصفح."
        keywords="تثبيت تطبيق محامي, دليل التثبيت, محامي كوم, تطبيق قانوني"
      />

      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-6 border-primary/30 text-primary">
              <Smartphone className="w-4 h-4 ml-2" />
              دليل التثبيت
            </Badge>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-gradient">كيف تثبّت</span>
              <br />
              <span className="text-foreground">محامي كوم؟</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              اتبع الخطوات البسيطة لتثبيت التطبيق على جهازك والحصول على استشارات قانونية في أي وقت
            </p>

            {/* App Logo */}
            <div className="w-24 h-24 mx-auto mb-8 rounded-2xl overflow-hidden shadow-xl shadow-primary/20 border-2 border-primary/30">
              <img src={newLogo} alt="محامي كوم" className="w-full h-full object-cover" />
            </div>

            {/* Quick Install Button */}
            {isInstallable && (
              <Button 
                onClick={handleInstallPWA}
                size="lg"
                className="h-14 px-8 gap-3 mb-4"
              >
                <Download className="w-6 h-6" />
                تثبيت سريع الآن
              </Button>
            )}
            
            <Link to="/download">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                صفحة التحميل
              </Button>
            </Link>
          </div>

          {/* Installation Tabs */}
          <Tabs defaultValue="pwa-ios" className="max-w-4xl mx-auto">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full mb-8 h-auto p-1">
              <TabsTrigger value="pwa-ios" className="flex flex-col gap-1 py-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <span className="text-xs">iPhone/iPad</span>
              </TabsTrigger>
              <TabsTrigger value="pwa-android" className="flex flex-col gap-1 py-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <span className="text-xs">Android</span>
              </TabsTrigger>
              <TabsTrigger value="desktop" className="flex flex-col gap-1 py-3">
                <Monitor className="w-5 h-5" />
                <span className="text-xs">الكمبيوتر</span>
              </TabsTrigger>
              <TabsTrigger value="stores" className="flex flex-col gap-1 py-3">
                <Download className="w-5 h-5" />
                <span className="text-xs">المتاجر</span>
              </TabsTrigger>
            </TabsList>

            {/* iOS PWA */}
            <TabsContent value="pwa-ios">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                    </div>
                    تثبيت على iPhone / iPad
                  </CardTitle>
                  <p className="text-muted-foreground">
                    ثبّت التطبيق مباشرة من متصفح Safari بدون الحاجة لـ App Store
                  </p>
                </CardHeader>
                <CardContent>
                  <StepsList steps={iosSteps} />
                  <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <p className="text-sm text-muted-foreground">
                      💡 <strong>ملاحظة:</strong> يجب استخدام متصفح Safari للتثبيت على iOS. المتصفحات الأخرى مثل Chrome لا تدعم هذه الميزة على iPhone.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Android PWA */}
            <TabsContent value="pwa-android">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                        <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                      </svg>
                    </div>
                    تثبيت على Android
                  </CardTitle>
                  <p className="text-muted-foreground">
                    ثبّت التطبيق مباشرة من متصفح Chrome بدون الحاجة لـ Play Store
                  </p>
                </CardHeader>
                <CardContent>
                  <StepsList steps={androidSteps} />
                  <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <p className="text-sm text-muted-foreground">
                      💡 <strong>ملاحظة:</strong> إذا لم تظهر خيار "تثبيت التطبيق"، جرب استخدام متصفح Chrome أو Edge.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Desktop */}
            <TabsContent value="desktop">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Monitor className="w-6 h-6 text-white" />
                    </div>
                    تثبيت على الكمبيوتر
                  </CardTitle>
                  <p className="text-muted-foreground">
                    ثبّت التطبيق على Windows أو Mac للوصول السريع
                  </p>
                </CardHeader>
                <CardContent>
                  <StepsList steps={desktopSteps} />
                  <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <p className="text-sm text-muted-foreground">
                      💡 <strong>ملاحظة:</strong> التطبيق يعمل على Chrome و Edge و Brave. متصفح Safari على Mac لا يدعم هذه الميزة بشكل كامل.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* App Stores */}
            <TabsContent value="stores">
              <div className="grid md:grid-cols-2 gap-6">
                {/* App Store */}
                <Card className="bg-card/50 border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                        </svg>
                      </div>
                      App Store
                    </CardTitle>
                    <Badge variant="secondary" className="w-fit">قريباً</Badge>
                  </CardHeader>
                  <CardContent>
                    <StepsList steps={appStoreSteps} />
                  </CardContent>
                </Card>

                {/* Play Store */}
                <Card className="bg-card/50 border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                          <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                        </svg>
                      </div>
                      Google Play
                    </CardTitle>
                    <Badge variant="secondary" className="w-fit">قريباً</Badge>
                  </CardHeader>
                  <CardContent>
                    <StepsList steps={playStoreSteps} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* FAQ Section */}
          <div className="mt-16 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">أسئلة شائعة</h2>
            
            <div className="space-y-4">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">ما الفرق بين التثبيت من المتصفح والمتجر؟</h3>
                  <p className="text-muted-foreground text-sm">
                    التثبيت من المتصفح (PWA) سريع ولا يحتاج تحميل من المتجر. التطبيق من المتجر يوفر ميزات إضافية مثل الإشعارات المتقدمة.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">هل التطبيق المثبّت من المتصفح آمن؟</h3>
                  <p className="text-muted-foreground text-sm">
                    نعم، التطبيق مشفر بالكامل ويستخدم نفس معايير الأمان المستخدمة في التطبيقات الأصلية. جميع بياناتك محمية.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">هل يعمل التطبيق بدون إنترنت؟</h3>
                  <p className="text-muted-foreground text-sm">
                    بعض الميزات تعمل بدون إنترنت مثل عرض العقود المحفوظة. الاستشارات والبحث القانوني يتطلبان اتصال بالإنترنت.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <p className="text-muted-foreground mb-6">
              هل تحتاج مساعدة؟ تواصل معنا
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/contact">
                <Button variant="outline" className="gap-2">
                  تواصل مع الدعم
                </Button>
              </Link>
              <Link to="/download">
                <Button className="gap-2">
                  <Download className="w-4 h-4" />
                  صفحة التحميل
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
