import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check if iOS App Mode is enabled via admin settings.
 * When disabled by admin, isIOSApp() will always return false,
 * effectively disabling payment hiding even on real iOS devices.
 */
export function useIOSAppMode() {
  const [isEnabled, setIsEnabled] = useState(true); // default: enabled
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSetting = async () => {
      try {
        const { data, error } = await supabase
          .from("admin_security_settings")
          .select("setting_value")
          .eq("setting_key", "ios_app_mode_enabled")
          .maybeSingle();

        if (error) throw error;
        // Default to true if no setting exists
        setIsEnabled(data?.setting_value ?? true);
      } catch (error) {
        console.error("Error fetching iOS app mode setting:", error);
        setIsEnabled(true); // fallback to enabled
      } finally {
        setLoading(false);
      }
    };

    fetchSetting();
  }, []);

  const toggleIOSAppMode = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("admin_security_settings")
        .upsert({
          setting_key: "ios_app_mode_enabled",
          setting_value: enabled,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        }, { onConflict: "setting_key" });

      if (error) throw error;
      setIsEnabled(enabled);
      return true;
    } catch (error) {
      console.error("Error toggling iOS app mode:", error);
      return false;
    }
  };

  return { isIOSAppModeEnabled: isEnabled, loading, toggleIOSAppMode };
}
