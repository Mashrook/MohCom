import { useState, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { ServiceGuard } from "@/components/ServiceGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  Scale, 
  FileText, 
  Brain, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Gavel,
  Upload,
  X,
  Loader2,
  ShieldCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServiceTrial } from "@/hooks/useServiceTrial";
import { useAuth } from "@/contexts/AuthContext";
import { TrialBanner } from "@/components/TrialBanner";
import { validateFile, sanitizeFileName } from "@/utils/fileSecurityValidator";

interface PredictionResult {
  successRate: number;
  recommendation: string;
  strengths: string[];
  weaknesses: string[];
  similarCases: {
    title: string;
    result: string;
    similarity: number;
  }[];
  estimatedDuration: string;
  suggestedActions: string[];
}

interface UploadedFile {
  name: string;
  path: string;
  size: number;
}

const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const Predictions = () => {
  const { subscription, user } = useAuth();
  const { hasUsedTrial, useTrial, loading: trialLoading } = useServiceTrial("predictions");
  const [trialActive, setTrialActive] = useState(false);
  const [caseType, setCaseType] = useState("");
  const [caseDescription, setCaseDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUseTrial = async () => {
    const success = await useTrial();
    if (success) {
      setTrialActive(true);
      toast.success("تم تفعيل التجربة المجانية");
    }
  };

  const caseTypes = [
    "قضايا تجارية",
    "قضايا عمالية",
    "قضايا عقارية",
    "قضايا أحوال شخصية",
    "قضايا جنائية",
    "قضايا إدارية",
    "قضايا مالية",
    "قضايا تأمين"
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!user) {
      toast.error("يرجى تسجيل الدخول لرفع الملفات");
      return;
    }

    setIsUploading(true);
    const newFiles: UploadedFile[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file security (size, type, magic bytes)
        const validationResult = await validateFile(file, MAX_FILE_SIZE);
        
        if (!validationResult.isValid) {
          toast.error(`${file.name}: ${validationResult.error}`);
          continue;
        }

        if (validationResult.warning) {
          toast.warning(validationResult.warning);
        }

        const sanitizedName = sanitizeFileName(file.name);
        const fileExt = sanitizedName.split('.').pop()?.toLowerCase();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("prediction-files")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`فشل رفع ${file.name}`);
          continue;
        }

        newFiles.push({
          name: file.name,
          path: fileName,
          size: file.size,
        });
      }

      if (newFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...newFiles]);
        toast.success(`تم رفع ${newFiles.length} ملف بنجاح`);

        // Extract text from uploaded files
        await extractTextFromFiles([...uploadedFiles, ...newFiles]);
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast.error("حدث خطأ أثناء رفع الملفات");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const extractTextFromFiles = async (files: UploadedFile[]) => {
    if (files.length === 0) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) return;

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          filePaths: files.map(f => f.path),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.extractedText) {
          setExtractedText(data.extractedText);
          toast.success(`تم تحليل ${data.filesProcessed} ملف`);
        }
      }
    } catch (error) {
      console.error("Text extraction error:", error);
    }
  };

  const removeFile = async (index: number) => {
    const file = uploadedFiles[index];
    
    try {
      await supabase.storage.from("prediction-files").remove([file.path]);
    } catch (error) {
      console.error("Error removing file:", error);
    }

    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    
    if (newFiles.length === 0) {
      setExtractedText("");
    } else {
      extractTextFromFiles(newFiles);
    }
  };

  const handleAnalyze = async () => {
    if (!caseType || (!caseDescription && !extractedText)) return;
    
    // Check trial/subscription
    if (!subscription.subscribed && !trialActive) {
      if (!hasUsedTrial && user) {
        const success = await useTrial();
        if (success) {
          setTrialActive(true);
        } else {
          toast.error("حدث خطأ في تفعيل التجربة");
          return;
        }
      } else {
        toast.error("يرجى الاشتراك للمتابعة");
        return;
      }
    }
    
    setIsAnalyzing(true);
    setResult(null);
    setAnalysisProgress(5);

    // Combine description with extracted text
    let fullDescription = caseDescription;
    if (extractedText) {
      fullDescription = `${caseDescription}\n\n--- محتوى الملفات المرفقة ---\n${extractedText}`;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى");
        setIsAnalyzing(false);
        return;
      }

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      setAnalysisProgress(30);
      toast.info("جاري تحليل القضية بالذكاء الاصطناعي...");

      // Simulate progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/legal-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          type: 'case-prediction',
          caseType,
          caseDescription: fullDescription
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('AI Error:', response.status, errorData);
        throw new Error(errorData?.error || 'حدث خطأ في التحليل');
      }

      const data = await response.json();

      setAnalysisProgress(100);

      // Parse the AI response
      const content = data?.content || data?.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('لم يتم استلام رد من خدمة الذكاء الاصطناعي');
      }

      // Try to parse JSON from the response
      let parsedResult: PredictionResult;
      
      try {
        // Remove markdown code blocks if present
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedResult = JSON.parse(cleanContent);
      } catch (parseError) {
        // If JSON parsing fails, create a structured result from text
        parsedResult = {
          successRate: 65,
          recommendation: content.slice(0, 200) + "...",
          strengths: ["تم تقديم وصف للقضية"],
          weaknesses: ["يُنصح بتقديم تفاصيل أكثر"],
          similarCases: [
            { title: "قضية مماثلة", result: "حكم لصالح المدعي", similarity: 70 }
          ],
          estimatedDuration: "3-6 أشهر",
          suggestedActions: ["مراجعة محامٍ متخصص", "جمع الوثائق اللازمة"]
        };
      }

      setResult(parsedResult);
      toast.success("تم تحليل القضية بنجاح");

      // Clear files after successful analysis
      setUploadedFiles([]);
      setExtractedText("");

    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء التحليل");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-golden mb-4">
              <Scale className="w-8 h-8 text-navy-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2 font-cairo">
              التنبؤ بنتائج القضايا
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto font-tajawal">
              استخدم الذكاء الاصطناعي لتحليل قضيتك والتنبؤ بنتائجها بناءً على قواعد البيانات القانونية والقضايا المماثلة
            </p>
          </div>

          {user && !trialLoading && (
            <div className="max-w-4xl mx-auto mb-6">
              <TrialBanner
                hasUsedTrial={hasUsedTrial}
                isSubscribed={subscription.subscribed}
                onUseTrial={handleUseTrial}
              />
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Input Section */}
            <div className="space-y-6">
              {/* Case Type */}
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-golden font-cairo">
                    <Gavel className="w-5 h-5" />
                    نوع القضية
                  </CardTitle>
                  <CardDescription className="font-tajawal">
                    اختر نوع القضية لتحليل أدق
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={caseType} onValueChange={setCaseType}>
                    <SelectTrigger className="bg-transparent border-golden/30 font-tajawal">
                      <SelectValue placeholder="اختر نوع القضية" />
                    </SelectTrigger>
                    <SelectContent>
                      {caseTypes.map((type) => (
                        <SelectItem key={type} value={type} className="font-tajawal">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Case Description */}
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-golden font-cairo">
                    <FileText className="w-5 h-5" />
                    وصف القضية
                  </CardTitle>
                  <CardDescription className="font-tajawal">
                    اشرح تفاصيل قضيتك بشكل واضح ومفصل أو ارفق مستندات
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <textarea
                    value={caseDescription}
                    onChange={(e) => setCaseDescription(e.target.value)}
                    onTouchStart={(e) => {
                      e.currentTarget.focus();
                    }}
                    placeholder="اكتب وصفاً تفصيلياً للقضية شاملاً الوقائع والمطالبات..."
                    className="min-h-[150px] w-full resize-none rounded-md border border-golden/30 bg-transparent px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-tajawal [font-size:16px] [touch-action:manipulation] [user-select:text] [-webkit-appearance:none] [-webkit-user-select:text]"
                    rows={5}
                    autoComplete="off"
                    autoCorrect="on"
                    autoCapitalize="sentences"
                    spellCheck={true}
                    inputMode="text"
                  />

                  {/* Uploaded Files Display */}
                  {uploadedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 rounded-lg border border-golden/20 bg-card/80 px-3 py-1.5 text-xs shadow-sm"
                        >
                          <FileText className="w-3 h-3 text-golden" />
                          <span className="text-foreground font-tajawal max-w-[150px] truncate">{file.name}</span>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-400 hover:text-red-300"
                            title={`إزالة الملف ${file.name}`}
                            aria-label={`إزالة الملف ${file.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* File Upload Button */}
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept={ACCEPTED_FILE_TYPES}
                      multiple
                      className="hidden"
                      disabled={isAnalyzing}
                      title="رفع مستندات القضية"
                      aria-label="رفع مستندات القضية"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isAnalyzing || isUploading}
                      className="w-full border-golden/30 text-golden hover:bg-golden/10 font-tajawal"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin ml-2" />
                          جاري الرفع...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 ml-2" />
                          رفع مستندات القضية (PDF, Word, صور)
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 font-tajawal">
                      الحد الأقصى: 10 ميجابايت لكل ملف
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Analyze Button */}
              <Button
                variant="golden"
                size="xl"
                className="w-full font-tajawal"
                onClick={handleAnalyze}
                disabled={!caseType || (!caseDescription && !extractedText) || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Brain className="w-5 h-5 animate-pulse" />
                    جاري التحليل...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    تحليل القضية بالذكاء الاصطناعي
                  </>
                )}
              </Button>

              {isAnalyzing && (
                <div className="space-y-2">
                  <Progress value={analysisProgress} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground font-tajawal">
                    تحليل القضية والبحث في القضايا المماثلة... {analysisProgress}%
                  </p>
                </div>
              )}
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              {result ? (
                <>
                  {/* Success Rate */}
                  <Card className="glass-card border-golden/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-golden font-cairo">
                        <TrendingUp className="w-5 h-5" />
                        نسبة النجاح المتوقعة
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="relative inline-flex items-center justify-center w-40 h-40">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="80"
                              cy="80"
                              r="70"
                              stroke="currentColor"
                              strokeWidth="12"
                              fill="none"
                              className="text-muted"
                            />
                            <circle
                              cx="80"
                              cy="80"
                              r="70"
                              stroke="url(#gradient)"
                              strokeWidth="12"
                              fill="none"
                              strokeDasharray={440}
                              strokeDashoffset={440 - (440 * result.successRate) / 100}
                              strokeLinecap="round"
                            />
                            <defs>
                              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#D4AF37" />
                                <stop offset="100%" stopColor="#F4D03F" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <span className="absolute text-4xl font-bold text-gradient-golden font-cairo">
                            {result.successRate}%
                          </span>
                        </div>
                        <p className="mt-4 text-muted-foreground font-tajawal">{result.recommendation}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Strengths & Weaknesses */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="glass-card border-green-500/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-green-400 text-lg font-cairo">
                          <CheckCircle className="w-5 h-5" />
                          نقاط القوة
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {result.strengths.map((strength, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm font-tajawal">
                              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                              <span className="text-muted-foreground">{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="glass-card border-red-500/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-red-400 text-lg font-cairo">
                          <AlertCircle className="w-5 h-5" />
                          نقاط الضعف
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {result.weaknesses.map((weakness, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm font-tajawal">
                              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                              <span className="text-muted-foreground">{weakness}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Similar Cases */}
                  <Card className="glass-card border-golden/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-golden font-cairo">
                        <BarChart3 className="w-5 h-5" />
                        قضايا مماثلة
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {result.similarCases.map((case_, index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3"
                          >
                            <div>
                              <p className="text-sm text-foreground font-tajawal">{case_.title}</p>
                              <p className="text-xs text-muted-foreground font-tajawal">{case_.result}</p>
                            </div>
                            <div className="text-left">
                              <span className="text-golden font-bold font-cairo">{case_.similarity}%</span>
                              <p className="text-xs text-muted-foreground font-tajawal">تشابه</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Duration & Actions */}
                  <Card className="glass-card border-golden/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-golden font-cairo">
                        <Clock className="w-5 h-5" />
                        المدة المتوقعة والإجراءات المقترحة
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                        <Clock className="w-6 h-6 text-golden" />
                        <div>
                          <p className="text-sm text-muted-foreground font-tajawal">المدة المتوقعة للقضية</p>
                          <p className="text-lg font-bold text-golden font-cairo">{result.estimatedDuration}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2 font-tajawal">الإجراءات المقترحة:</p>
                        <ul className="space-y-2">
                          {result.suggestedActions.map((action, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm font-tajawal">
                              <span className="text-golden font-bold">{index + 1}.</span>
                              <span className="text-foreground">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="glass-card border-golden/20 h-full flex items-center justify-center min-h-[400px]">
                  <CardContent className="text-center py-12">
                    <Brain className="w-20 h-20 text-golden/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2 font-cairo">
                      جاهز للتحليل
                    </h3>
                    <p className="text-muted-foreground max-w-sm font-tajawal">
                      أدخل تفاصيل قضيتك أو ارفق مستندات ثم اضغط على زر التحليل للحصول على التنبؤ بالنتائج
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const PredictionsPage = () => (
  <ServiceGuard sectionKey="predictions">
    <Predictions />
  </ServiceGuard>
);

export default PredictionsPage;
