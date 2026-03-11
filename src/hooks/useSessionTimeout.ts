import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SessionTimeoutSettings {
  enabled: boolean;
  timeoutMinutes: number;
}

export const useSessionTimeout = () => {
  const [settings, setSettings] = useState<SessionTimeoutSettings>({
    enabled: true,
    timeoutMinutes: 30
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_security_settings')
        .select('*')
        .eq('setting_key', 'session_timeout_enabled')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          enabled: data.setting_value,
          timeoutMinutes: (data as any).setting_value_int || 30
        });
      }
    } catch (error) {
      console.error('Failed to fetch timeout settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<SessionTimeoutSettings>) => {
    setSaving(true);
    try {
      const updates: any = {};
      if (newSettings.enabled !== undefined) {
        updates.setting_value = newSettings.enabled;
      }
      if (newSettings.timeoutMinutes !== undefined) {
        updates.setting_value_int = newSettings.timeoutMinutes;
      }

      const { error } = await supabase
        .from('admin_security_settings')
        .update(updates)
        .eq('setting_key', 'session_timeout_enabled');

      if (error) throw error;

      setSettings(prev => ({ ...prev, ...newSettings }));
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Failed to update timeout settings:', error);
      toast.error('فشل في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  }, []);

  const cleanupInactiveSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('cleanup_inactive_admin_sessions');
      if (error) throw error;
      return data as number;
    } catch (error) {
      console.error('Failed to cleanup sessions:', error);
      return 0;
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    saving,
    updateSettings,
    cleanupInactiveSessions,
    fetchSettings
  };
};
