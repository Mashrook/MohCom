import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  const headers = createCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // التحقق من دور المستخدم (المشرف والمحامي لديهم وصول غير محدود)
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData?.role === "admin" || roleData?.role === "lawyer") {
      logStep("User has unlimited access", { role: roleData.role });
      return new Response(JSON.stringify({
        subscribed: true,
        plan_type: "enterprise",
        subscription_end: null,
        unlimited: true,
      }), {
        headers: { ...headers, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // التحقق من الاشتراك في قاعدة البيانات (Moyasar يحدث عبر Webhook)
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError) {
      logStep("Error fetching subscription", { error: subError.message });
    }

    if (!subscription) {
      logStep("No subscription found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...headers, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const now = new Date();
    const periodEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end) 
      : null;
    
    const isActive = subscription.status === "active" && (!periodEnd || periodEnd > now);

    logStep("Subscription status", { 
      status: subscription.status, 
      planType: subscription.plan_type,
      isActive,
      periodEnd: periodEnd?.toISOString() 
    });

    return new Response(JSON.stringify({
      subscribed: isActive,
      plan_type: subscription.plan_type,
      subscription_end: periodEnd?.toISOString() || null,
    }), {
      headers: { ...headers, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...headers, "Content-Type": "application/json" },
      status: 500,
    });
  }
});