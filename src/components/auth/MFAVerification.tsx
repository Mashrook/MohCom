import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';
import { useMFA } from '@/hooks/useMFA';
import { useToast } from '@/hooks/use-toast';

interface MFAVerificationProps {
  factorId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function MFAVerification({ factorId, onSuccess, onCancel }: MFAVerificationProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { verifyChallenge } = useMFA();
  const { toast } = useToast();

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast({
        title: 'خطأ',
        description: 'يجب أن يكون الرمز 6 أرقام',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    const success = await verifyChallenge(factorId, code);
    setIsVerifying(false);

    if (success) {
      onSuccess();
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <div className="p-3 bg-primary/10 rounded-full">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle>التحقق الثنائي مطلوب</CardTitle>
        <CardDescription>
          أدخل الرمز من تطبيق المصادقة للمتابعة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-2xl tracking-[0.5em] font-mono"
            dir="ltr"
            autoFocus
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleVerify}
            disabled={isVerifying || code.length !== 6}
            className="flex-1"
          >
            {isVerifying ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
            تأكيد
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              إلغاء
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
