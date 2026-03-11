import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PresenceUser {
  user_id: string;
  is_online: boolean;
  last_seen: string;
}

export const usePresence = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  const updatePresence = useCallback(async (isOnline: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_presence")
        .upsert({
          user_id: user.id,
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) console.error("Error updating presence:", error);
    } catch (err) {
      console.error("Presence update error:", err);
    }
  }, [user]);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("user_presence")
        .select("*")
        .eq("is_online", true);

      if (error) throw error;
      setOnlineUsers(data || []);
    } catch (err) {
      console.error("Error fetching online users:", err);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Set online when component mounts
    updatePresence(true);
    fetchOnlineUsers();

    // Set up realtime subscription
    const channel = supabase
      .channel("presence-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
        },
        () => {
          fetchOnlineUsers();
        }
      )
      .subscribe();

    // Set offline when window closes or user leaves
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence(false);
      } else {
        updatePresence(true);
      }
    };

    const handleBeforeUnload = () => {
      updatePresence(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Heartbeat to maintain presence
    const heartbeat = setInterval(() => {
      if (!document.hidden) {
        updatePresence(true);
      }
    }, 30000); // Every 30 seconds

    return () => {
      updatePresence(false);
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(heartbeat);
    };
  }, [user, updatePresence, fetchOnlineUsers]);

  return { onlineUsers, fetchOnlineUsers };
};
