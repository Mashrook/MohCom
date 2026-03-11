import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Allowed origins for CORS
const getAllowedOrigin = (req: Request): string => {
  const origin = req.headers.get('origin') || '';
  
  const productionOrigins = ['https://mohamie.com', 'https://www.mohamie.com'];
  const developmentOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080'];
  const lovablePatterns = [/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/, /^https:\/\/[a-z0-9-]+\.lovable\.app$/];
  
  if (productionOrigins.includes(origin)) return origin;
  if (developmentOrigins.includes(origin)) return origin;
  if (lovablePatterns.some(p => p.test(origin))) return origin;
  
  return productionOrigins[0];
};

const getCorsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": getAllowedOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const publicKey = Deno.env.get("TAP_PUBLIC_KEY");
    
    if (!publicKey) {
      console.error("TAP_PUBLIC_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Payment configuration not available" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Returning TAP public key configuration");
    
    return new Response(
      JSON.stringify({ publicKey }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching tap config:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch payment configuration" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
