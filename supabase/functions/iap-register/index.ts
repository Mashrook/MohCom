import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const getAllowedOrigin = (req: Request): string => {
  const origin = req.headers.get("origin") || "";
  const productionOrigins = ["https://mohamie.com", "https://www.mohamie.com"];
  const developmentOrigins = ["http://localhost:5173", "http://localhost:3000"];
  const lovablePatterns = [/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/, /^https:\/\/[a-z0-9-]+\.lovable\.app$/];
  if (productionOrigins.includes(origin) || developmentOrigins.includes(origin)) return origin;
  if (lovablePatterns.some(p => p.test(origin))) return origin;
  return productionOrigins[0];
};

const getCorsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": getAllowedOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

const logStep = (step: string, details?: any) => {
  const safe = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[IAP-REGISTER] ${step}${safe}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function invoked");

    // 1. Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      logStep("Auth failed", { error: authError?.message });
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    logStep("User authenticated", { userId: user.id.substring(0, 8) + "..." });

    // 2. Parse and validate input
    const { product_id, transaction_id } = await req.json();

    if (!product_id || typeof product_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing product_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }
    if (!transaction_id || typeof transaction_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing transaction_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    // Sanitize: only allow known characters
    const safeProductId = product_id.replace(/[^a-zA-Z0-9._-]/g, "").substring(0, 100);
    const safeTransactionId = transaction_id.replace(/[^a-zA-Z0-9._-]/g, "").substring(0, 200);

    // 3. Fetch plan by ios_product_id
    const { data: plan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("ios_product_id", safeProductId)
      .eq("is_active", true)
      .maybeSingle();

    if (planError || !plan) {
      logStep("Plan not found", { product_id: safeProductId });
      return new Response(JSON.stringify({ error: "Unknown product" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    logStep("Plan found", { code: plan.code, days: plan.duration_days });

    // 4. Idempotency: check if this transaction already registered
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, status")
      .eq("source", "apple_iap")
      .eq("source_ref", safeTransactionId)
      .maybeSingle();

    if (existingSub) {
      logStep("Duplicate transaction — already registered", { transactionId: safeTransactionId });
      // Return current subscription status
      const { data: currentSub } = await supabaseAdmin
        .from("subscriptions")
        .select("status, ends_at, started_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("ends_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(JSON.stringify({
        status: "already_registered",
        subscription: currentSub || { status: "none" },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // 5. Activate subscription (extend if already active)
    const now = new Date();

    const { data: activeSub } = await supabaseAdmin
      .from("subscriptions")
      .select("ends_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let startDate = now;
    if (activeSub?.ends_at) {
      const existingEnd = new Date(activeSub.ends_at);
      if (existingEnd > now) {
        startDate = existingEnd; // Extend from current end
      }
    }

    const endsAt = new Date(startDate);
    endsAt.setDate(endsAt.getDate() + plan.duration_days);

    // Upsert subscription
    await supabaseAdmin.from("subscriptions").upsert({
      user_id: user.id,
      plan_id: plan.id,
      plan_type: plan.code,
      status: "active",
      source: "apple_iap",
      source_ref: safeTransactionId,
      started_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: endsAt.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: "user_id" });

    logStep("Subscription activated", {
      plan: plan.code,
      source: "apple_iap",
      endsAt: endsAt.toISOString(),
    });

    // 6. Audit log
    await supabaseAdmin.from("security_audit_log").insert({
      user_id: user.id,
      action: "iap_subscription_activated",
      resource_type: "subscription",
      success: true,
    });

    return new Response(JSON.stringify({
      status: "activated",
      subscription: {
        plan_code: plan.code,
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        source: "apple_iap",
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[IAP-REGISTER] Error:", msg);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
