import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DeviceInfo {
  browser: string;
  os: string;
  device_type: string;
  raw_user_agent?: string;
}

interface AdminSession {
  id: string;
  admin_id: string;
  session_token: string;
  device_info: DeviceInfo;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  created_at: string;
  last_activity: string;
  ended_at: string | null;
  ended_by: string | null;
  end_reason: string | null;
  admin_name?: string;
}

const LOCAL_STORAGE_KEY = "cached_admin_sessions";

export const useAdminSessions = () => {
  const { user, session } = useAuth();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // حفظ الجلسات في التخزين المحلي
  const saveToLocalCache = (data: AdminSession[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  };

  const loadFromLocalCache = () => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  };

  // تسجيل الجلسة الحالية
  const registerSession = useCallback(async () => {
    if (!user || !session?.access_token) return;

    try {
      let clientIp = 'unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        clientIp = ipData.ip;
      } catch {
        console.log('Could not fetch IP');
      }

      const { data, error } = await supabase.rpc('register_admin_session', {
        p_session_token: session.access_token.substring(0, 50),
        p_ip_address: clientIp,
        p_user_agent: navigator.userAgent
      });

      if (error) throw error;
      setCurrentSessionId(data);
    } catch (error) {
      console.error('Failed to register session:', error);
    }
  }, [user, session]);

  // جلب الجلسات
  const fetchSessions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('admin_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      const adminIds = [...new Set((sessionsData || []).map(s => s.admin_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', adminIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      const sessionsWithNames = (sessionsData || []).map(s => {
        const rawDeviceInfo = s.device_info as unknown;
        const deviceInfo: DeviceInfo = (rawDeviceInfo && typeof rawDeviceInfo === 'object' && 'browser' in rawDeviceInfo)
          ? rawDeviceInfo as DeviceInfo
          : { browser: 'Unknown', os: 'Unknown', device_type: 'Desktop' };
        
        return {
          ...s,
          device_info: deviceInfo,
          admin_name: profileMap.get(s.admin_id) || 'مدير'
        };
      });

      setSessions(sessionsWithNames);
      saveToLocalCache(sessionsWithNames);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      toast.error('فشل في جلب الجلسات من الخادم');
      const fallback = loadFromLocalCache();
      setSessions(fallback);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const endSession = useCallback(async (sessionId: string, reason: string = 'admin_terminated') => {
    try {
      const { data, error } = await supabase.rpc('end_admin_session', {
        p_session_id: sessionId,
        p_reason: reason
      });

      if (error) throw error;

      if (data) {
        toast.success('تم إنهاء الجلسة بنجاح');
        await fetchSessions();
        return true;
      } else {
        toast.error('الجلسة غير موجودة أو منتهية بالفعل');
        return false;
      }
    } catch (error) {
      console.error('Failed to end session:', error);
      toast.error('فشل في إنهاء الجلسة');
      return false;
    }
  }, [fetchSessions]);

  const updateActivity = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      await supabase.rpc('update_admin_session_activity', {
        p_session_token: session.access_token.substring(0, 50)
      });
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  }, [session]);

  useEffect(() => {
    registerSession();
  }, [registerSession]);

  useEffect(() => {
    const interval = setInterval(updateActivity, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [updateActivity]);

  const cleanupSessions = useCallback(async () => {
    try {
      await supabase.rpc('cleanup_inactive_admin_sessions');
    } catch (error) {
      console.error('Failed to cleanup sessions:', error);
    }
  }, []);

  useEffect(() => {
    cleanupSessions().then(() => fetchSessions());
  }, [fetchSessions, cleanupSessions]);

  useEffect(() => {
    const interval = setInterval(() => {
      cleanupSessions().then(() => fetchSessions());
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cleanupSessions, fetchSessions]);

  return {
    sessions,
    loading,
    currentSessionId,
    fetchSessions,
    endSession,
    cleanupSessions,
    activeSessions: sessions.filter(s => s.is_active),
    inactiveSessions: sessions.filter(s => !s.is_active)
  };
};

