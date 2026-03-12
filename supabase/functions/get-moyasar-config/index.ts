import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req, "GET, OPTIONS");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const publishableKey = Deno.env.get("MOYASAR_PUBLISHABLE_KEY");
    
    if (!publishableKey) {
      console.error("[MOYASAR-CONFIG] MOYASAR_PUBLISHABLE_KEY not configured");
      return new Response(JSON.stringify({ error: "Moyasar not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // التحقق من صيغة المفتاح
    if (!publishableKey.startsWith("pk_test_") && !publishableKey.startsWith("pk_live_")) {
      console.error("[MOYASAR-CONFIG] Invalid publishable key format");
      return new Response(JSON.stringify({ error: "Invalid key format" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ 
      publishableKey,
      supportedMethods: ["creditcard", "stcpay"],
      supportedNetworks: ["visa", "mastercard", "mada"],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[MOYASAR-CONFIG] Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
