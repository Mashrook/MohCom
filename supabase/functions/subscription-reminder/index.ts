import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

const escapeHtml = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

interface RenewalReminderRequest {
  userId?: string;
  daysBeforeExpiry?: number;
  sendToAll?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // التحقق من المصادقة
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const requestData: RenewalReminderRequest = await req.json();
    const { userId, daysBeforeExpiry = 7, sendToAll = false } = requestData;

    // التحقق من صلاحيات المدير للإرسال الجماعي
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = userRole?.role === "admin";

    if (sendToAll && !isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required for bulk emails" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // جلب الاشتراكات التي ستنتهي قريباً
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysBeforeExpiry);

    let query = supabase
      .from("subscriptions")
      .select(`
        user_id,
        plan_type,
        status,
        current_period_end
      `)
      .eq("status", "active")
      .lte("current_period_end", expiryDate.toISOString())
      .gte("current_period_end", new Date().toISOString());

    if (!sendToAll && userId) {
      // إرسال للمستخدم المحدد فقط
      if (!isAdmin && user.id !== userId) {
        return new Response(
          JSON.stringify({ success: false, error: "Cannot send reminders for other users" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      query = query.eq("user_id", userId);
    } else if (!sendToAll) {
      // إرسال للمستخدم الحالي فقط
      query = query.eq("user_id", user.id);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions expiring soon", emailsSent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailResults = [];

    for (const subscription of subscriptions) {
      // جلب بيانات المستخدم
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", subscription.user_id)
        .single();

      const { data: authUser } = await supabase.auth.admin.getUserById(subscription.user_id);
      
      if (!authUser?.user?.email) {
        console.log(`No email found for user ${subscription.user_id}`);
        continue;
      }

      const userName = profile?.full_name || "عزيزي المستخدم";
      const userEmail = authUser.user.email;
      const expiryDate = new Date(subscription.current_period_end!);
      const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      const planNames: Record<string, string> = {
        basic: "الأساسية",
        professional: "الاحترافية",
        enterprise: "المؤسسات",
        free: "المجانية"
      };

      const planName = planNames[subscription.plan_type] || subscription.plan_type;
      const safeUserName = escapeHtml(userName);
      const safePlanName = escapeHtml(planName);

      try {
        const emailResponse = await resend.emails.send({
          from: "محامي كوم <onboarding@resend.dev>",
          to: [userEmail],
          subject: `تذكير: اشتراكك ينتهي خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'} - محامي كوم`,
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
                
                <div style="height: 1px; background: linear-gradient(90deg, transparent, #D4AF37, transparent); margin: 20px 0;"></div>
                
                <!-- Content -->
                <div style="text-align: center; padding: 20px 0;">
                  <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 36px;">⏰</span>
                  </div>
                  
                  <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px;">اشتراكك ينتهي قريباً!</h2>
                  
                  <p style="color: #cccccc; font-size: 16px; line-height: 1.8; margin-bottom: 30px;">
                    مرحباً ${safeUserName}،<br>
                    نود إعلامك بأن اشتراكك في باقة <strong style="color: #D4AF37;">${safePlanName}</strong> سينتهي قريباً.
                  </p>
                  
                  <!-- Expiry Card -->
                  <div style="background: rgba(255, 87, 87, 0.1); border: 1px solid rgba(255, 87, 87, 0.3); border-radius: 12px; padding: 25px; margin: 20px 0;">
                    <p style="color: #ff5757; font-size: 18px; margin: 0 0 10px 0; font-weight: bold;">
                      متبقي ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'} فقط
                    </p>
                    <p style="color: #888; font-size: 14px; margin: 0;">
                      تاريخ انتهاء الاشتراك: ${expiryDate.toLocaleDateString('ar-SA', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  
                  <p style="color: #cccccc; font-size: 14px; line-height: 1.8; margin: 20px 0;">
                    جدد اشتراكك الآن للاستمرار في الوصول إلى جميع خدماتنا القانونية المميزة.
                  </p>
                  
                  <!-- CTA Button -->
                  <a href="https://mohamie.com/pricing" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%); color: #0A0E27; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 20px;">
                    تجديد الاشتراك الآن
                  </a>
                  
                  <p style="color: #666; font-size: 12px; margin-top: 20px;">
                    أو يمكنك إدارة اشتراكك من <a href="https://mohamie.com/subscription" style="color: #D4AF37;">صفحة إدارة الاشتراك</a>
                  </p>
                </div>
                
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

        emailResults.push({ userId: subscription.user_id, success: true, email: userEmail });
        console.log(`Renewal reminder sent to ${userEmail}`);
      } catch (emailError: any) {
        console.error(`Failed to send email to ${userEmail}:`, emailError);
        emailResults.push({ userId: subscription.user_id, success: false, error: emailError.message });
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${successCount} renewal reminders`,
        emailsSent: successCount,
        results: emailResults 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in subscription-reminder:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
