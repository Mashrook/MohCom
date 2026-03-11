import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createAiChatCompletion } from "../_shared/ai-provider.ts";

// Simple in-memory rate limiter per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_ANON = 5;       // 5 requests/min for anonymous
const RATE_LIMIT_MAX_AUTH = 20;      // 20 requests/min for authenticated

function isRateLimited(key: string, maxRequests: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  entry.count++;
  if (entry.count > maxRequests) {
    return true;
  }
  return false;
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60_000);

const SYSTEM_PROMPT = `أنت مساعد دعم فني ذكي لمنصة "محامي كوم" - منصة خدمات قانونية سعودية.

معلومات المنصة:
- الخدمات: استشارات قانونية ذكية، التنبؤ بالأحكام، تحليل العقود، الشكاوى الذكية، البحث القانوني، التواصل مع المحامين
- الباقات: الأساسية (99 ريال/شهر)، الاحترافية (199 ريال/شهر)، المؤسسات (499 ريال/شهر)
- طرق الدفع: Apple Pay، Google Pay، مدى، Visa، Mastercard
- البريد: info@mohamie.com

مهامك:
1. الرد على استفسارات المستخدمين بشكل ودود ومختصر
2. شرح خدمات المنصة والباقات
3. المساعدة في مشاكل الدفع والاشتراك
4. توجيه المستخدمين للأقسام المناسبة
5. إذا كان السؤال معقد أو يحتاج تدخل بشري، اقترح التواصل مع الدعم الفني عبر الواتساب

أسلوبك:
- ودود ومهني
- ردود مختصرة (جملتين إلى 3 جمل)
- استخدم الإيموجي باعتدال
- تحدث بالعربية الفصحى السهلة`;

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Determine client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';

    // Check authentication (optional but gives higher rate limit)
    let isAuthenticated = false;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      
      const token = authHeader.replace('Bearer ', '');
      const { data, error } = await supabase.auth.getClaims(token);
      if (!error && data?.claims?.sub) {
        isAuthenticated = true;
      }
    }

    // Apply rate limiting
    const rateLimitKey = isAuthenticated ? `auth:${clientIP}` : `anon:${clientIP}`;
    const maxRequests = isAuthenticated ? RATE_LIMIT_MAX_AUTH : RATE_LIMIT_MAX_ANON;
    
    if (isRateLimited(rateLimitKey, maxRequests)) {
      return new Response(
        JSON.stringify({ error: "عذراً، لقد تجاوزت الحد المسموح من الطلبات. يرجى المحاولة بعد دقيقة." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();
    
    // Validate messages input
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
      return new Response(
        JSON.stringify({ error: "طلب غير صالح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each message
    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== 'string') {
        return new Response(
          JSON.stringify({ error: "طلب غير صالح" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (msg.content.length > 2000) {
        return new Response(
          JSON.stringify({ error: "الرسالة طويلة جداً" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const response = await createAiChatCompletion({
      modelEnvVar: "SUPPORT_CHAT_MODEL",
      requestBody: {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "عذراً، الخدمة مشغولة حالياً. يرجى المحاولة بعد قليل." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "الخدمة غير متاحة مؤقتاً." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "حدث خطأ في الاتصال" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Support chat error:", error);
    return new Response(JSON.stringify({ error: "حدث خطأ غير متوقع" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
