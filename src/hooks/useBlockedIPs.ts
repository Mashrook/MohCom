/**
 * Blocked IPs Management Hook
 * إدارة عناوين IP المحظورة
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string;
  blocked_at: string;
  blocked_until: string | null;
  is_permanent: boolean;
  auto_blocked: boolean;
  attempt_count: number;
  unblocked_at: string | null;
}

export const useBlockedIPs = () => {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlockedIPs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('blocked_ips')
        .select('*')
        .is('unblocked_at', null)
        .order('blocked_at', { ascending: false });

      if (error) throw error;
      setBlockedIPs(data || []);
    } catch (error) {
      console.error('Error fetching blocked IPs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlockedIPs();
  }, [fetchBlockedIPs]);

  const blockIP = async (ipAddress: string, reason: string, isPermanent: boolean = false, blockHours: number = 24) => {
    try {
      const { error } = await supabase
        .from('blocked_ips')
        .insert({
          ip_address: ipAddress,
          reason,
          is_permanent: isPermanent,
          blocked_until: isPermanent ? null : new Date(Date.now() + blockHours * 60 * 60 * 1000).toISOString(),
          auto_blocked: false
        });

      if (error) throw error;

      toast({
        title: 'تم حظر العنوان',
        description: `تم حظر ${ipAddress} بنجاح`,
      });

      await fetchBlockedIPs();
      return true;
    } catch (error: any) {
      console.error('Error blocking IP:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل حظر العنوان',
        variant: 'destructive'
      });
      return false;
    }
  };

  const unblockIP = async (ipAddress: string) => {
    try {
      const { data, error } = await supabase
        .rpc('unblock_ip', { p_ip_address: ipAddress });

      if (error) throw error;

      toast({
        title: 'تم إلغاء الحظر',
        description: `تم إلغاء حظر ${ipAddress} بنجاح`,
      });

      await fetchBlockedIPs();
      return true;
    } catch (error: any) {
      console.error('Error unblocking IP:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل إلغاء الحظر',
        variant: 'destructive'
      });
      return false;
    }
  };

  const autoBlockIP = async (ipAddress: string, reason: string, attemptCount: number = 1, blockHours: number = 24) => {
    try {
      const { error } = await supabase
        .rpc('auto_block_ip', {
          p_ip_address: ipAddress,
          p_reason: reason,
          p_attempt_count: attemptCount,
          p_block_hours: blockHours
        });

      if (error) throw error;
      await fetchBlockedIPs();
      return true;
    } catch (error) {
      console.error('Error auto-blocking IP:', error);
      return false;
    }
  };

  const isIPBlocked = async (ipAddress: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('is_ip_blocked', { check_ip: ipAddress });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking if IP is blocked:', error);
      return false;
    }
  };

  // دالة جديدة: تحويل الحظر لدائم (للمسؤولين فقط)
  const makeBlockPermanent = async (ipAddress: string) => {
    try {
      const { data, error } = await supabase
        .rpc('make_ip_block_permanent', { p_ip_address: ipAddress });

      if (error) throw error;

      toast({
        title: 'تم تحويل الحظر لدائم',
        description: `تم تحويل حظر ${ipAddress} إلى دائم`,
      });

      await fetchBlockedIPs();
      return true;
    } catch (error: any) {
      console.error('Error making block permanent:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل تحويل الحظر لدائم',
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    blockedIPs,
    loading,
    blockIP,
    unblockIP,
    autoBlockIP,
    isIPBlocked,
    makeBlockPermanent,
    refetch: fetchBlockedIPs
  };
};
