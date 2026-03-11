import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SEO } from "@/components/SEO";
import { CheckCircle, ArrowLeft, ArrowRight, Scale, FileText, MessageSquare, Search, Shield, Sparkles } from "lucide-react";

interface Preset {
  id: string;
  title: string;
  description: string;
  icon: typeof Scale;
  features: string[];
  recommended?: boolean;
}

const presets: Preset[] = [
  {
    id: "consultation",
    title: "استشارات قانونية",
    description: "منصة استشارات قانونية مع ذكاء اصطناعي",
    icon: MessageSquare,
    features: ["استشارات فورية بالذكاء الاصطناعي", "ربط مع محامين متخصصين", "تحليل القضايا", "سجل الاستشارات"],
    recommended: true,
  },
  {
    id: "contracts",
    title: "إدارة العقود",
    description: "إنشاء وتحليل العقود القانونية",
    icon: FileText,
    features: ["قوالب عقود جاهزة", "تحليل العقود بالذكاء الاصطناعي", "توقيع إلكتروني", "مشاركة العقود"],
  },
  {
    id: "legal-search",
    title: "بحث قانوني",
    description: "محرك بحث في الأنظمة والتشريعات",
    icon: Search,
    features: ["بحث ذكي في الأنظمة", "توقعات قانونية", "مراجع قانونية", "تحليل السوابق"],
  },
  {
    id: "full-platform",
    title: "منصة قانونية شاملة",
    description: "جميع الخدمات القانونية في منصة واحدة",
    icon: Scale,
    features: ["جميع الميزات أعلاه", "لوحة تحكم إدارية", "إدارة المحامين", "تقارير وإحصائيات"],
  },
];

const setupSteps = [
  { title: "اختيار النموذج", description: "اختر نوع التطبيق القانوني" },
  { title: "تفعيل الميزات", description: "اختر الميزات المطلوبة" },
  { title: "الإعدادات الأمنية", description: "تكوين الحماية والأمان" },
  { title: "الانطلاق", description: "ابدأ باستخدام التطبيق" },
];

const securityOptions = [
  { id: "mfa", label: "المصادقة الثنائية (MFA)", description: "طبقة أمان إضافية لحسابات المسؤولين", default: true },
  { id: "rate-limit", label: "تحديد محاولات الدخول", description: "منع هجمات القوة الغاشمة", default: true },
  { id: "password-check", label: "فحص كلمات المرور المسربة", description: "التحقق من HIBP", default: true },
  { id: "session-timeout", label: "انتهاء الجلسة التلقائي", description: "تسجيل خروج بعد فترة خمول", default: false },
];

const QuickStartWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedSecurity, setSelectedSecurity] = useState<string[]>(
    securityOptions.filter(o => o.default).map(o => o.id)
  );

  const progress = ((currentStep + 1) / setupSteps.length) * 100;

  const toggleSecurity = (id: string) => {
    setSelectedSecurity(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleComplete = () => {
    navigate("/");
  };

  return (
    <Layout>
      <SEO title="معالج البدء السريع | محامي كوم" description="ابدأ بإعداد تطبيقك القانوني في دقائق" />
      <div className="container mx-auto px-4 py-12 max-w-4xl" dir="rtl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient-golden mb-3">معالج البدء السريع</h1>
          <p className="text-muted-foreground">أعدّ تطبيقك القانوني في دقائق</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2 text-xs text-muted-foreground">
            {setupSteps.map((step, i) => (
              <span key={i} className={i <= currentStep ? "text-golden font-medium" : ""}>{step.title}</span>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step 0: Choose Preset */}
        {currentStep === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {presets.map(preset => (
              <Card
                key={preset.id}
                className={`cursor-pointer transition-all hover:border-golden/50 ${
                  selectedPreset === preset.id ? "border-golden ring-2 ring-golden/20" : "glass-card border-golden/20"
                }`}
                onClick={() => setSelectedPreset(preset.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <preset.icon className="w-5 h-5 text-golden" />
                      <CardTitle className="text-base">{preset.title}</CardTitle>
                    </div>
                    {preset.recommended && <Badge className="bg-golden/20 text-golden border-golden/30">موصى به</Badge>}
                  </div>
                  <CardDescription className="text-xs">{preset.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {preset.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Step 1: Features */}
        {currentStep === 1 && selectedPreset && (
          <Card className="glass-card border-golden/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-golden" />
                الميزات المتضمنة
              </CardTitle>
              <CardDescription>الميزات التي سيتم تفعيلها بناءً على اختيارك</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {(presets.find(p => p.id === selectedPreset)?.features || []).map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 border border-border">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm">{f}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-golden/5 border border-golden/20">
                  <CheckCircle className="w-4 h-4 text-golden shrink-0" />
                  <span className="text-sm">تسجيل دخول عبر Apple و Google</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-golden/5 border border-golden/20">
                  <CheckCircle className="w-4 h-4 text-golden shrink-0" />
                  <span className="text-sm">دعم Universal Links (iOS)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Security */}
        {currentStep === 2 && (
          <Card className="glass-card border-golden/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-golden" />
                الإعدادات الأمنية
              </CardTitle>
              <CardDescription>اختر مستوى الحماية لتطبيقك</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {securityOptions.map(opt => (
                <div
                  key={opt.id}
                  className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedSecurity.includes(opt.id) ? "border-golden bg-golden/5" : "border-border bg-accent/20"
                  }`}
                  onClick={() => toggleSecurity(opt.id)}
                >
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                  <CheckCircle className={`w-5 h-5 ${selectedSecurity.includes(opt.id) ? "text-golden" : "text-muted-foreground/30"}`} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Complete */}
        {currentStep === 3 && (
          <Card className="glass-card border-golden/20 text-center py-8">
            <CardContent className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold">تم الإعداد بنجاح! 🎉</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                تطبيقك القانوني جاهز للاستخدام. يمكنك البدء في استكشاف الميزات المتاحة.
              </p>
              <Button variant="golden" onClick={handleComplete} className="mt-4">
                ابدأ الآن
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(s => s - 1)}
            disabled={currentStep === 0}
            className="border-golden/30"
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            السابق
          </Button>
          <Button
            variant="golden"
            onClick={() => setCurrentStep(s => s + 1)}
            disabled={currentStep === 0 && !selectedPreset || currentStep === setupSteps.length - 1}
          >
            التالي
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default QuickStartWizard;
