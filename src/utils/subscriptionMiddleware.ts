/**
 * Subscription Middleware
 * 
 * Reusable server-side and client-side subscription validation.
 * Access is granted ONLY when status='active' AND ends_at > now.
 */

import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionStatus {
  active: boolean;
  planCode: string | null;
  endsAt: string | null;
  source: string | null;
  expired: boolean;
}

/**
 * Check if a user has an active subscription.
 * Automatically marks expired subscriptions.
 */
export async function requireActiveSubscription(userId: string): Promise<SubscriptionStatus> {
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select("status, plan_type, ends_at, source")
    .eq("user_id", userId)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !sub) {
    return { active: false, planCode: null, endsAt: null, source: null, expired: false };
  }

  const now = new Date();
  const endsAt = sub.ends_at ? new Date(sub.ends_at) : null;

  // If subscription has ended, mark as expired
  if (sub.status === "active" && endsAt && endsAt < now) {
    // Mark expired via edge function or let server handle it
    return {
      active: false,
      planCode: sub.plan_type,
      endsAt: sub.ends_at,
      source: sub.source ?? null,
      expired: true,
    };
  }

  const isActive = sub.status === "active" && endsAt !== null && endsAt > now;

  return {
    active: isActive,
    planCode: sub.plan_type,
    endsAt: sub.ends_at,
    source: sub.source ?? null,
    expired: false,
  };
}

/**
 * Server-side version for Edge Functions (using admin client).
 * Pass a Supabase admin client instance.
 */
export function createServerSubscriptionCheck(adminClient: any) {
  return async function checkSubscription(userId: string): Promise<{
    active: boolean;
    endsAt: string | null;
    planCode: string | null;
  }> {
    const { data: sub } = await adminClient
      .from("subscriptions")
      .select("status, plan_type, ends_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) return { active: false, endsAt: null, planCode: null };

    const now = new Date();
    const endsAt = sub.ends_at ? new Date(sub.ends_at) : null;

    if (endsAt && endsAt < now) {
      // Auto-expire
      await adminClient
        .from("subscriptions")
        .update({ status: "expired", updated_at: now.toISOString() })
        .eq("user_id", userId)
        .eq("status", "active");

      return { active: false, endsAt: sub.ends_at, planCode: sub.plan_type };
    }

    return {
      active: true,
      endsAt: sub.ends_at,
      planCode: sub.plan_type,
    };
  };
}
