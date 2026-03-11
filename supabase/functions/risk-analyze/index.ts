import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createAiChatCompletion } from "../_shared/ai-provider.ts";

interface RiskInput {
  case_title: string;
  case_description: string;
  category: string;
  jurisdiction: string;
}

Deno.serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RiskInput = await req.json();

    if (!body.case_title || !body.case_description) {
      return new Response(
        JSON.stringify({ error: "case_title and case_description required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch scoring configurations
    const { data: configs } = await supabase
      .from("risk_configurations")
      .select("config_key, config_value");

    const configMap: Record<string, any> = {};
    (configs || []).forEach((c: any) => {
      configMap[c.config_key] = c.config_value;
    });

    const categoryWeights = configMap.category_weights || { _default: 10 };
    const thresholds = configMap.risk_thresholds || {
      LOW: 0,
      MEDIUM: 25,
      HIGH: 50,
      CRITICAL: 75,
    };

    // Call AI for analysis
    const aiPrompt = `أنت محلل مخاطر قانوني متخصص في القانون السعودي. قم بتحليل القضية التالية وتقييم المخاطر.

عنوان القضية: ${body.case_title}
وصف القضية: ${body.case_description}
الفئة: ${body.category || "عام"}
الاختصاص: ${body.jurisdiction || "المملكة العربية السعودية"}

قم بإرجاع تحليلك بالتنسيق التالي (JSON فقط بدون أي نص إضافي):
{
  "analysis": "تحليل مفصل للمخاطر القانونية",
  "confidence": 0.85,
  "risk_flags": {
    "low_confidence": false,
    "missing_citations": false,
    "pii_detected": false,
    "potential_contradictions": false,
    "complex_jurisdiction": false,
    "high_financial_exposure": false
  },
  "recommendations": ["توصية 1", "توصية 2", "توصية 3"],
  "category_risk_factor": "وصف عامل خطر الفئة",
  "estimated_score": 45
}`;

    let aiResult: any = {
      analysis: "لم يتم إجراء تحليل AI",
      confidence: 0.5,
      risk_flags: {},
      recommendations: [],
      estimated_score: 25,
    };

    try {
      const aiResponse = await createAiChatCompletion({
        modelEnvVar: "RISK_ANALYSIS_MODEL",
        requestBody: {
          messages: [{ role: "user", content: aiPrompt }],
          temperature: 0.3,
          stream: false,
        },
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {
      console.error("AI analysis error:", e);
    }

    // Calculate score using config weights
    const category = body.category || "عام";
    const categoryWeight =
      categoryWeights[category] || categoryWeights._default || 10;

    // Combine AI estimated score with category weight
    let rawScore = Math.round(
      (aiResult.estimated_score || 25) * 0.6 + categoryWeight * 0.4
    );

    // Add risk flag weights
    const aiWeights = configMap.ai_weights || {};
    const flags = aiResult.risk_flags || {};
    if (flags.low_confidence) rawScore += aiWeights["ثقة_منخفضة"] || 10;
    if (flags.pii_detected) rawScore += aiWeights["بيانات_شخصية"] || 5;
    if (flags.potential_contradictions) rawScore += aiWeights["هلوسة"] || 15;
    if (flags.high_financial_exposure) rawScore += 10;

    const score = Math.min(100, Math.max(0, rawScore));

    // Map score to level
    let level = "LOW";
    if (score >= (thresholds.CRITICAL || 75)) level = "CRITICAL";
    else if (score >= (thresholds.HIGH || 50)) level = "HIGH";
    else if (score >= (thresholds.MEDIUM || 25)) level = "MEDIUM";

    const signals = {
      categoryWeight,
      categoryName: category,
      aiConfidence: aiResult.confidence || 0,
      riskFlags: flags,
      rawScore,
      clampedScore: score,
    };

    // Save to database
    const { data: assessment, error: insertError } = await supabase
      .from("risk_assessments")
      .insert({
        user_id: user.id,
        case_title: body.case_title.substring(0, 500),
        case_description: body.case_description.substring(0, 5000),
        category,
        jurisdiction: body.jurisdiction || "المملكة العربية السعودية",
        score,
        level,
        signals,
        ai_analysis: (aiResult.analysis || "").substring(0, 10000),
        ai_confidence: aiResult.confidence || 0,
        risk_flags: flags,
        recommendations: aiResult.recommendations || [],
        status: "completed",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save assessment" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(assessment), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Risk analysis error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
