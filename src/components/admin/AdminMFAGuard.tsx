import { ReactNode, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMFA } from "@/hooks/useMFA";
import { supabase } from "@/integrations/supabase/client";
import { MFASetup } from "@/components/auth/MFASetup";
import { MFAVerification } from "@/components/auth/MFAVerification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Loader2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminMFAGuardProps {
  children: ReactNode;
}

const AdminMFAGuard = ({ children }: AdminMFAGuardProps) => {
  const { isAdmin } = useAuth();
  const { factors, loading: mfaLoading, hasVerifiedFactor } = useMFA();
  const [aal, setAal] = useState<string | null>(null);
  const [checkingAAL, setCheckingAAL] = useState(true);
  const [ipAllowed, setIpAllowed] = useState<boolean | null>(null);
  const [clientIP, setClientIP] = useState<string>('');
  const [checkingIP, setCheckingIP] = useState(true);

  useEffect(() => {
    const checkAAL = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (!error && data) {
          setAal(data.currentLevel);
        }
      } catch (error) {
        console.error('Error checking AAL:', error);
      } finally {
        setCheckingAAL(false);
      }
    };
    
    checkAAL();
  }, []);

  useEffect(() => {
    const checkIP = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-admin-ip`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        const data = await response.json();
        setIpAllowed(data.allowed);
        setClientIP(data.ip || 'unknown');
      } catch (error) {
        console.error('Error checking IP:', error);
        // Fail open - if we can't check IP, allow access
        setIpAllowed(true);
      } finally {
        setCheckingIP(false);
      }
    };
    
    if (isAdmin) {
      checkIP();
    } else {
      setCheckingIP(false);
      setIpAllowed(true);
    }
  }, [isAdmin]);

  // Non-admins don't need MFA enforcement here
  if (!isAdmin) {
    return <>{children}</>;
  }

  // Still loading
  if (mfaLoading || checkingAAL || checkingIP) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-golden" />
      </div>
    );
  }

  // IP not allowed
  if (ipAllowed === false) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
        <div className="max-w-md mx-auto space-y-6">
          <Card className="border-destructive/50 bg-card-dark">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <ShieldX className="w-16 h-16 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-destructive">
                الوصول مرفوض
              </CardTitle>
              <CardDescription className="text-muted-foreground text-lg">
                عنوان IP الخاص بك غير مسموح له بالوصول للوحة الإدارة
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="p-4 bg-muted/20 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">عنوان IP الخاص بك</p>
                <p className="font-mono text-lg text-foreground">{clientIP}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                تواصل مع المسؤول لإضافة عنوان IP الخاص بك للقائمة المسموحة
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                العودة للصفحة الرئيسية
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Admin doesn't have MFA set up - force setup
  if (!hasVerifiedFactor) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-golden/30 bg-card-dark">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <ShieldAlert className="w-16 h-16 text-golden" />
              </div>
              <CardTitle className="text-2xl text-golden">
                التحقق الثنائي مطلوب للمدراء
              </CardTitle>
              <CardDescription className="text-muted-foreground text-lg">
                لتعزيز أمان حسابك كمدير، يجب تفعيل المصادقة الثنائية (MFA) قبل الوصول إلى لوحة الإدارة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MFASetup />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Admin has MFA but current session is not AAL2 - require verification
  if (aal !== 'aal2') {
    const verifiedFactor = factors.find(f => f.status === 'verified');
    
    if (verifiedFactor) {
      return (
        <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
          <div className="max-w-md mx-auto space-y-6">
            <Card className="border-golden/30 bg-card-dark">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <ShieldAlert className="w-16 h-16 text-golden" />
                </div>
                <CardTitle className="text-xl text-golden">
                  التحقق من الهوية مطلوب
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  أدخل رمز التحقق من تطبيق المصادقة للوصول إلى لوحة الإدارة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MFAVerification 
                  factorId={verifiedFactor.id}
                  onSuccess={() => {
                    // Refresh AAL after successful verification
                    window.location.reload();
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
  }

  // Admin has MFA and session is AAL2 - allow access
  return <>{children}</>;
};

export default AdminMFAGuard;
