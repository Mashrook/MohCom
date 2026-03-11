import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Globe, Shield, CheckCircle, AlertTriangle, Server, Lock, ExternalLink } from "lucide-react";
import { SEO } from "@/components/SEO";

const steps = [
  {
    title: "إعداد النطاق المخصص",
    icon: Globe,
    description: "ربط نطاقك الخاص بتطبيق MohCom على Railway",
    items: [
      "انتقل إلى إعدادات خدمة Railway ثم افتح قسم النطاقات (Domains)",
      "أضف النطاق الرئيسي أو الفرعي المطلوب ربطه بالتطبيق",
      "أنشئ سجلات CNAME أو ALIAS بحسب القيم التي يعرضها Railway",
      "أضف نطاق www إذا كنت تريد التحويل إليه أو منه",
      "انتظر انتشار DNS ثم تحقق من تفعيل النطاق داخل Railway",
      "حدّث SITE_URL وPUBLIC_SITE_URL بعد اعتماد النطاق النهائي",
    ],
  },
  {
    title: "شهادة SSL التلقائية",
    icon: Shield,
    description: "يتم إصدار شهادة HTTPS تلقائياً",
    items: [
      "بعد التحقق من DNS، يتم إصدار شهادة SSL تلقائياً",
      "الشهادة مُدارة بالكامل ولا تحتاج تجديد يدوي",
      "جميع الاتصالات مشفرة عبر HTTPS",
      "إذا كان لديك سجلات CAA، تأكد من السماح لـ Let's Encrypt",
    ],
  },
  {
    title: "التحقق من الإعدادات",
    icon: CheckCircle,
    description: "تأكد من صحة التكوين",
    items: [
      "استخدم dnschecker.org للتحقق من سجلات DNS",
      "تأكد من عدم وجود سجلات متعارضة",
      "أضف كلاً من النطاق الرئيسي و www كإدخالات منفصلة",
      "اختر أحدهما كنطاق رئيسي (Primary) للتحويل التلقائي",
    ],
  },
];

const statusMap: Record<string, { label: string; color: string; description: string }> = {
  Active: { label: "نشط", color: "bg-green-500/10 text-green-500 border-green-500/20", description: "النطاق يعمل ويخدم التطبيق" },
  Ready: { label: "جاهز", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", description: "DNS صحيح، بانتظار النشر" },
  Verifying: { label: "قيد التحقق", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", description: "بانتظار انتشار DNS" },
  "Setting up": { label: "قيد الإعداد", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", description: "إصدار شهادة SSL" },
  Offline: { label: "غير متصل", color: "bg-red-500/10 text-red-500 border-red-500/20", description: "DNS تغير ولم يعد يشير للخادم" },
  Failed: { label: "فشل", color: "bg-destructive/10 text-destructive border-destructive/20", description: "فشل إصدار الشهادة" },
};

const DeploymentGuide = () => {
  return (
    <Layout>
      <SEO title="دليل النشر والنطاقات | محامي كوم" description="دليل شامل لإعداد النطاق المخصص وشهادة SSL" />
      <div className="container mx-auto px-4 py-12 max-w-4xl" dir="rtl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gradient-golden mb-3">دليل النشر وإعداد النطاق</h1>
          <p className="text-muted-foreground">خطوات واضحة لربط نطاقك المخصص وتأمين التطبيق بشهادة SSL</p>
        </div>

        <div className="space-y-6">
          {steps.map((step, idx) => (
            <Card key={idx} className="glass-card border-golden/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-golden/10">
                    <step.icon className="w-5 h-5 text-golden" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {step.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-golden font-bold mt-0.5">{i + 1}.</span>
                      <span className="text-foreground/80">{item}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className="my-8 bg-golden/20" />

        <Card className="glass-card border-golden/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-golden" />
              حالات النطاق
            </CardTitle>
            <CardDescription>فهم حالة نطاقك المخصص</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(statusMap).map(([key, val]) => (
                <div key={key} className="flex items-start gap-3 p-3 rounded-lg bg-accent/30 border border-border">
                  <Badge variant="outline" className={val.color}>{val.label}</Badge>
                  <span className="text-sm text-muted-foreground">{val.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-golden/20 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              نصائح لحل المشاكل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground/80">
            <p>• تأكد من عدم وجود سجلات DNS متعارضة (سجلات قديمة تشير لخوادم أخرى)</p>
            <p>• إذا كان النطاق مستضافاً سابقاً في مكان آخر، حدّث السجلات</p>
            <p>• استخدم <a href="https://dnschecker.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">DNSChecker.org <ExternalLink className="w-3 h-3" /></a> للتحقق</p>
            <p>• تواصل مع الدعم إذا لم يتم التحقق بعد 72 ساعة</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-golden/20 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-golden" />
              ملف AASA (Universal Links)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground/80">
            <p>ملف <code className="bg-muted px-1.5 py-0.5 rounded text-xs">apple-app-site-association</code> يتم نشره تلقائياً مع كل عملية نشر.</p>
            <p>المسار: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/.well-known/apple-app-site-association</code></p>
            <p>يدعم Universal Links لتطبيقات iOS مع Team ID: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">P2SV4K77QH</code></p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DeploymentGuide;
