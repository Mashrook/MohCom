import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CallNotification {
  id: string;
  caller_id: string;
  receiver_id: string;
  call_type: 'video' | 'voice';
  room_name: string;
  status: 'pending' | 'accepted' | 'rejected' | 'missed' | 'ended';
  created_at: string;
  caller_name?: string;
  caller_avatar?: string;
}

export const useCallNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [incomingCall, setIncomingCall] = useState<CallNotification | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Create a call notification
  const createCallNotification = useCallback(async (
    receiverId: string,
    callType: 'video' | 'voice',
    roomName: string
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("call_notifications")
        .insert({
          caller_id: user.id,
          receiver_id: receiverId,
          call_type: callType,
          room_name: roomName,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Error creating call notification:", err);
      return null;
    }
  }, [user]);

  // Update call status
  const updateCallStatus = useCallback(async (
    callId: string,
    status: 'accepted' | 'rejected' | 'missed' | 'ended'
  ) => {
    try {
      const { error } = await supabase
        .from("call_notifications")
        .update({ status })
        .eq("id", callId);

      if (error) throw error;

      if (status === 'rejected' || status === 'ended') {
        setIncomingCall(null);
      }
    } catch (err) {
      console.error("Error updating call status:", err);
    }
  }, []);

  // Accept incoming call
  const acceptCall = useCallback(async (callId: string) => {
    await updateCallStatus(callId, 'accepted');
    return incomingCall;
  }, [updateCallStatus, incomingCall]);

  // Reject incoming call
  const rejectCall = useCallback(async (callId: string) => {
    await updateCallStatus(callId, 'rejected');
    setIncomingCall(null);
  }, [updateCallStatus]);

  // End call
  const endCall = useCallback(async (callId: string) => {
    await updateCallStatus(callId, 'ended');
  }, [updateCallStatus]);

  // Fetch caller profile
  const fetchCallerProfile = useCallback(async (callerId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", callerId)
        .maybeSingle();

      return data;
    } catch {
      return null;
    }
  }, []);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('call-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_notifications',
          filter: `receiver_id=eq.${user.id}`
        },
        async (payload) => {
          const notification = payload.new as CallNotification;
          
          if (notification.status === 'pending') {
            // Fetch caller profile
            const callerProfile = await fetchCallerProfile(notification.caller_id);
            
            setIncomingCall({
              ...notification,
              caller_name: callerProfile?.full_name || 'مستخدم',
              caller_avatar: callerProfile?.avatar_url || undefined
            });

            // Play notification sound
            try {
              const audio = new Audio('/notification.mp3');
              audio.volume = 0.5;
              audio.play().catch(() => {});
            } catch {}

            toast({
              title: notification.call_type === 'video' ? "📹 مكالمة فيديو واردة" : "📞 مكالمة صوتية واردة",
              description: `${callerProfile?.full_name || 'مستخدم'} يتصل بك`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_notifications',
          filter: `caller_id=eq.${user.id}`
        },
        (payload) => {
          const notification = payload.new as CallNotification;
          
          if (notification.status === 'rejected') {
            toast({
              title: "تم رفض المكالمة",
              description: "المستخدم رفض المكالمة",
              variant: "destructive"
            });
          } else if (notification.status === 'accepted') {
            toast({
              title: "تم قبول المكالمة",
              description: "جاري الاتصال...",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCallerProfile, toast]);

  // Auto-dismiss missed calls after 30 seconds
  useEffect(() => {
    if (!incomingCall) return;

    const timeout = setTimeout(async () => {
      await updateCallStatus(incomingCall.id, 'missed');
      setIncomingCall(null);
      toast({
        title: "مكالمة فائتة",
        description: `فاتتك مكالمة من ${incomingCall.caller_name}`,
      });
    }, 30000);

    return () => clearTimeout(timeout);
  }, [incomingCall, updateCallStatus, toast]);

  return {
    incomingCall,
    isLoading,
    createCallNotification,
    acceptCall,
    rejectCall,
    endCall,
    updateCallStatus
  };
};
