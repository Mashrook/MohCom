import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
  'Access-Control-Allow-Origin': getAllowedOrigin(req),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'غير مصرح - يرجى تسجيل الدخول' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create Supabase client to verify the token
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase configuration missing');
      return new Response(
        JSON.stringify({ error: 'خطأ في إعدادات الخادم' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Verify the user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'جلسة غير صالحة - يرجى إعادة تسجيل الدخول' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { query } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'يرجى إدخال نص للبحث' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize and validate query length
    const sanitizedQuery = query.trim().slice(0, 1000);
    if (sanitizedQuery.length < 3) {
      return new Response(
        JSON.stringify({ error: 'يرجى إدخال نص بحث أطول (3 أحرف على الأقل)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      console.error('PERPLEXITY_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'خدمة البحث غير متوفرة حالياً' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Perplexity search query:', sanitizedQuery, 'by user:', user.id);

    const systemPrompt = `أنت مساعد قانوني متخصص في الأنظمة والتشريعات السعودية.
مهمتك هي البحث وتقديم معلومات دقيقة حول الأنظمة والقوانين في المملكة العربية السعودية.

عند الإجابة:
1. قدم المعلومات بشكل منظم ومرتب
2. اذكر أسماء الأنظمة والمواد ذات الصلة بدقة
3. وضح تطبيق القانون على الحالة المطروحة
4. قدم نصائح عملية إن أمكن
5. اذكر المصادر الرسمية (مثل هيئة الخبراء، وزارة العدل)

الإجابة يجب أن تكون:
- باللغة العربية
- موثقة بالأنظمة السعودية
- عملية وقابلة للتطبيق`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `ابحث في الأنظمة والتشريعات السعودية عن: ${sanitizedQuery}` }
        ],
        search_domain_filter: [
          'laws.boe.gov.sa',
          'moj.gov.sa',
          'hrsd.gov.sa',
          'mc.gov.sa',
          'nazaha.gov.sa',
          'spa.gov.sa'
        ],
        search_recency_filter: 'year',
        return_citations: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'حدث خطأ في خدمة البحث' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Perplexity response received for user:', user.id);

    const result = {
      content: data.choices?.[0]?.message?.content || '',
      citations: data.citations || [],
      model: data.model,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Perplexity search error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
