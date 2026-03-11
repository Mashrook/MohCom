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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-moyasar-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

const logStep = (step: string, details?: any) => {
  let safeDetails = details;
  if (details && typeof details === 'object') {
    const masked = { ...details };
    if ('user_email' in masked) masked.user_email = '***@***';
    if ('user_id' in masked) masked.user_id = String(masked.user_id).substring(0, 8) + '...';
    safeDetails = masked;
  }
  console.log(`[MOYASAR-WEBHOOK] ${step}${safeDetails ? ` - ${JSON.stringify(safeDetails)}` : ''}`);
};

const verifySignature = async (payload: string, signature: string, secret: string): Promise<boolean> => {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (expectedSignature.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      result |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
  } catch (error) {
    console.error("[MOYASAR-WEBHOOK] Signature verification error:", error);
    return false;
  }
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Webhook received");

    const moyasarSecretKey = Deno.env.get("MOYASAR_SECRET_KEY");
    const moyasarWebhookSecret = Deno.env.get("MOYASAR_WEBHOOK_SECRET");
    if (!moyasarSecretKey) throw new Error("MOYASAR_SECRET_KEY not configured");

    const rawBody = await req.text();
    const signature = req.headers.get("x-moyasar-signature") || "";
    const webhookSecret = moyasarWebhookSecret || moyasarSecretKey;

    if (!signature) {
      logStep("SECURITY: Missing webhook signature");
      await supabaseAdmin.from("security_audit_log").insert({
        action: "webhook_signature_missing", resource_type: "payment_webhook", success: false,
        error_message: "Missing Moyasar webhook signature",
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
      });
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const isValid = await verifySignature(rawBody, signature.toLowerCase(), webhookSecret);
    if (!isValid) {
      logStep("SECURITY: Invalid webhook signature");
      await supabaseAdmin.from("security_audit_log").insert({
        action: "webhook_signature_invalid", resource_type: "payment_webhook", success: false,
        error_message: "Invalid Moyasar webhook signature",
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
      });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    logStep("Webhook signature verified");

    const webhookData = JSON.parse(rawBody);
    const payment = webhookData.data;
    if (!payment) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const userId = payment.metadata?.user_id;
    const planCode = payment.metadata?.plan_code;
    const planId = payment.metadata?.plan_id;
    const internalPaymentId = payment.metadata?.internal_payment_id;

    // Validate user_id format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (userId && !uuidRegex.test(userId)) {
      logStep("Invalid user ID format");
      return new Response(JSON.stringify({ error: "Invalid user ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    // Idempotency: check if provider_payment_id already processed
    if (payment.id) {
      const { data: existingPayment } = await supabaseAdmin
        .from("payments")
        .select("id, status")
        .eq("provider_payment_id", payment.id)
        .maybeSingle();

      if (existingPayment?.status === "paid") {
        logStep("Duplicate payment - already paid", { paymentId: payment.id });
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }
    }

    const paymentStatus = payment.status?.toLowerCase();
    logStep("Processing payment", { paymentId: payment.id, userId, planCode, status: paymentStatus });

    if (paymentStatus === "paid" && userId) {
      // Update payment record
      if (internalPaymentId) {
        await supabaseAdmin.from("payments").update({
          status: "paid",
          provider_payment_id: payment.id,
          method: payment.source?.type || "unknown",
          updated_at: new Date().toISOString(),
        }).eq("id", internalPaymentId);
      } else if (payment.id) {
        // Fallback: find by provider_payment_id or insert new
        const { data: existingByProvider } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("provider_payment_id", payment.id)
          .maybeSingle();

        if (existingByProvider) {
          await supabaseAdmin.from("payments").update({ status: "paid", updated_at: new Date().toISOString() }).eq("id", existingByProvider.id);
        }
      }

      // Fetch plan from DB
      let plan: any = null;
      if (planId) {
        const { data } = await supabaseAdmin.from("subscription_plans").select("*").eq("id", planId).maybeSingle();
        plan = data;
      }
      if (!plan && planCode) {
        const { data } = await supabaseAdmin.from("subscription_plans").select("*").eq("code", planCode).maybeSingle();
        plan = data;
      }

      if (plan) {
        await activateSubscription(supabaseAdmin, userId, plan);
        logStep("Subscription activated", { planCode: plan.code, durationDays: plan.duration_days });
      } else {
        // Legacy fallback: use plan_id from metadata as plan_type text
        const legacyPlanType = planCode || payment.metadata?.plan_id;
        const isYearly = legacyPlanType?.includes('yearly') || legacyPlanType === 'enterprise';
        const durationDays = isYearly ? 365 : 30;
        await activateSubscriptionLegacy(supabaseAdmin, userId, legacyPlanType || 'unknown', durationDays);
        logStep("Subscription activated (legacy)", { planType: legacyPlanType });
      }

      // Also record in payment_history for backward compatibility
      const amountInRiyals = payment.amount / 100;
      await supabaseAdmin.from("payment_history").insert({
        user_id: userId,
        amount: amountInRiyals,
        currency: payment.currency || "SAR",
        status: "completed",
        plan_type: planCode || payment.metadata?.plan_id || "unknown",
        payment_method: payment.source?.type || "unknown",
        description: payment.description || `اشتراك ${planCode}`,
      });

    } else if (paymentStatus === "failed") {
      logStep("Payment failed", { reason: payment.source?.message });
      if (internalPaymentId) {
        await supabaseAdmin.from("payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", internalPaymentId);
      }
      await supabaseAdmin.from("payment_errors").insert({
        user_id: userId || null,
        error_message: payment.source?.message || "فشل الدفع",
        error_code: payment.source?.code || "PAYMENT_FAILED",
        amount: payment.amount / 100,
        currency: payment.currency || "SAR",
        payment_method: payment.source?.type || "unknown",
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (error) {
    console.error("[MOYASAR-WEBHOOK] Error:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});

async function activateSubscription(admin: any, userId: string, plan: any) {
  const now = new Date();

  const { data: existing } = await admin
    .from("subscriptions")
    .select("ends_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  let startDate = now;
  if (existing?.ends_at) {
    const existingEnd = new Date(existing.ends_at);
    if (existingEnd > now) startDate = existingEnd;
  }

  const endsAt = new Date(startDate);
  endsAt.setDate(endsAt.getDate() + plan.duration_days);

  await admin.from("subscriptions").upsert({
    user_id: userId,
    plan_id: plan.id,
    plan_type: plan.code,
    status: "active",
    source: "moyasar",
    started_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
    current_period_start: now.toISOString(),
    current_period_end: endsAt.toISOString(),
    updated_at: now.toISOString(),
  }, { onConflict: "user_id" });
}

async function activateSubscriptionLegacy(admin: any, userId: string, planType: string, durationDays: number) {
  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setDate(endsAt.getDate() + durationDays);

  await admin.from("subscriptions").upsert({
    user_id: userId,
    plan_type: planType,
    status: "active",
    started_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
    current_period_start: now.toISOString(),
    current_period_end: endsAt.toISOString(),
    updated_at: now.toISOString(),
  }, { onConflict: "user_id" });
}
