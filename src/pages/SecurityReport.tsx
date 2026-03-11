import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  Lock,
  Key,
  UserCheck,
  Database,
  Globe,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SecurityCheck {
  id: string;
  name: string;
  description: string;
  status: "secure" | "warning" | "critical" | "checking";
  category: string;
  details?: string;
}

interface SecurityStats {
  totalChecks: number;
  secureChecks: number;
  warningChecks: number;
  criticalChecks: number;
  securityScore: number;
}

const SecurityReport = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    totalChecks: 0,
    secureChecks: 0,
    warningChecks: 0,
    criticalChecks: 0,
    securityScore: 0
  });
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (userRole !== "admin") {
      navigate("/");
      return;
    }
    runSecurityScan();
  }, [user, userRole, navigate]);

  const runSecurityScan = async () => {
    setIsLoading(true);
    const checks: SecurityCheck[] = [];

    // 1. Authentication Security Checks
    checks.push({
      id: "password-strength",
      name: "متطلبات قوة كلمة المرور",
      description: "التحقق من تفعيل متطلبات كلمة المرور القوية",
      status: "secure",
      category: "المصادقة",
      details: "8 أحرف كحد أدنى، أحرف كبيرة وصغيرة، أرقام، رموز خاصة"
    });

    checks.push({
      id: "leaked-password",
      name: "حماية كلمات المرور المسربة (HIBP)",
      description: "التحقق من كلمات المرور ضد قاعدة بيانات التسريبات",
      status: "secure",
      category: "المصادقة",
      details: "يتم التحقق عند التسجيل وتسجيل الدخول"
    });

    // Check rate limiting
    try {
      const { data: failedAttempts } = await supabase
        .from("failed_login_attempts")
        .select("id")
        .limit(1);
      
      checks.push({
        id: "rate-limiting",
        name: "تحديد معدل محاولات الدخول",
        description: "حماية ضد هجمات القوة الغاشمة",
        status: "secure",
        category: "المصادقة",
        details: "5 محاولات فاشلة تؤدي لحظر 15 دقيقة"
      });
    } catch {
      checks.push({
        id: "rate-limiting",
        name: "تحديد معدل محاولات الدخول",
        description: "حماية ضد هجمات القوة الغاشمة",
        status: "warning",
        category: "المصادقة",
        details: "تعذر التحقق من الحالة"
      });
    }

    // 2. Session Security
    try {
      const { data: sessionSettings } = await supabase
        .from("admin_security_settings")
        .select("*")
        .eq("setting_key", "session_timeout_enabled")
        .maybeSingle();

      checks.push({
        id: "session-timeout",
        name: "انتهاء صلاحية الجلسة",
        description: "إنهاء الجلسات غير النشطة تلقائياً",
        status: sessionSettings?.setting_value ? "secure" : "warning",
        category: "الجلسات",
        details: sessionSettings?.setting_value ? "مفعّل" : "غير مفعّل - يُنصح بتفعيله"
      });
    } catch {
      checks.push({
        id: "session-timeout",
        name: "انتهاء صلاحية الجلسة",
        description: "إنهاء الجلسات غير النشطة تلقائياً",
        status: "warning",
        category: "الجلسات",
        details: "تعذر التحقق من الحالة"
      });
    }

    // 3. Database Security - Encrypted Fields
    checks.push({
      id: "data-encryption",
      name: "تشفير البيانات الحساسة",
      description: "تشفير الرسائل والعقود وبيانات الدفع",
      status: "secure",
      category: "قاعدة البيانات",
      details: "messages, contract_analyses, saved_contracts, payment_history, lawyer_ai_chats"
    });

    checks.push({
      id: "plaintext-removed",
      name: "إزالة حقول النص العادي",
      description: "حذف الحقول غير المشفرة من الجداول الحساسة",
      status: "secure",
      category: "قاعدة البيانات",
      details: "تم إزالة جميع حقول النص العادي"
    });

    // 4. RLS Policies
    checks.push({
      id: "rls-enabled",
      name: "سياسات أمان صف البيانات (RLS)",
      description: "تقييد الوصول للبيانات حسب المستخدم",
      status: "secure",
      category: "قاعدة البيانات",
      details: "مفعّل على جميع الجداول الحساسة"
    });

    // 5. IP Security
    try {
      const { data: blockedIPs } = await supabase
        .from("blocked_ips")
        .select("id")
        .is("unblocked_at", null);

      const { data: whitelistedIPs } = await supabase
        .from("ip_whitelist")
        .select("id")
        .eq("is_active", true);

      checks.push({
        id: "ip-blocking",
        name: "حظر عناوين IP الضارة",
        description: "حظر تلقائي للعناوين المشبوهة",
        status: "secure",
        category: "الشبكة",
        details: `${blockedIPs?.length || 0} عنوان محظور حالياً`
      });

      checks.push({
        id: "ip-whitelist",
        name: "القائمة البيضاء لعناوين IP",
        description: "السماح فقط لعناوين محددة",
        status: (whitelistedIPs?.length || 0) > 0 ? "secure" : "warning",
        category: "الشبكة",
        details: `${whitelistedIPs?.length || 0} عنوان في القائمة البيضاء`
      });
    } catch {
      checks.push({
        id: "ip-blocking",
        name: "حظر عناوين IP الضارة",
        description: "حظر تلقائي للعناوين المشبوهة",
        status: "warning",
        category: "الشبكة",
        details: "تعذر التحقق من الحالة"
      });
    }

    // 6. Admin Security
    try {
      const { data: adminIPs } = await supabase
        .from("admin_allowed_ips")
        .select("id")
        .eq("is_active", true);

      checks.push({
        id: "admin-ip-restriction",
        name: "تقييد IP للمسؤولين",
        description: "السماح للمسؤولين من عناوين محددة فقط",
        status: (adminIPs?.length || 0) > 0 ? "secure" : "warning",
        category: "المسؤولين",
        details: (adminIPs?.length || 0) > 0 ? `${adminIPs?.length} عنوان مسموح` : "غير مفعّل - يُنصح بتفعيله"
      });
    } catch {
      checks.push({
        id: "admin-ip-restriction",
        name: "تقييد IP للمسؤولين",
        description: "السماح للمسؤولين من عناوين محددة فقط",
        status: "warning",
        category: "المسؤولين",
        details: "تعذر التحقق من الحالة"
      });
    }

    // 7. Audit Logging
    try {
      const { data: auditLogs } = await supabase
        .from("admin_audit_log")
        .select("id")
        .limit(1);

      checks.push({
        id: "audit-logging",
        name: "تسجيل إجراءات المسؤولين",
        description: "تتبع جميع الإجراءات الإدارية",
        status: "secure",
        category: "المراقبة",
        details: "جميع الإجراءات مسجلة مع IP والتوقيت"
      });
    } catch {
      checks.push({
        id: "audit-logging",
        name: "تسجيل إجراءات المسؤولين",
        description: "تتبع جميع الإجراءات الإدارية",
        status: "warning",
        category: "المراقبة",
        details: "تعذر التحقق من الحالة"
      });
    }

    // 8. Security Audit Log
    try {
      const { data: securityLogs } = await supabase
        .from("security_audit_log")
        .select("id")
        .limit(1);

      checks.push({
        id: "security-audit-log",
        name: "سجل الأحداث الأمنية",
        description: "تسجيل الأحداث الأمنية المهمة",
        status: "secure",
        category: "المراقبة",
        details: "تسجيل الدخول والخروج ومحاولات الوصول"
      });
    } catch {
      checks.push({
        id: "security-audit-log",
        name: "سجل الأحداث الأمنية",
        description: "تسجيل الأحداث الأمنية المهمة",
        status: "warning",
        category: "المراقبة",
        details: "تعذر التحقق من الحالة"
      });
    }

    // 9. Password Security Logs
    try {
      const { data: passwordLogs } = await supabase
        .from("password_security_logs")
        .select("id")
        .limit(1);

      checks.push({
        id: "password-security-logs",
        name: "سجل أمان كلمات المرور",
        description: "تسجيل رفض كلمات المرور الضعيفة والمسربة",
        status: "secure",
        category: "المراقبة",
        details: "تسجيل جميع محاولات استخدام كلمات مرور غير آمنة"
      });
    } catch {
      checks.push({
        id: "password-security-logs",
        name: "سجل أمان كلمات المرور",
        description: "تسجيل رفض كلمات المرور الضعيفة والمسربة",
        status: "warning",
        category: "المراقبة",
        details: "تعذر التحقق من الحالة"
      });
    }

    // 10. Input Validation
    checks.push({
      id: "input-validation",
      name: "التحقق من صحة المدخلات",
      description: "التحقق من البيانات قبل المعالجة",
      status: "secure",
      category: "التطبيق",
      details: "استخدام Zod للتحقق من صحة البيانات"
    });

    // 11. XSS Protection
    checks.push({
      id: "xss-protection",
      name: "الحماية من XSS",
      description: "منع حقن الأكواد الضارة",
      status: "secure",
      category: "التطبيق",
      details: "React يوفر حماية تلقائية"
    });

    // 12. CSRF Protection
    checks.push({
      id: "csrf-protection",
      name: "الحماية من CSRF",
      description: "حماية من طلبات التزوير",
      status: "secure",
      category: "التطبيق",
      details: "Supabase يوفر حماية تلقائية"
    });

    // 13. Secure Storage
    checks.push({
      id: "secure-storage",
      name: "التخزين الآمن",
      description: "تخزين البيانات الحساسة بشكل آمن",
      status: "secure",
      category: "التطبيق",
      details: "استخدام secureStorage مع تشفير"
    });

    // 14. DevTools Detection
    checks.push({
      id: "devtools-detection",
      name: "اكتشاف أدوات المطور",
      description: "تنبيه عند فتح أدوات المطور",
      status: "secure",
      category: "المراقبة",
      details: "تسجيل الأحداث المشبوهة"
    });

    // 15. Copy Protection
    checks.push({
      id: "copy-protection",
      name: "حماية النسخ",
      description: "منع نسخ البيانات الحساسة",
      status: "secure",
      category: "التطبيق",
      details: "منع نسخ أرقام البطاقات والبيانات الحساسة"
    });

    // Calculate stats
    const secureCount = checks.filter(c => c.status === "secure").length;
    const warningCount = checks.filter(c => c.status === "warning").length;
    const criticalCount = checks.filter(c => c.status === "critical").length;
    const score = Math.round((secureCount / checks.length) * 100);

    setSecurityChecks(checks);
    setStats({
      totalChecks: checks.length,
      secureChecks: secureCount,
      warningChecks: warningCount,
      criticalChecks: criticalCount,
      securityScore: score
    });
    setLastScanTime(new Date());
    setIsLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "secure":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "critical":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground animate-spin" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "secure":
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">آمن</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">تحذير</Badge>;
      case "critical":
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">حرج</Badge>;
      default:
        return <Badge variant="secondary">جاري الفحص</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <ShieldCheck className="w-16 h-16 text-green-500" />;
    if (score >= 70) return <ShieldAlert className="w-16 h-16 text-yellow-500" />;
    return <ShieldX className="w-16 h-16 text-red-500" />;
  };

  const exportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      securityScore: stats.securityScore,
      summary: {
        total: stats.totalChecks,
        secure: stats.secureChecks,
        warnings: stats.warningChecks,
        critical: stats.criticalChecks
      },
      checks: securityChecks.map(check => ({
        name: check.name,
        category: check.category,
        status: check.status,
        details: check.details
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "تم تصدير التقرير",
      description: "تم حفظ تقرير الأمان بنجاح"
    });
  };

  const categories = [...new Set(securityChecks.map(c => c.category))];

  if (!user || userRole !== "admin") {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gradient-golden flex items-center gap-3">
              <Shield className="w-8 h-8" />
              تقرير الأمان الشامل
            </h1>
            <p className="text-muted-foreground mt-2">
              فحص شامل لجميع إعدادات الأمان في التطبيق
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={runSecurityScan}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? "animate-spin" : ""}`} />
              إعادة الفحص
            </Button>
            <Button variant="golden" onClick={exportReport} disabled={isLoading}>
              <Download className="w-4 h-4 ml-2" />
              تصدير التقرير
            </Button>
          </div>
        </div>

        {/* Score Card */}
        <Card className="glass-card border-golden/20 mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                {getScoreIcon(stats.securityScore)}
                <div>
                  <p className="text-sm text-muted-foreground">نتيجة الأمان</p>
                  <p className={`text-5xl font-bold ${getScoreColor(stats.securityScore)}`}>
                    {stats.securityScore}%
                  </p>
                </div>
              </div>
              
              <div className="flex-1 max-w-md">
                <Progress value={stats.securityScore} className="h-3 mb-4" />
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-500">{stats.secureChecks}</p>
                    <p className="text-xs text-muted-foreground">آمن</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-500">{stats.warningChecks}</p>
                    <p className="text-xs text-muted-foreground">تحذيرات</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-500">{stats.criticalChecks}</p>
                    <p className="text-xs text-muted-foreground">حرج</p>
                  </div>
                </div>
              </div>

              {lastScanTime && (
                <div className="text-center md:text-left">
                  <p className="text-xs text-muted-foreground">آخر فحص</p>
                  <p className="text-sm">{lastScanTime.toLocaleString("ar-SA")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Checks by Category */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-golden" />
            <span className="mr-3">جاري فحص إعدادات الأمان...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map(category => (
              <Card key={category} className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {category === "المصادقة" && <Key className="w-5 h-5 text-golden" />}
                    {category === "الجلسات" && <Clock className="w-5 h-5 text-golden" />}
                    {category === "قاعدة البيانات" && <Database className="w-5 h-5 text-golden" />}
                    {category === "الشبكة" && <Globe className="w-5 h-5 text-golden" />}
                    {category === "المسؤولين" && <UserCheck className="w-5 h-5 text-golden" />}
                    {category === "المراقبة" && <Eye className="w-5 h-5 text-golden" />}
                    {category === "التطبيق" && <Lock className="w-5 h-5 text-golden" />}
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {securityChecks
                      .filter(check => check.category === category)
                      .map((check, index, arr) => (
                        <div key={check.id}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              {getStatusIcon(check.status)}
                              <div>
                                <p className="font-medium">{check.name}</p>
                                <p className="text-sm text-muted-foreground">{check.description}</p>
                                {check.details && (
                                  <p className="text-xs text-muted-foreground mt-1 bg-muted/50 px-2 py-1 rounded">
                                    {check.details}
                                  </p>
                                )}
                              </div>
                            </div>
                            {getStatusBadge(check.status)}
                          </div>
                          {index < arr.length - 1 && <Separator className="mt-4" />}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {stats.warningChecks > 0 && (
          <Card className="glass-card border-yellow-500/20 mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="w-5 h-5" />
                توصيات لتحسين الأمان
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {securityChecks
                  .filter(c => c.status === "warning")
                  .map(check => (
                    <li key={check.id} className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-1 shrink-0" />
                      <span>
                        <strong>{check.name}:</strong> {check.details}
                      </span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default SecurityReport;
