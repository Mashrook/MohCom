import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Secure CORS origin validation
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
  'Access-Control-Allow-Origin': getAllowedOrigin(req),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for, x-real-ip',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP from headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    
    // Priority: CF > X-Forwarded-For > X-Real-IP
    let clientIp = cfConnectingIp || 
                   (forwardedFor ? forwardedFor.split(',')[0].trim() : null) || 
                   realIp || 
                   'unknown';

    console.log('Checking admin IP access:', { clientIp, forwardedFor, realIp, cfConnectingIp });

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if IP restriction is enabled
    const { data: settings, error: settingsError } = await supabase
      .from('admin_security_settings')
      .select('setting_value')
      .eq('setting_key', 'ip_restriction_enabled')
      .single();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      // If error, allow access (fail open for usability)
      return new Response(
        JSON.stringify({ allowed: true, ip: clientIp, reason: 'settings_error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If restriction is disabled, allow all
    if (!settings?.setting_value) {
      return new Response(
        JSON.stringify({ allowed: true, ip: clientIp, reason: 'restriction_disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if IP is in allowed list
    const { data: allowedIps, error: ipsError } = await supabase
      .from('admin_allowed_ips')
      .select('ip_address')
      .eq('is_active', true);

    if (ipsError) {
      console.error('Error fetching allowed IPs:', ipsError);
      return new Response(
        JSON.stringify({ allowed: false, ip: clientIp, reason: 'database_error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if client IP is in allowed list
    const isAllowed = allowedIps?.some(item => item.ip_address === clientIp) || false;

    // Log access attempt
    console.log('IP access check result:', { clientIp, isAllowed, allowedCount: allowedIps?.length });

    return new Response(
      JSON.stringify({ 
        allowed: isAllowed, 
        ip: clientIp,
        reason: isAllowed ? 'ip_allowed' : 'ip_not_in_whitelist'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-admin-ip:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ allowed: false, ip: 'unknown', reason: 'server_error', error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
