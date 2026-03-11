import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MFAFactor {
  id: string;
  type: 'totp';
  friendly_name?: string;
  created_at: string;
  status: 'verified' | 'unverified';
}

export function useMFA() {
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [currentFactorId, setCurrentFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFactors = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const mappedFactors: MFAFactor[] = (data?.totp || []).map(f => ({
        id: f.id,
        type: 'totp' as const,
        friendly_name: f.friendly_name,
        created_at: f.created_at,
        status: f.status as 'verified' | 'unverified',
      }));
      setFactors(mappedFactors);
    } catch (error) {
      console.error('Error fetching MFA factors:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFactors();
  }, [fetchFactors]);

  const startEnrollment = async (friendlyName?: string) => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: friendlyName || 'Authenticator App',
      });

      if (error) throw error;

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setCurrentFactorId(data.id);

      return { qrCode: data.totp.qr_code, secret: data.totp.secret, factorId: data.id };
    } catch (error: any) {
      toast({
        title: 'خطأ في إعداد MFA',
        description: error.message,
        variant: 'destructive',
      });
      setIsEnrolling(false);
      return null;
    }
  };

  const verifyEnrollment = async (code: string, factorId?: string) => {
    const targetFactorId = factorId || currentFactorId;
    if (!targetFactorId) {
      toast({
        title: 'خطأ',
        description: 'لم يتم العثور على عامل MFA',
        variant: 'destructive',
      });
      return false;
    }

    setIsVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: targetFactorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: targetFactorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      toast({
        title: 'تم تفعيل MFA بنجاح',
        description: 'تم تأمين حسابك بالتحقق الثنائي',
      });

      // Reset state
      setQrCode(null);
      setSecret(null);
      setCurrentFactorId(null);
      setIsEnrolling(false);
      await fetchFactors();

      return true;
    } catch (error: any) {
      toast({
        title: 'خطأ في التحقق',
        description: error.message === 'Invalid TOTP code entered' ? 'رمز غير صحيح' : error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const unenroll = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      toast({
        title: 'تم إلغاء MFA',
        description: 'تم إزالة التحقق الثنائي من حسابك',
      });

      await fetchFactors();
      return true;
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const verifyChallenge = async (factorId: string, code: string) => {
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      return true;
    } catch (error: any) {
      toast({
        title: 'خطأ في التحقق',
        description: error.message === 'Invalid TOTP code entered' ? 'رمز غير صحيح' : error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const cancelEnrollment = () => {
    setQrCode(null);
    setSecret(null);
    setCurrentFactorId(null);
    setIsEnrolling(false);
  };

  const hasVerifiedFactor = factors.some(f => f.status === 'verified');

  return {
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
    verifyChallenge,
    cancelEnrollment,
    refreshFactors: fetchFactors,
  };
}
