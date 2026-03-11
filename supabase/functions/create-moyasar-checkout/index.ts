import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MOYASAR-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { planCode, paymentMethod, mobile } = await req.json();
    if (!planCode) throw new Error("Missing planCode");

    // Fetch plan from DB
    const { data: plan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("code", planCode)
      .eq("is_active", true)
      .maybeSingle();

    if (planError || !plan) {
      logStep("Invalid plan", { planCode, error: planError });
      return new Response(JSON.stringify({ error: "خطة غير صالحة", code: "INVALID_PLAN" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Only STC Pay goes through this endpoint; card/Apple Pay use Moyasar Embedded Form
    if (paymentMethod === "stcpay" && !mobile) {
      throw new Error("رقم الجوال مطلوب لـ STC Pay");
    }

    logStep("Plan from DB", { code: plan.code, amount: plan.price_halala });

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { email: user.email });

    // Check if blocked
    const { data: blockedData } = await supabaseAdmin.rpc('is_user_payment_blocked', { target_user_id: user.id });
    if (blockedData === true) {
      return new Response(JSON.stringify({ error: "تم حظرك من إجراء عمليات الدفع.", code: "USER_BLOCKED" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const moyasarSecretKey = Deno.env.get("MOYASAR_SECRET_KEY");
    if (!moyasarSecretKey) throw new Error("MOYASAR_SECRET_KEY is not configured");

    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://mohcom-production.up.railway.app";
    const callbackUrl = `${origin.replace(/\/$/, "")}/#/subscription-success?plan=${encodeURIComponent(plan.code)}`;

    const source = paymentMethod === "stcpay"
      ? { type: "stcpay", mobile }
      : undefined;

    if (!source) {
      return new Response(JSON.stringify({
        error: "هذه الطريقة تتم من نموذج Moyasar مباشرة.",
        code: "UNSUPPORTED_METHOD"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Insert payment record as initiated
    const { data: paymentRecord, error: insertErr } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        amount_halala: plan.price_halala,
        currency: plan.currency,
        status: "initiated",
        method: paymentMethod || "stcpay",
        metadata: { plan_code: plan.code, user_email: user.email },
      })
      .select("id")
      .single();

    if (insertErr) {
      logStep("Payment insert error", { error: insertErr });
    }

    // Create Moyasar payment
    const paymentPayload = {
      amount: plan.price_halala,
      currency: plan.currency,
      description: `اشتراك ${plan.name} - محامي كوم`,
      callback_url: callbackUrl,
      source,
      metadata: {
        user_id: user.id,
        plan_code: plan.code,
        plan_id: plan.id,
        user_email: user.email,
        internal_payment_id: paymentRecord?.id || "",
      },
    };

    const response = await fetch("https://api.moyasar.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(moyasarSecretKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentPayload),
    });

    const paymentData = await response.json();

    if (!response.ok) {
      logStep("Moyasar API error", { status: response.status, error: paymentData?.message });
      // Update payment status to failed
      if (paymentRecord?.id) {
        await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", paymentRecord.id);
      }
      return new Response(JSON.stringify({ error: paymentData?.message || "فشل في معالجة الدفع", code: "PAYMENT_FAILED" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Update payment with provider ID
    if (paymentRecord?.id && paymentData.id) {
      await supabaseAdmin.from("payments").update({ provider_payment_id: paymentData.id }).eq("id", paymentRecord.id);
    }

    const status = paymentData.status?.toLowerCase();

    if (status === "paid") {
      // Activate subscription immediately
      if (paymentRecord?.id) {
        await supabaseAdmin.from("payments").update({ status: "paid" }).eq("id", paymentRecord.id);
      }
      await activateSubscription(supabaseAdmin, user.id, plan);
      return new Response(JSON.stringify({ status: "paid", paymentId: paymentData.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (status === "initiated" && paymentData.source?.transaction_url) {
      return new Response(JSON.stringify({ url: paymentData.source.transaction_url, paymentId: paymentData.id, status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (status === "failed") {
      if (paymentRecord?.id) {
        await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", paymentRecord.id);
      }
      return new Response(JSON.stringify({ error: paymentData.source?.message || "تم رفض عملية الدفع", code: "DECLINED" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ error: "حالة دفع غير متوقعة", code: "UNEXPECTED_STATUS" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[MOYASAR-CHECKOUT] Error:", errorMessage);
    return new Response(JSON.stringify({ error: "حدث خطأ في معالجة عملية الدفع.", code: "INTERNAL_ERROR" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function activateSubscription(admin: any, userId: string, plan: any) {
  const now = new Date();

  // Check existing active subscription to extend
  const { data: existing } = await admin
    .from("subscriptions")
    .select("ends_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  let startDate = now;
  if (existing?.ends_at) {
    const existingEnd = new Date(existing.ends_at);
    if (existingEnd > now) {
      startDate = existingEnd; // extend from current end
    }
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
