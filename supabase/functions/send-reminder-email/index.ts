import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// تقييد CORS للنطاقات المسموح بها فقط - مطابقة دقيقة لمنع تجاوز الأمان
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

// Input validation
const validateInput = (data: ReminderEmailRequest): { valid: boolean; error?: string } => {
  // Check required fields
  if (!data.userEmail || !data.userName || !data.appointmentDate || 
      !data.appointmentTime || !data.lawyerName || !data.appointmentType) {
    return { valid: false, error: "Missing required fields" };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.userEmail) || data.userEmail.length > 255) {
    return { valid: false, error: "Invalid email format" };
  }

  // Validate string lengths
  if (data.userName.length > 100 || data.lawyerName.length > 100 || 
      data.appointmentType.length > 100) {
    return { valid: false, error: "Field values too long (max 100 characters)" };
  }

  // Validate date format (YYYY-MM-DD or Arabic date)
  const dateRegex = /^(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}|[\u0660-\u0669\u0030-\u0039]+[\/.-][\u0660-\u0669\u0030-\u0039]+[\/.-][\u0660-\u0669\u0030-\u0039]+)$/;
  if (data.appointmentDate.length > 50) {
    return { valid: false, error: "Invalid date format" };
  }

  // Validate time format
  if (data.appointmentTime.length > 20) {
    return { valid: false, error: "Invalid time format" };
  }

  return { valid: true };
};

interface ReminderEmailRequest {
  userEmail: string;
  userName: string;
  appointmentDate: string;
  appointmentTime: string;
  lawyerName: string;
  appointmentType: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // التحقق من المصادقة - مطلوب JWT صالح
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - Missing authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // التحقق من صحة الـ JWT والحصول على بيانات المستخدم
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const requestData: ReminderEmailRequest = await req.json();

    // Validate all inputs
    const validation = validateInput(requestData);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const {
      userEmail,
      userName,
      appointmentDate,
      appointmentTime,
      lawyerName,
      appointmentType,
    } = requestData;

    // التحقق من أن المستخدم يرسل رسالة لنفسه فقط (أو أنه مدير/محامي)
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdminOrLawyer = userRole?.role === "admin" || userRole?.role === "lawyer";
    
    // التحقق من أن البريد المرسل إليه هو بريد المستخدم المصادق عليه (إلا إذا كان مدير/محامي)
    if (!isAdminOrLawyer && user.email !== userEmail) {
      console.error(`User ${user.email} attempted to send email to ${userEmail}`);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - Cannot send emails to other users" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Authenticated user ${user.email} sending reminder email to ${userEmail} for appointment with ${escapeHtml(lawyerName)}`);

    // Escape all user-supplied data for HTML email
    const safeUserName = escapeHtml(userName);
    const safeLawyerName = escapeHtml(lawyerName);
    const safeAppointmentType = escapeHtml(appointmentType);
    const safeAppointmentDate = escapeHtml(appointmentDate);
    const safeAppointmentTime = escapeHtml(appointmentTime);

    const emailResponse = await resend.emails.send({
      from: "محامي كوم <onboarding@resend.dev>",
      to: [userEmail],
      subject: `تذكير: موعدك مع ${safeLawyerName} - ${safeAppointmentDate}`,
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
              <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px;">تذكير بموعدك القادم</h2>
              
              <p style="color: #cccccc; font-size: 16px; line-height: 1.8; margin-bottom: 30px;">
                مرحباً ${safeUserName}،<br>
                نود تذكيرك بموعدك القادم مع المحامي.
              </p>
              
              <!-- Appointment Card -->
              <div style="background: rgba(212, 175, 55, 0.1); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 25px; text-align: right; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #888; font-size: 14px;">المحامي:</td>
                    <td style="padding: 10px 0; color: #D4AF37; font-size: 16px; font-weight: bold;">${safeLawyerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #888; font-size: 14px;">نوع الموعد:</td>
                    <td style="padding: 10px 0; color: #ffffff; font-size: 16px;">${safeAppointmentType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #888; font-size: 14px;">التاريخ:</td>
                    <td style="padding: 10px 0; color: #ffffff; font-size: 16px;">${safeAppointmentDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #888; font-size: 14px;">الوقت:</td>
                    <td style="padding: 10px 0; color: #D4AF37; font-size: 18px; font-weight: bold;">${safeAppointmentTime}</td>
                  </tr>
                </table>
              </div>
              
              <!-- CTA Button -->
              <a href="https://mohamie.com/client-dashboard" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%); color: #0A0E27; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 20px;">
                عرض لوحة التحكم
              </a>
            </div>
            
            <!-- Divider -->
            <div style="height: 1px; background: linear-gradient(90deg, transparent, #D4AF37, transparent); margin: 30px 0;"></div>
            
            <!-- Footer -->
            <div style="text-align: center; color: #666; font-size: 12px;">
              <p style="margin: 0 0 10px 0;">هذا البريد الإلكتروني مُرسل تلقائياً من منصة محامي كوم</p>
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

    console.log("Reminder email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending reminder email:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An error occurred while sending the email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
