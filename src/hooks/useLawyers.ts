import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Lawyer {
  id: string;
  name: string;
  specialty: string;
  experience: number;
  rating: number;
  reviews: number;
  hourlyRate: number;
  location: string;
  available: boolean;
  avatar: string;
  badges: string[];
  userId: string;
}

interface AvailabilityChange {
  lawyerName: string;
  isAvailable: boolean;
}

export const useLawyers = (onAvailabilityChange?: (change: AvailabilityChange) => void) => {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousLawyersRef = useRef<Map<string, boolean>>(new Map());

  const fetchLawyers = useCallback(async (checkChanges = false) => {
    setLoading(true);
    setError(null);
    try {
      // Get all users with lawyer role
      const { data: lawyerRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "lawyer");

      if (rolesError) {
        console.error("Error fetching lawyer roles:", rolesError);
        // Don't throw - continue with empty list
        setLawyers([]);
        setLoading(false);
        return;
      }

      if (!lawyerRoles || lawyerRoles.length === 0) {
        setLawyers([]);
        setLoading(false);
        return;
      }

      const lawyerUserIds = lawyerRoles.map((r) => r.user_id);

      // Get profiles for these lawyers - don't fail on error
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", lawyerUserIds);

      // Get lawyer profiles - don't fail on error
      const { data: lawyerProfiles } = await supabase
        .from("lawyer_profiles")
        .select("*")
        .in("user_id", lawyerUserIds);

      // Get online status - don't fail on error
      const { data: presenceData } = await supabase
        .from("user_presence")
        .select("*")
        .in("user_id", lawyerUserIds);

      // Combine data
      const combinedLawyers: Lawyer[] = lawyerUserIds.map((userId) => {
        const profile = profiles?.find((p) => p.id === userId);
        const lawyerProfile = lawyerProfiles?.find(
          (lp) => lp.user_id === userId
        );
        const presence = presenceData?.find((p) => p.user_id === userId);

        const name = profile?.full_name || "محامي";
        const firstLetter = name.charAt(0);

        return {
          id: lawyerProfile?.id || userId,
          userId: userId,
          name: name,
          specialty: lawyerProfile?.specialty || "قانون عام",
          experience: lawyerProfile?.experience_years || 1,
          rating: Number(lawyerProfile?.rating) || 0,
          reviews: lawyerProfile?.reviews_count || 0,
          hourlyRate: lawyerProfile?.hourly_rate || 300,
          location: lawyerProfile?.location || "الرياض",
          available: presence?.is_online || lawyerProfile?.is_available || false,
          avatar: firstLetter,
          badges: lawyerProfile?.badges || ["معتمد"],
        };
      });

      // Check for availability changes and notify
      if (checkChanges && onAvailabilityChange) {
        combinedLawyers.forEach((lawyer) => {
          const previousAvailable = previousLawyersRef.current.get(lawyer.userId);
          if (previousAvailable !== undefined && previousAvailable !== lawyer.available) {
            onAvailabilityChange({
              lawyerName: lawyer.name,
              isAvailable: lawyer.available,
            });
          }
        });
      }

      // Update previous state
      combinedLawyers.forEach((lawyer) => {
        previousLawyersRef.current.set(lawyer.userId, lawyer.available);
      });

      setLawyers(combinedLawyers);
    } catch (err) {
      console.error("Error fetching lawyers:", err);
      setError("فشل في جلب بيانات المحامين");
    } finally {
      setLoading(false);
    }
  }, [onAvailabilityChange]);

  useEffect(() => {
    fetchLawyers(false);

    // Listen for realtime updates on presence
    const channel = supabase
      .channel("lawyers-presence")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
        },
        () => {
          fetchLawyers(true);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lawyer_profiles",
        },
        () => {
          fetchLawyers(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLawyers]);

  return { lawyers, loading, error, refetch: () => fetchLawyers(false) };
};
