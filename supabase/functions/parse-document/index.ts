import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createAiChatCompletion } from "../_shared/ai-provider.ts";

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // التحقق من المصادقة
    const authHeader = req.headers.get("Authorization");
    let token = "";
    if (authHeader) {
      token = authHeader.replace("Bearer ", "");
    }
    
    if (!token) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "جلسة غير صالحة" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    console.log('[PARSE-DOCUMENT] Processing document request');

    const { filePaths } = await req.json();
    
    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return new Response(JSON.stringify({ error: "لا توجد ملفات للمعالجة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extractedTexts: string[] = [];

    for (const filePath of filePaths) {
      console.log(`[PARSE-DOCUMENT] Processing file: ${filePath}`);
      
      // تحقق من أن الملف يخص المستخدم الحالي
      if (!filePath.startsWith(`${userId}/`)) {
        console.warn('[PARSE-DOCUMENT] Unauthorized file access attempt blocked');
        continue;
      }

      // تحميل الملف من Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("prediction-files")
        .download(filePath);

      if (downloadError || !fileData) {
        console.error(`[PARSE-DOCUMENT] Error downloading file: ${downloadError?.message}`);
        continue;
      }

      const fileName = filePath.split('/').pop() || '';
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
      
      let extractedText = "";

      try {
        if (fileExtension === 'pdf') {
          extractedText = await extractTextFromPDF(fileData);
        } else if (['doc', 'docx'].includes(fileExtension)) {
          extractedText = await extractTextFromDOCX(fileData);
        } else if (['txt', 'text'].includes(fileExtension)) {
          extractedText = await fileData.text();
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
          // للصور: استخدام OCR عبر مزود الذكاء الاصطناعي المهيأ في البيئة
          extractedText = await extractTextFromImage(fileData, fileExtension);
        } else {
          console.log(`[PARSE-DOCUMENT] Unsupported file type: ${fileExtension}`);
          extractedText = `[ملف غير مدعوم: ${fileName}]`;
        }

        if (extractedText.trim()) {
          extractedTexts.push(`=== محتوى ملف: ${fileName} ===\n${extractedText.trim()}`);
        }
      } catch (extractError) {
        console.error(`[PARSE-DOCUMENT] Error extracting text from ${fileName}:`, extractError);
        extractedTexts.push(`[خطأ في قراءة ملف: ${fileName}]`);
      }
    }

    const combinedText = extractedTexts.join('\n\n');
    console.log(`[PARSE-DOCUMENT] Extracted ${extractedTexts.length} documents, total length: ${combinedText.length} chars`);

    return new Response(JSON.stringify({ 
      success: true, 
      extractedText: combinedText,
      filesProcessed: extractedTexts.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    // تسجيل الخطأ التفصيلي للتشخيص (جانب الخادم فقط)
    console.error("[PARSE-DOCUMENT] Error:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    // إرجاع رسالة عامة للمستخدم
    return new Response(JSON.stringify({ error: "حدث خطأ في معالجة الملف. يرجى المحاولة مرة أخرى." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// OCR محسّن مع إعادة المحاولة
async function enhancedOCR(
  base64Data: string, 
  mimeType: string, 
  pageNum: number | null = null,
  retryCount: number = 0
): Promise<string> {
  const maxRetries = 2;
  const pageInfo = pageNum ? `صفحة ${pageNum} من ` : "";
  
  // استخدام نموذج أقوى للـ OCR
  const model = retryCount > 0 ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";
  
  const systemPrompt = `أنت خبير في استخراج النصوص من المستندات الممسوحة ضوئياً (OCR).
مهمتك: استخراج كل النص من ${pageInfo}المستند بدقة عالية.

قواعد مهمة:
1. استخرج النص كما هو بالضبط بدون تعديل أو تفسير
2. حافظ على تنسيق الفقرات والأسطر
3. إذا كان النص بالعربية، حافظ على اتجاه RTL
4. استخرج الأرقام والتواريخ بدقة
5. إذا كان هناك جداول، حاول الحفاظ على هيكلها
6. لا تضف أي تعليقات أو ملاحظات - فقط النص المستخرج`;

  try {
    const response = await createAiChatCompletion({
      modelEnvVar: "DOCUMENT_OCR_MODEL",
      requestBody: {
        model: model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "استخرج كل النص الموجود في هذه الصورة/المستند:"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ]
          }
        ],
        max_tokens: 8000,
        temperature: 0.1, // دقة أعلى
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OCR] API error (${response.status}):`, errorText);
      
      // إعادة المحاولة بنموذج أقوى
      if (retryCount < maxRetries) {
        console.log(`[OCR] Retrying with enhanced model (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // انتظار ثانية
        return enhancedOCR(base64Data, mimeType, pageNum, retryCount + 1);
      }
      return "";
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || "";
    
    // التحقق من جودة النص المستخرج
    if (extractedText.trim().length < 10 && retryCount < maxRetries) {
      console.log(`[OCR] Low quality result, retrying with pro model`);
      return enhancedOCR(base64Data, mimeType, pageNum, retryCount + 1);
    }
    
    return extractedText.trim();
  } catch (error) {
    console.error("[OCR] Error:", error);
    if (retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return enhancedOCR(base64Data, mimeType, pageNum, retryCount + 1);
    }
    return "";
  }
}

// استخراج النص من PDF (فعلياً) باستخدام pdfjs + OCR محسّن للملفات الممسوحة
async function extractTextFromPDF(fileData: Blob): Promise<string> {
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const pdfjsLib = await import("https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs");

    // تعطيل الـ Worker لتجنب مشاكل pdfjs داخل بيئة Edge Runtime
    // @ts-ignore
    if (pdfjsLib?.GlobalWorkerOptions) {
      // نضع قيمة افتراضية (حتى لو كان disableWorker=true) لتجنب أخطاء workerSrc
      // @ts-ignore
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.worker.mjs";
    }

    // @ts-ignore
    const loadingTask = pdfjsLib.getDocument({ data: bytes, disableWorker: true });
    // @ts-ignore
    const pdf = await loadingTask.promise;

    let fullText = "";
    const totalPages = pdf.numPages;
    console.log(`[PARSE-DOCUMENT] PDF has ${totalPages} pages`);

    // أولاً: محاولة استخراج النص العادي
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      // @ts-ignore
      const page = await pdf.getPage(pageNum);
      // @ts-ignore
      const textContent = await page.getTextContent();
      const strings = (textContent.items || [])
        // @ts-ignore
        .map((it) => (typeof it.str === "string" ? it.str : ""))
        .filter(Boolean);

      if (strings.length) {
        fullText += `\n[صفحة ${pageNum}]\n` + strings.join(" ") + "\n";
      }
    }

    const cleaned = fullText.replace(/\s+/g, " ").trim();

    // إذا وجدنا نص كافٍ (أكثر من 50 حرف)، نرجعه
    if (cleaned.length > 50) {
      console.log(`[PARSE-DOCUMENT] Extracted ${cleaned.length} chars from PDF text layer`);
      return cleaned;
    }

    // ثانياً: إذا لم نجد نص، نستخدم OCR المحسّن
    console.log(`[PARSE-DOCUMENT] PDF appears to be scanned, using enhanced OCR...`);
    
    if (!Deno.env.get("AI_API_KEY") && !Deno.env.get("OPENAI_API_KEY") && !Deno.env.get("OPENROUTER_API_KEY") && !Deno.env.get("GOOGLE_GEMINI_API_KEY")) {
      return "[ملف PDF ممسوح ضوئياً - OCR غير متوفر. يرجى التأكد من إعداد مفتاح API]";
    }

    let ocrText = "";
    // زيادة عدد الصفحات للـ OCR (أول 15 صفحة)
    const maxOcrPages = Math.min(totalPages, 15);

    for (let pageNum = 1; pageNum <= maxOcrPages; pageNum++) {
      try {
        console.log(`[PARSE-DOCUMENT] OCR processing page ${pageNum}/${maxOcrPages}`);
        
        // @ts-ignore
        const page = await pdf.getPage(pageNum);
        // استخدام دقة أعلى للـ OCR
        const viewport = page.getViewport({ scale: 2.5 }); 
        
        // إنشاء canvas افتراضي
        const { createCanvas } = await import("https://deno.land/x/canvas@v1.4.2/mod.ts");
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext("2d");

        // رسم الصفحة على Canvas
        // @ts-ignore
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        // تحويل Canvas إلى صورة base64
        const imageDataUrl = canvas.toDataURL("image/png");
        const base64Data = imageDataUrl.replace("data:image/png;base64,", "");

        // استخدام OCR المحسّن
        const pageText = await enhancedOCR(base64Data, "image/png", pageNum);
        
        if (pageText) {
          ocrText += `\n[صفحة ${pageNum}]\n${pageText}\n`;
        }
      } catch (pageError) {
        console.error(`[PARSE-DOCUMENT] Error processing page ${pageNum}:`, pageError);
      }
    }

    if (ocrText.trim()) {
      console.log(`[PARSE-DOCUMENT] OCR extracted ${ocrText.length} chars from ${maxOcrPages} pages`);
      if (totalPages > maxOcrPages) {
        ocrText += `\n[ملاحظة: تم تحليل أول ${maxOcrPages} صفحات فقط من إجمالي ${totalPages} صفحة]`;
      }
      return ocrText.trim();
    }

    return "[لم يتم استخراج نص من ملف PDF - قد يكون الملف محمياً أو فارغاً. جرب رفع صور الصفحات منفردة]";
  } catch (error) {
    console.error("[PARSE-DOCUMENT] PDF extraction error:", error);
    // لا نفترض أن الملف "تالف" لأن السبب غالباً يكون تقني/تنسيقي
    return "[تعذر قراءة ملف PDF حالياً. إذا كان الملف ممسوحاً ضوئياً جرّب رفع صورة واضحة أو جرّب إعادة حفظ الـPDF (Print to PDF)]";
  }
}

// استخراج النص من DOCX (فعلياً) باستخدام mammoth
async function extractTextFromDOCX(fileData: Blob): Promise<string> {
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    console.log(`[PARSE-DOCUMENT] DOCX file size: ${arrayBuffer.byteLength} bytes`);

    // mammoth يعمل على DOCX فقط (doc القديم قد لا يُدعم)
    const mammoth = await import("https://esm.sh/mammoth@1.8.0?target=deno");

    // @ts-ignore
    const result = await mammoth.extractRawText({ arrayBuffer });
    console.log(`[PARSE-DOCUMENT] Mammoth result:`, result);
    
    const text = String(result?.value ?? "").replace(/\s+/g, " ").trim();
    console.log(`[PARSE-DOCUMENT] Extracted DOCX text length: ${text.length}`);

    if (!text) {
      // محاولة استخدام OCR إذا كان الملف يحتوي على صور فقط
      console.log("[PARSE-DOCUMENT] No text extracted from DOCX, trying alternative method");
      return "[لم يتم استخراج نص من ملف Word - قد يكون الملف بصيغة DOC القديمة. جرب تحويله إلى DOCX أو PDF]";
    }

    return text;
  } catch (error) {
    console.error("[PARSE-DOCUMENT] DOCX extraction error:", error);
    // إرجاع رسالة خطأ أكثر تفصيلاً
    const errorMsg = error instanceof Error ? error.message : String(error);
    return `[خطأ في استخراج النص من Word: ${errorMsg}. جرب حفظ الملف بصيغة DOCX أو PDF]`;
  }
}

// استخراج النص من الصور باستخدام OCR المحسّن
async function extractTextFromImage(fileData: Blob, extension: string): Promise<string> {
  try {
    if (!Deno.env.get("AI_API_KEY") && !Deno.env.get("OPENAI_API_KEY") && !Deno.env.get("OPENROUTER_API_KEY") && !Deno.env.get("GOOGLE_GEMINI_API_KEY")) {
      return "[OCR غير متوفر - مفتاح API غير موجود]";
    }

    // تحويل الصورة إلى base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = extension === 'png' ? 'image/png' : 
                     extension === 'gif' ? 'image/gif' :
                     extension === 'webp' ? 'image/webp' : 'image/jpeg';

    // استخدام OCR المحسّن
    const extractedText = await enhancedOCR(base64, mimeType, null);
    
    return extractedText || "[لم يتم العثور على نص في الصورة - تأكد من وضوح الصورة]";
  } catch (error) {
    console.error("[PARSE-DOCUMENT] Image OCR error:", error);
    return "[خطأ في معالجة الصورة - جرب رفع صورة أوضح]";
  }
}
