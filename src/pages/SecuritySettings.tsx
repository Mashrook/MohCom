import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, ShieldCheck, ShieldOff, Smartphone, Key, AlertTriangle, CheckCircle2, Loader2, Copy, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
}

const SecuritySettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<MFAFactor[]>([]);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [aal, setAal] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchMFAStatus();
    }
  }, [user]);

  const fetchMFAStatus = async () => {
    try {
      setLoading(true);
      
      // Get current AAL level
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData) {
        setAal(aalData.currentLevel || "aal1");
      }

      // Get enrolled factors
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      setMfaFactors(data?.totp || []);
    } catch (error: any) {
      console.error("Error fetching MFA status:", error);
      toast({
        title: "خطأ",
        description: "فشل في جلب حالة المصادقة الثنائية",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startEnrollment = async () => {
    try {
      setEnrolling(true);
      
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "تطبيق المصادقة",
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setShowEnrollDialog(true);
      }
    } catch (error: any) {
      console.error("Error starting MFA enrollment:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في بدء عملية التسجيل",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const verifyAndActivate = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رمز التحقق المكون من 6 أرقام",
        variant: "destructive",
      });
      return;
    }

    try {
      setVerifying(true);

      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId,
      });

      if (challengeError) throw challengeError;

      // Verify the challenge
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: verificationCode,
      });

      if (verifyError) throw verifyError;

      toast({
        title: "تم بنجاح!",
        description: "تم تفعيل المصادقة الثنائية على حسابك",
      });

      setShowEnrollDialog(false);
      setVerificationCode("");
      setQrCode("");
      setSecret("");
      setFactorId("");
      fetchMFAStatus();
    } catch (error: any) {
      console.error("Error verifying MFA:", error);
      toast({
        title: "خطأ في التحقق",
        description: error.message || "الرمز غير صحيح، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const unenrollFactor = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factorId,
      });

      if (error) throw error;

      toast({
        title: "تم إلغاء التفعيل",
        description: "تم إلغاء المصادقة الثنائية من حسابك",
      });

      fetchMFAStatus();
    } catch (error: any) {
      console.error("Error unenrolling MFA:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في إلغاء المصادقة الثنائية",
        variant: "destructive",
      });
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast({
      title: "تم النسخ",
      description: "تم نسخ المفتاح السري",
    });
  };

  const isMFAEnabled = mfaFactors.some(f => f.status === "verified");

  return (
    <Layout>
      <SEO 
        title="إعدادات الأمان - محامي كوم"
        description="إدارة إعدادات الأمان والمصادقة الثنائية لحسابك"
      />
      
      <div className="container mx-auto px-4 py-24" dir="rtl">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <Shield className="w-16 h-16 mx-auto text-primary mb-4" />
            <h1 className="text-3xl font-bold">إعدادات الأمان</h1>
            <p className="text-muted-foreground mt-2">
              إدارة إعدادات الأمان والمصادقة الثنائية لحسابك
            </p>
          </div>

          {/* MFA Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>المصادقة الثنائية (MFA)</CardTitle>
                    <CardDescription>
                      أضف طبقة حماية إضافية لحسابك
                    </CardDescription>
                  </div>
                </div>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isMFAEnabled ? (
                  <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                    <ShieldCheck className="w-4 h-4 ml-1" />
                    مفعّل
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    <ShieldOff className="w-4 h-4 ml-1" />
                    غير مفعّل
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!loading && (
                <>
                  {isMFAEnabled ? (
                    <Alert className="bg-green-500/10 border-green-500/30">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertTitle>حسابك محمي</AlertTitle>
                      <AlertDescription>
                        المصادقة الثنائية مفعّلة على حسابك. مستوى الأمان الحالي: {aal.toUpperCase()}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="bg-yellow-500/10 border-yellow-500/30">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <AlertTitle>حسابك غير محمي بالكامل</AlertTitle>
                      <AlertDescription>
                        فعّل المصادقة الثنائية لحماية حسابك من الوصول غير المصرح به
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Enrolled Factors */}
                  {mfaFactors.length > 0 && (
                    <div className="space-y-3 pt-4">
                      <h3 className="text-sm font-medium text-muted-foreground">طرق المصادقة المفعّلة:</h3>
                      {mfaFactors.map((factor) => (
                        <div key={factor.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Key className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-medium">{factor.friendly_name || "تطبيق المصادقة"}</p>
                              <p className="text-xs text-muted-foreground">
                                {factor.status === "verified" ? "مفعّل" : "في انتظار التفعيل"}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => unenrollFactor(factor.id)}
                          >
                            إلغاء
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    {!isMFAEnabled && (
                      <Button onClick={startEnrollment} disabled={enrolling} className="flex-1">
                        {enrolling ? (
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 ml-2" />
                        )}
                        تفعيل المصادقة الثنائية
                      </Button>
                    )}
                    <Button variant="outline" onClick={fetchMFAStatus} disabled={loading}>
                      <RefreshCw className="w-4 h-4 ml-2" />
                      تحديث
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Security Tips Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">نصائح أمنية</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>استخدم كلمة مرور قوية تحتوي على أحرف وأرقام ورموز</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>فعّل المصادقة الثنائية لحماية إضافية</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>لا تشارك بيانات تسجيل الدخول مع أي شخص</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>تأكد من تسجيل الخروج عند استخدام أجهزة مشتركة</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MFA Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              تفعيل المصادقة الثنائية
            </DialogTitle>
            <DialogDescription>
              امسح رمز QR باستخدام تطبيق المصادقة (مثل Google Authenticator أو Authy)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* QR Code */}
            {qrCode && (
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
              </div>
            )}

            {/* Manual Secret */}
            {secret && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  أو أدخل المفتاح يدوياً:
                </Label>
                <div className="flex gap-2">
                  <Input 
                    value={secret} 
                    readOnly 
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={copySecret}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Verification Code Input */}
            <div className="space-y-2">
              <Label htmlFor="code">أدخل رمز التحقق من التطبيق:</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-widest font-mono"
                style={{ fontSize: '16px' }}
              />
            </div>

            <Button 
              onClick={verifyAndActivate} 
              disabled={verifying || verificationCode.length !== 6}
              className="w-full"
            >
              {verifying ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 ml-2" />
              )}
              تفعيل
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default SecuritySettings;
