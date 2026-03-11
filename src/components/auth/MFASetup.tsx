import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { useMFA } from '@/hooks/useMFA';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function MFASetup() {
  const {
    factors,
    loading,
    isEnrolling,
    isVerifying,
    qrCode,
    secret,
    hasVerifiedFactor,
    startEnrollment,
    verifyEnrollment,
    unenroll,
    cancelEnrollment,
  } = useMFA();

  const [verificationCode, setVerificationCode] = useState('');
  const [factorToRemove, setFactorToRemove] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleStartEnrollment = async () => {
    await startEnrollment('تطبيق المصادقة');
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: 'خطأ',
        description: 'يجب أن يكون الرمز 6 أرقام',
        variant: 'destructive',
      });
      return;
    }

    const success = await verifyEnrollment(verificationCode);
    if (success) {
      setVerificationCode('');
    }
  };

  const handleUnenroll = async () => {
    if (factorToRemove) {
      await unenroll(factorToRemove);
      setFactorToRemove(null);
    }
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ المفتاح السري',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          التحقق الثنائي (MFA)
        </CardTitle>
        <CardDescription>
          أضف طبقة حماية إضافية لحسابك باستخدام تطبيق المصادقة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center gap-2">
          {hasVerifiedFactor ? (
            <>
              <ShieldCheck className="h-5 w-5 text-green-500" />
              <span className="text-green-600 dark:text-green-400">التحقق الثنائي مفعّل</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                آمن
              </Badge>
            </>
          ) : (
            <>
              <ShieldOff className="h-5 w-5 text-yellow-500" />
              <span className="text-yellow-600 dark:text-yellow-400">التحقق الثنائي غير مفعّل</span>
            </>
          )}
        </div>

        {/* Enrollment Flow */}
        {isEnrolling && qrCode ? (
          <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
            <div className="text-center">
              <h4 className="font-medium mb-2">امسح رمز QR بتطبيق المصادقة</h4>
              <p className="text-sm text-muted-foreground mb-4">
                استخدم تطبيق مثل Google Authenticator أو Authy
              </p>
              <div className="flex justify-center mb-4">
                <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded-lg" />
              </div>
            </div>

            {secret && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  أو أدخل المفتاح يدوياً:
                </p>
                <div className="flex items-center gap-2 justify-center">
                  <code className="bg-background px-3 py-1 rounded text-sm font-mono">
                    {secret}
                  </code>
                  <Button variant="ghost" size="sm" onClick={copySecret}>
                    {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">أدخل الرمز من التطبيق</label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-lg tracking-widest"
                dir="ltr"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleVerify} 
                disabled={isVerifying || verificationCode.length !== 6}
                className="flex-1"
              >
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                تأكيد التفعيل
              </Button>
              <Button variant="outline" onClick={cancelEnrollment}>
                إلغاء
              </Button>
            </div>
          </div>
        ) : !hasVerifiedFactor ? (
          <Button onClick={handleStartEnrollment} disabled={isEnrolling}>
            {isEnrolling ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Shield className="h-4 w-4 ml-2" />}
            تفعيل التحقق الثنائي
          </Button>
        ) : null}

        {/* Active Factors */}
        {factors.filter(f => f.status === 'verified').length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">عوامل المصادقة النشطة</h4>
            {factors
              .filter(f => f.status === 'verified')
              .map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <span>{factor.friendly_name || 'تطبيق المصادقة'}</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setFactorToRemove(factor.id)}
                  >
                    إزالة
                  </Button>
                </div>
              ))}
          </div>
        )}

        {/* Remove Confirmation Dialog */}
        <AlertDialog open={!!factorToRemove} onOpenChange={() => setFactorToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>إزالة التحقق الثنائي</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من إزالة التحقق الثنائي؟ سيصبح حسابك أقل أماناً.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleUnenroll} className="bg-destructive text-destructive-foreground">
                إزالة
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
