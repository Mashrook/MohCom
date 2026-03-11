import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Allowed origins for CORS
const getAllowedOrigin = (req: Request): string => {
  const origin = req.headers.get('origin') || '';
  
  const productionOrigins = ['https://mohamie.com', 'https://www.mohamie.com'];
  const developmentOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080'];
  const lovablePatterns = [/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/, /^https:\/\/[a-z0-9-]+\.lovable\.app$/];
  
  if (productionOrigins.includes(origin)) return origin;
  if (developmentOrigins.includes(origin)) return origin;
  if (lovablePatterns.some(p => p.test(origin))) return origin;
  
  // For webhooks from Tap, allow the request but don't set a specific origin
  return productionOrigins[0];
};

const getCorsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": getAllowedOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, hashstring",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TAP-WEBHOOK] ${step}${detailsStr}`);
};

// Verify Tap webhook signature using HMAC-SHA256
async function verifyTapSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    
    const signatureBytes = encoder.encode(payload);
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, signatureBytes);
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Timing-safe comparison
    if (computedSignature.length !== signature.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < computedSignature.length; i++) {
      result |= computedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    
    return result === 0;
  } catch (error) {
    logStep("Signature verification error", { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Webhook received");
    
    // Get the raw body for signature verification
    const rawBody = await req.text();
    
    // Verify webhook signature
    const tapSecret = Deno.env.get("TAP_WEBHOOK_SECRET");
    const signature = req.headers.get("hashstring") || req.headers.get("tap-signature") || "";
    
    // TAP_WEBHOOK_SECRET is required in production
    if (!tapSecret || tapSecret.length === 0) {
      logStep("CRITICAL: TAP_WEBHOOK_SECRET not configured - rejecting webhook");
      
      // Log security event
      await supabaseClient
        .from("security_audit_log")
        .insert({
          action: "webhook_secret_missing",
          resource_type: "payment_webhook",
          success: false,
          error_message: "TAP_WEBHOOK_SECRET not configured - webhook rejected",
          ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
        });
      
      return new Response(JSON.stringify({ error: "Webhook verification not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    if (!signature) {
      logStep("Missing webhook signature");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const isValid = await verifyTapSignature(rawBody, signature.toLowerCase(), tapSecret);
    if (!isValid) {
      logStep("Invalid webhook signature", { receivedSignature: signature.substring(0, 10) + '...' });
      
      // Log this as a potential security event
      await supabaseClient
        .from("security_audit_log")
        .insert({
          action: "webhook_signature_invalid",
          resource_type: "payment_webhook",
          success: false,
          error_message: "Invalid Tap webhook signature",
          ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
        });
      
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    logStep("Webhook signature verified successfully");
    
    // Parse the payload
    const payload = JSON.parse(rawBody);
    logStep("Payload", payload);

    const chargeId = payload.id;
    const status = payload.status;
    const metadata = payload.metadata || {};
    const userId = metadata.user_id;
    const planId = metadata.plan_id;

    // Verify that the charge ID exists in Tap by checking structure
    if (!chargeId || typeof chargeId !== 'string' || !chargeId.startsWith('chg_')) {
      logStep("Invalid charge ID format", { chargeId });
      return new Response(JSON.stringify({ error: "Invalid charge ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Log failed payment attempts
    if (status && status !== "CAPTURED" && status !== "INITIATED") {
      const errorMessage = payload.response?.message || payload.message || `Payment failed with status: ${status}`;
      const errorCode = payload.response?.code || payload.code || status;
      
      await supabaseClient
        .from("payment_errors")
        .insert({
          user_id: userId || null,
          error_code: String(errorCode),
          error_message: errorMessage,
          payment_method: payload.source?.payment_method || payload.payment_method || null,
          amount: payload.amount || null,
          currency: payload.currency || "SAR",
          tap_charge_id: chargeId || null,
          request_payload: metadata,
          response_payload: payload.response || payload
        });
      
      logStep("Payment error logged", { status, errorCode, errorMessage });
    }

    if (!userId || !planId) {
      logStep("Missing metadata", { userId, planId });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Validate user ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      logStep("Invalid user ID format", { userId });
      return new Response(JSON.stringify({ error: "Invalid user ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validate plan ID
    const validPlans = ['basic', 'professional', 'enterprise'];
    if (!validPlans.includes(planId)) {
      logStep("Invalid plan ID", { planId });
      return new Response(JSON.stringify({ error: "Invalid plan ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // استخراج معلومات الدفع
    const amount = payload.amount || 0;
    const currency = payload.currency || "SAR";
    const paymentMethod = payload.source?.payment_method || payload.payment_method || "card";
    const receiptId = payload.receipt?.id || null;

    // Check for duplicate charge ID to prevent replay attacks
    // Check duplicate using encrypted column - match via RPC or metadata
    // Since plaintext columns are removed, we check payment_errors for duplicate charge
    const { data: existingPayment } = await supabaseClient
      .from("payment_errors")
      .select("id")
      .eq("tap_charge_id", chargeId)
      .maybeSingle();

    if (existingPayment) {
      logStep("Duplicate charge ID detected", { chargeId });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // حفظ سجل الدفع بغض النظر عن الحالة
    // Note: plaintext tap_charge_id/tap_receipt_id columns removed.
    // Encryption triggers handle tap_charge_id_encrypted/tap_receipt_id_encrypted automatically.
    const paymentHistoryData: Record<string, unknown> = {
      user_id: userId,
      amount: amount,
      currency: currency,
      status: status === "CAPTURED" ? "completed" : status.toLowerCase(),
      payment_method: paymentMethod,
      plan_type: planId,
      description: `اشتراك في باقة ${planId === 'basic' ? 'الأساسية' : planId === 'professional' ? 'الاحترافية' : planId === 'enterprise' ? 'المؤسسات' : planId}`,
    };

    const { error: paymentHistoryError } = await supabaseClient
      .from("payment_history")
      .insert(paymentHistoryData);

    if (paymentHistoryError) {
      logStep("Error saving payment history", { error: paymentHistoryError.message });
    } else {
      logStep("Payment history saved");
    }

    // التحقق من نجاح الدفع
    if (status === "CAPTURED") {
      logStep("Payment successful", { userId, planId, chargeId });

      // حساب تاريخ انتهاء الاشتراك (30 يوم)
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // تحديث الاشتراك في قاعدة البيانات
      const { error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({
          plan_type: planId,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        logStep("Error updating subscription", { error: updateError.message });
        throw updateError;
      }

      logStep("Subscription updated successfully");
    } else {
      logStep("Payment not captured", { status });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
