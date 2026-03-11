/**
 * Backend Entitlement Sync Service
 * 
 * For iOS: registers IAP transactions with the backend to activate subscriptions.
 * For Web: entitlement is managed via Moyasar webhook → DB.
 * Access control is ALWAYS based on DB subscription status.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Register an iOS IAP transaction with the backend.
 * This activates the subscription in the database.
 */
export async function registerIAPTransaction(
  productId: string,
  transactionId: string
): Promise<{ status: string; subscription?: any }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.warn("[Entitlement] No active session for IAP registration");
      return { status: "no_session" };
    }

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/iap-register`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.access_token}`,
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ product_id: productId, transaction_id: transactionId }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("[Entitlement] IAP register failed:", errorData);
      return { status: "error" };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("[Entitlement] IAP register error:", err);
    return { status: "error" };
  }
}

/**
 * Check current subscription status from DB.
 */
export async function checkEntitlementFromDB(): Promise<{
  active: boolean;
  planCode: string | null;
  endsAt: string | null;
  source: string | null;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { active: false, planCode: null, endsAt: null, source: null };
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, plan_type, ends_at, source")
      .eq("user_id", session.user.id)
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) return { active: false, planCode: null, endsAt: null, source: null };

    const now = new Date();
    const endsAt = sub.ends_at ? new Date(sub.ends_at) : null;
    const isActive = sub.status === "active" && endsAt !== null && endsAt > now;

    return {
      active: isActive,
      planCode: sub.plan_type,
      endsAt: sub.ends_at,
      source: sub.source ?? null,
    };
  } catch {
    return { active: false, planCode: null, endsAt: null, source: null };
  }
}
