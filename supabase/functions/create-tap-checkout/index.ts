import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// CORS للنطاقات المسموح بها
const getAllowedOrigin = (req: Request): string => {
  const origin = req.headers.get("origin") || "";
  
  const productionOrigins = ["https://mohamie.com", "https://www.mohamie.com"];
  const developmentOrigins = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"];
  const lovablePatterns = [/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/, /^https:\/\/[a-z0-9-]+\.lovable\.app$/];
  
  if (productionOrigins.includes(origin) || developmentOrigins.includes(origin)) {
    return origin;
  }
  if (lovablePatterns.some(pattern => pattern.test(origin))) {
    return origin;
  }
  if (origin) console.warn('[SECURITY] Rejected CORS origin:', origin);
  return productionOrigins[0];
};

const getCorsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": getAllowedOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TAP-CHECKOUT] ${step}${detailsStr}`);
};

// أسعار الباقات بالريال السعودي
const PLAN_PRICES: Record<string, { amount: number; name: string }> = {
  personal_monthly: { amount: 59, name: "الباقة الشخصية (شهري)" },
  personal_yearly: { amount: 599, name: "الباقة الشخصية (سنوي)" },
  company_monthly: { amount: 99, name: "باقة الشركات (شهري)" },
  company_yearly: { amount: 899, name: "باقة الشركات (سنوي)" },
  // Legacy plan IDs for backward compatibility
  basic: { amount: 59, name: "الباقة الأساسية" },
  professional: { amount: 99, name: "الباقة الاحترافية" },
  enterprise: { amount: 899, name: "باقة المؤسسات" },
};

// طرق الدفع المدعومة
const PAYMENT_SOURCES: Record<string, string> = {
  all: "src_all",           // جميع طرق الدفع
  card: "src_card",         // البطاقات (مع token)
  apple_pay: "src_apple_pay", // Apple Pay
  google_pay: "src_google_pay", // Google Pay
  mada: "src_mada",         // مدى
  stc_pay: "src_stc_pay",   // STC Pay
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");
    
    const { planId, paymentMethod, cardToken } = await req.json();
    if (!planId || !PLAN_PRICES[planId]) {
      throw new Error("Invalid plan ID");
    }
    
    const planConfig = PLAN_PRICES[planId];
    logStep("Plan selected", { planId, amount: planConfig.amount, paymentMethod, hasToken: !!cardToken });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    // Check if user is blocked from payments
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    const { data: blockedData } = await supabaseAdmin.rpc('is_user_payment_blocked', { target_user_id: user.id });
    if (blockedData === true) {
      logStep("User is blocked from payments", { userId: user.id });
      return new Response(JSON.stringify({ 
        error: "تم حظرك من إجراء عمليات الدفع. يرجى التواصل مع الدعم.",
        code: "USER_BLOCKED"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const tapSecretKey = Deno.env.get("TAP_SECRET_KEY");
    if (!tapSecretKey) throw new Error("TAP_SECRET_KEY is not configured");

    const origin = req.headers.get("origin") || "https://mohamie.com";
    
    // إنشاء طلب الدفع عبر Tap Payments
    const chargePayload: Record<string, any> = {
      amount: planConfig.amount,
      currency: "SAR",
      customer_initiated: true,
      threeDSecure: true,
      save_card: false,
      description: `اشتراك ${planConfig.name} - محامي كوم`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        user_email: user.email,
        payment_method: paymentMethod || "card",
      },
      reference: {
        transaction: `txn_${user.id.substring(0, 8)}_${Date.now()}`,
        order: `ord_${planId}_${Date.now()}`,
      },
      receipt: {
        email: true,
        sms: false,
      },
      customer: {
        first_name: user.user_metadata?.full_name?.split(" ")[0] || "مستخدم",
        last_name: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "محامي كوم",
        email: user.email,
      },
      redirect: {
        url: `${origin}/subscription-success?plan=${planId}`,
      },
      post: {
        url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/tap-webhook`,
      },
    };

    // إذا تم تمرير token من Tap Card SDK
    if (cardToken && cardToken.startsWith("tok_")) {
      chargePayload.source = { id: cardToken };
      logStep("Using card token", { tokenId: cardToken.substring(0, 10) + "..." });
    } else {
      // استخدام مصدر الدفع المحدد
      const sourceId = PAYMENT_SOURCES[paymentMethod] || PAYMENT_SOURCES.all;
      chargePayload.source = { id: sourceId };
      logStep("Using payment source", { sourceId });
    }

    const chargeResponse = await fetch("https://api.tap.company/v2/charges/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tapSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chargePayload),
    });

    const chargeData = await chargeResponse.json();
    
    if (!chargeResponse.ok) {
      logStep("Tap API error", { 
        status: chargeResponse.status, 
        error: chargeData?.errors || chargeData?.message || chargeData 
      });
      
      // إرجاع رسالة خطأ واضحة من Tap
      const tapError = chargeData?.errors?.[0]?.description 
        || chargeData?.message 
        || "فشل في معالجة الدفع";
      
      return new Response(JSON.stringify({ 
        error: tapError,
        code: chargeData?.errors?.[0]?.code || "PAYMENT_FAILED"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Charge created", { 
      chargeId: chargeData.id, 
      status: chargeData.status,
      hasTransaction: !!chargeData.transaction 
    });

    // التحقق من حالة الدفع
    const status = chargeData.status?.toUpperCase();

    // إذا تم الدفع مباشرة (بدون 3DS)
    if (status === "CAPTURED" || status === "AUTHORIZED") {
      logStep("Payment successful without 3DS");
      return new Response(JSON.stringify({ 
        status: status,
        chargeId: chargeData.id,
        message: "تم الدفع بنجاح",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // إذا كان يحتاج 3DS
    const paymentUrl = chargeData.transaction?.url;
    if (paymentUrl) {
      logStep("3DS redirect required", { url: paymentUrl.substring(0, 50) + "..." });
      return new Response(JSON.stringify({ 
        url: paymentUrl,
        chargeId: chargeData.id,
        status: status,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // إذا فشل الدفع
    if (status === "FAILED" || status === "DECLINED" || status === "CANCELLED") {
      const failureReason = chargeData.response?.message || "تم رفض البطاقة";
      logStep("Payment failed", { status, reason: failureReason });
      return new Response(JSON.stringify({ 
        error: failureReason,
        code: chargeData.response?.code || "DECLINED",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // حالة غير متوقعة
    logStep("Unexpected status", { status, chargeData });
    return new Response(JSON.stringify({ 
      error: "حالة دفع غير متوقعة. يرجى المحاولة مرة أخرى.",
      code: "UNEXPECTED_STATUS",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[TAP-CHECKOUT] Error:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return new Response(JSON.stringify({ 
      error: "حدث خطأ في معالجة عملية الدفع. يرجى المحاولة مرة أخرى.",
      code: "INTERNAL_ERROR"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
