import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CommunicationSettings {
  voiceCallsEnabled: boolean;
  videoCallsEnabled: boolean;
  chatMessagesEnabled: boolean;
  loading: boolean;
}

export const useCommunicationSettings = () => {
  const [settings, setSettings] = useState<CommunicationSettings>({
    voiceCallsEnabled: true,
    videoCallsEnabled: true,
    chatMessagesEnabled: true,
    loading: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("section_settings")
          .select("section_key, is_enabled")
          .in("section_key", ["voice_calls", "video_calls", "chat_messages"]);

        if (error) throw error;

        const settingsMap = data?.reduce((acc, item) => {
          acc[item.section_key] = item.is_enabled;
          return acc;
        }, {} as Record<string, boolean>) || {};

        setSettings({
          voiceCallsEnabled: settingsMap["voice_calls"] ?? true,
          videoCallsEnabled: settingsMap["video_calls"] ?? true,
          chatMessagesEnabled: settingsMap["chat_messages"] ?? true,
          loading: false,
        });
      } catch (error) {
        console.error("Error fetching communication settings:", error);
        setSettings(prev => ({ ...prev, loading: false }));
      }
    };

    fetchSettings();

    // Subscribe to changes
    const channel = supabase
      .channel("communication-settings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "section_settings",
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return settings;
};
