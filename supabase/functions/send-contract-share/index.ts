import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// CORS configuration
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

// HTML escape function to prevent injection
const escapeHtml = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

interface ContractShareRequest {
  recipientEmail: string;
  contractTitle: string;
  shareLink: string;
  expiresInDays: number;
  senderName?: string;
}

// Input validation
const validateInput = (data: ContractShareRequest): { valid: boolean; error?: string } => {
  if (!data.recipientEmail || !data.contractTitle || !data.shareLink) {
    return { valid: false, error: "Missing required fields" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.recipientEmail) || data.recipientEmail.length > 255) {
    return { valid: false, error: "Invalid email format" };
  }

  if (data.contractTitle.length > 200) {
    return { valid: false, error: "Contract title too long" };
  }

  if (!data.shareLink.startsWith('http')) {
    return { valid: false, error: "Invalid share link" };
  }

  if (data.expiresInDays < 1 || data.expiresInDays > 30) {
    return { valid: false, error: "Expiration days must be between 1 and 30" };
  }

  return { valid: true };
};

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const requestData: ContractShareRequest = await req.json();

    const validation = validateInput(requestData);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { recipientEmail, contractTitle, shareLink, expiresInDays, senderName } = requestData;

    const safeTitle = escapeHtml(contractTitle);
    const safeSender = escapeHtml(senderName || 'مستخدم');
    const safeLink = escapeHtml(shareLink);

    console.log(`User ${user.email} sharing contract "${contractTitle}" with ${recipientEmail}`);

    const emailResponse = await resend.emails.send({
      from: "محامي كوم <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `مشاركة عقد: ${safeTitle}`,
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; background-color: #0A0E27; color: #ffffff; padding: 40px 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #141B2D 0%, #1A2234 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(212, 175, 55, 0.2);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">محامي كوم</h1>
              <p style="color: #888; margin: 5px 0 0 0; font-size: 14px;">ADVISOR AI</p>
            </div>
            
            <!-- Divider -->
            <div style="height: 1px; background: linear-gradient(90deg, transparent, #D4AF37, transparent); margin: 20px 0;"></div>
            
            <!-- Content -->
            <div style="text-align: center; padding: 20px 0;">
              <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px;">تمت مشاركة عقد معك</h2>
              
              <p style="color: #cccccc; font-size: 16px; line-height: 1.8; margin-bottom: 30px;">
                مرحباً،<br>
                قام ${safeSender} بمشاركة عقد معك على منصة محامي كوم.
              </p>
              
              <!-- Contract Card -->
              <div style="background: rgba(212, 175, 55, 0.1); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 25px; text-align: center; margin: 20px 0;">
                <div style="font-size: 48px; margin-bottom: 15px;">📄</div>
                <h3 style="color: #D4AF37; font-size: 20px; margin: 0 0 10px 0;">${safeTitle}</h3>
                <p style="color: #888; font-size: 14px; margin: 0;">صالح لمدة ${expiresInDays} أيام</p>
              </div>
              
              <!-- CTA Button -->
              <a href="${shareLink}" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%); color: #0A0E27; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 20px;">
                عرض العقد
              </a>
              
              <p style="color: #666; font-size: 12px; margin-top: 20px;">
                أو انسخ الرابط التالي:<br>
                <span style="color: #888; word-break: break-all;">${safeLink}</span>
              </p>
            </div>
            
            <!-- Divider -->
            <div style="height: 1px; background: linear-gradient(90deg, transparent, #D4AF37, transparent); margin: 30px 0;"></div>
            
            <!-- Footer -->
            <div style="text-align: center; color: #666; font-size: 12px;">
              <p style="margin: 0 0 10px 0;">هذا البريد الإلكتروني مُرسل من منصة محامي كوم</p>
              <p style="margin: 0;">
                <a href="mailto:info@mohamie.com" style="color: #D4AF37; text-decoration: none;">info@mohamie.com</a>
              </p>
              <p style="margin: 10px 0 0 0; color: #444;">© 2024 محامي كوم - جميع الحقوق محفوظة</p>
            </div>
            
          </div>
        </body>
        </html>
      `,
    });

    console.log("Contract share email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending contract share email:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to send email" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
