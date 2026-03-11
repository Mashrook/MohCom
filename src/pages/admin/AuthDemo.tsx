import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle, XCircle, Shield, UserCheck, KeyRound, Globe } from "lucide-react";
import { toast } from "sonner";

const AuthDemo = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<Record<string, { status: "pass" | "fail" | "pending"; message: string }>>({});
  const [isRunning, setIsRunning] = useState(false);

  const runTest = async (name: string, fn: () => Promise<string>) => {
    setTestResults(prev => ({ ...prev, [name]: { status: "pending", message: "جاري الاختبار..." } }));
    try {
      const msg = await fn();
      setTestResults(prev => ({ ...prev, [name]: { status: "pass", message: msg } }));
    } catch (err) {
      setTestResults(prev => ({ ...prev, [name]: { status: "fail", message: err instanceof Error ? err.message : "فشل" } }));
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults({});

    await runTest("session", async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) throw new Error("لا توجد جلسة نشطة");
      return `الجلسة نشطة، تنتهي: ${new Date(data.session.expires_at! * 1000).toLocaleString("ar-SA")}`;
    });

    await runTest("user_role", async () => {
      if (!user) throw new Error("لم يتم تسجيل الدخول");
      const { data } = await supabase.rpc("get_user_role", { _user_id: user.id });
      return `الدور: ${data || "غير محدد"}`;
    });

    await runTest("mfa_status", async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verified = data.totp?.filter(f => f.status === "verified");
      return verified?.length ? `MFA مفعّل (${verified.length} عامل)` : "MFA غير مفعّل";
    });

    await runTest("rls_profiles", async () => {
      const { data, error } = await supabase.from("profiles").select("id").limit(1);
      if (error) throw error;
      return `يمكن الوصول للملفات الشخصية (${data.length} نتيجة)`;
    });

    await runTest("rls_admin_audit", async () => {
      const { data, error } = await supabase.from("admin_audit_log").select("id").limit(1);
      if (error) throw new Error(`RLS محمي: ${error.message}`);
      return `يمكن الوصول لسجل المسؤول (${data.length} نتيجة)`;
    });

    await runTest("rate_limit", async () => {
      const { data } = await supabase.rpc("is_login_rate_limited", { p_email: "test@test.com" });
      return data ? "Rate limit نشط لـ test@test.com" : "لا يوجد rate limit لـ test@test.com";
    });

    setIsRunning(false);
    toast.success("اكتملت جميع الاختبارات");
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "pass") return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === "fail") return <XCircle className="w-5 h-5 text-destructive" />;
    return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
  };

  const tests = [
    { key: "session", label: "التحقق من الجلسة", icon: KeyRound },
    { key: "user_role", label: "دور المستخدم", icon: UserCheck },
    { key: "mfa_status", label: "حالة MFA", icon: Shield },
    { key: "rls_profiles", label: "RLS - الملفات الشخصية", icon: Globe },
    { key: "rls_admin_audit", label: "RLS - سجل المسؤول", icon: Shield },
    { key: "rate_limit", label: "حد محاولات الدخول", icon: Shield },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gradient-golden">اختبار المصادقة والأمان</h1>
          <p className="text-muted-foreground mt-2">لوحة اختبار لفحص حالة المصادقة وصلاحيات الوصول وسياسات الأمان</p>
        </div>

        <Card className="glass-card border-golden/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              المستخدم الحالي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">البريد:</span>
              <Badge variant="outline">{user?.email || "غير مسجل"}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">الاسم:</span>
              <Badge variant="outline">{user?.user_metadata?.full_name || "غير محدد"}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">المعرف:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">{user?.id || "-"}</code>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-golden/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                اختبارات الأمان
              </span>
              <Button variant="golden" onClick={runAllTests} disabled={isRunning}>
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                تشغيل جميع الاختبارات
              </Button>
            </CardTitle>
            <CardDescription>فحص شامل لصلاحيات الوصول وسياسات الأمان</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tests.map(test => {
                const result = testResults[test.key];
                return (
                  <div key={test.key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                    <div className="flex items-center gap-3">
                      <test.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{test.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {result && (
                        <>
                          <span className="text-sm text-muted-foreground max-w-xs truncate">{result.message}</span>
                          <StatusIcon status={result.status} />
                        </>
                      )}
                      {!result && <Badge variant="secondary">لم يُختبر</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AuthDemo;
