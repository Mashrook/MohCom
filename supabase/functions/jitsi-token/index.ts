import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

// Secure CORS origin validation
const getAllowedOrigin = (req: Request): string => {
  const origin = req.headers.get('origin') || '';
  const productionOrigins = ['https://mohamie.com', 'https://www.mohamie.com'];
  const developmentOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080'];
  const lovablePatterns = [/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/, /^https:\/\/[a-z0-9-]+\.lovable\.app$/];
  
  if (productionOrigins.includes(origin) || developmentOrigins.includes(origin)) return origin;
  if (lovablePatterns.some(p => p.test(origin))) return origin;
  if (origin) console.warn('[SECURITY] Rejected CORS origin:', origin);
  return productionOrigins[0];
};

const getCorsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": getAllowedOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { roomName, targetUserId } = await req.json();

    if (!roomName || !targetUserId) {
      return new Response(
        JSON.stringify({ error: "Missing roomName or targetUserId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single();

    // Get Jitsi credentials
    const appId = Deno.env.get("JITSI_APP_ID");
    const privateKeyPem = Deno.env.get("JITSI_PRIVATE_KEY");

    if (!appId || !privateKeyPem) {
      console.error("Missing Jitsi credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse private key
    let privateKey;
    try {
      privateKey = await jose.importPKCS8(privateKeyPem, "RS256");
    } catch (e) {
      console.error("Error parsing private key:", e);
      return new Response(
        JSON.stringify({ error: "Invalid private key configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate JWT token for Jitsi
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour expiry

    const payload = {
      aud: "jitsi",
      iss: "chat",
      sub: appId,
      room: roomName,
      exp,
      nbf: now,
      iat: now,
      context: {
        user: {
          id: user.id,
          name: profile?.full_name || user.email?.split("@")[0] || "User",
          email: user.email,
          avatar: profile?.avatar_url || "",
        },
        features: {
          livestreaming: false,
          recording: false,
          transcription: false,
          "outbound-call": false,
        },
      },
    };

    const jwtToken = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: appId })
      .sign(privateKey);

    console.log(`Generated Jitsi token for user ${user.id} in room ${roomName}`);

    return new Response(
      JSON.stringify({
        token: jwtToken,
        roomName,
        domain: "8x8.vc",
        appId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating Jitsi token:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
