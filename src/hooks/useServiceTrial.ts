import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UseServiceTrialReturn {
  hasUsedTrial: boolean;
  canAccessService: boolean;
  hasUnlimitedAccess: boolean;
  trialsEnabled: boolean;
  useTrial: () => Promise<boolean>;
  loading: boolean;
}

export function useServiceTrial(serviceKey: string): UseServiceTrialReturn {
  const { user, subscription, isAdmin, isLawyer } = useAuth();
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [trialsEnabled, setTrialsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // Admins, Lawyers, and Premium subscribers have unlimited access
  const hasUnlimitedAccess = isAdmin || isLawyer || subscription.subscribed;

  // Check if trials are globally enabled
  const checkTrialsEnabled = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("section_settings")
        .select("is_enabled")
        .eq("section_key", "free_trials")
        .maybeSingle();

      if (error) {
        console.error("Error checking trials enabled:", error);
        return true; // Default to enabled if error
      }

      return data?.is_enabled ?? true;
    } catch (error) {
      console.error("Error checking trials enabled:", error);
      return true;
    }
  }, []);

  // Check if user has used the trial for this service
  const checkTrial = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Skip trial check for users with unlimited access
    if (hasUnlimitedAccess) {
      setLoading(false);
      return;
    }

    try {
      // Check if trials are enabled globally
      const enabled = await checkTrialsEnabled();
      setTrialsEnabled(enabled);

      const { data, error } = await supabase
        .from("service_trials")
        .select("id")
        .eq("user_id", user.id)
        .eq("service_key", serviceKey)
        .maybeSingle();

      if (error) {
        console.error("Error checking trial:", error);
      }

      setHasUsedTrial(!!data);
    } catch (error) {
      console.error("Error checking trial:", error);
    } finally {
      setLoading(false);
    }
  }, [user, serviceKey, hasUnlimitedAccess, checkTrialsEnabled]);

  useEffect(() => {
    checkTrial();
  }, [checkTrial]);

  // Use the trial - marks it as used
  const useTrial = async (): Promise<boolean> => {
    // Users with unlimited access don't need trials
    if (hasUnlimitedAccess) return true;
    
    // Check if trials are enabled
    if (!trialsEnabled) return false;
    
    if (!user || hasUsedTrial) return false;

    try {
      const { error } = await supabase.from("service_trials").insert({
        user_id: user.id,
        service_key: serviceKey,
      });

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation - trial already used
          setHasUsedTrial(true);
          return false;
        }
        console.error("Error using trial:", error);
        return false;
      }

      setHasUsedTrial(true);
      return true;
    } catch (error) {
      console.error("Error using trial:", error);
      return false;
    }
  };

  // User can access if they have unlimited access OR (trials enabled AND haven't used trial yet)
  const canAccessService = hasUnlimitedAccess || (trialsEnabled && !hasUsedTrial);

  return {
    hasUsedTrial,
    canAccessService,
    hasUnlimitedAccess,
    trialsEnabled,
    useTrial,
    loading,
  };
}
