/**
 * IP Whitelist Management Hook
 * إدارة القائمة البيضاء لعناوين IP الموثوقة
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface WhitelistedIP {
  id: string;
  ip_address: string;
  description: string | null;
  added_by: string | null;
  created_at: string;
  is_active: boolean;
}

export const useIPWhitelist = () => {
  const [whitelistedIPs, setWhitelistedIPs] = useState<WhitelistedIP[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWhitelistedIPs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ip_whitelist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWhitelistedIPs(data || []);
    } catch (error) {
      console.error('Error fetching whitelisted IPs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWhitelistedIPs();
  }, [fetchWhitelistedIPs]);

  const addToWhitelist = async (ipAddress: string, description: string = '') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ip_whitelist')
        .insert({
          ip_address: ipAddress,
          description: description || null,
          added_by: user?.id || null,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: 'تمت الإضافة',
        description: `تم إضافة ${ipAddress} إلى القائمة البيضاء`,
      });

      await fetchWhitelistedIPs();
      return true;
    } catch (error: any) {
      console.error('Error adding to whitelist:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل إضافة العنوان للقائمة البيضاء',
        variant: 'destructive'
      });
      return false;
    }
  };

  const removeFromWhitelist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ip_whitelist')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'تم الحذف',
        description: 'تم إزالة العنوان من القائمة البيضاء',
      });

      await fetchWhitelistedIPs();
      return true;
    } catch (error: any) {
      console.error('Error removing from whitelist:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل إزالة العنوان',
        variant: 'destructive'
      });
      return false;
    }
  };

  const toggleWhitelistStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('ip_whitelist')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: isActive ? 'تم التفعيل' : 'تم التعطيل',
        description: isActive ? 'تم تفعيل العنوان في القائمة البيضاء' : 'تم تعطيل العنوان في القائمة البيضاء',
      });

      await fetchWhitelistedIPs();
      return true;
    } catch (error: any) {
      console.error('Error toggling whitelist status:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل تحديث الحالة',
        variant: 'destructive'
      });
      return false;
    }
  };

  const isIPWhitelisted = async (ipAddress: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('is_ip_whitelisted', { check_ip: ipAddress });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking if IP is whitelisted:', error);
      return false;
    }
  };

  return {
    whitelistedIPs,
    loading,
    addToWhitelist,
    removeFromWhitelist,
    toggleWhitelistStatus,
    isIPWhitelisted,
    refetch: fetchWhitelistedIPs
  };
};
