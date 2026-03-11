import { useState, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { ServiceGuard } from "@/components/ServiceGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquareWarning, 
  Upload, 
  FileText, 
  Brain, 
  Target,
  AlertTriangle,
  CheckCircle,
  Building2,
  Send,
  X,
  Lightbulb,
  Scale,
  FileCheck,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServiceTrial } from "@/hooks/useServiceTrial";
import { useAuth } from "@/contexts/AuthContext";
import { TrialBanner } from "@/components/TrialBanner";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  file: File;
}

interface AnalysisResult {
  category: string;
  severity: "low" | "medium" | "high";
  targetEntity: string;
  legalBasis: string[];
  requiredDocuments: string[];
  suggestedSteps: string[];
  estimatedResponse: string;
  successProbability: number;
  draftComplaint: string;
}

const Complaints = () => {
  const { subscription, user } = useAuth();
  const { hasUsedTrial, useTrial, loading: trialLoading } = useServiceTrial("complaints");
  const [trialActive, setTrialActive] = useState(false);
  const [complaintType, setComplaintType] = useState("");
  const [complaintDescription, setComplaintDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [ocrStatus, setOcrStatus] = useState<{
    isProcessing: boolean;
    currentStep: string;
    estimatedTime: number;
    elapsedTime: number;
  }>({ isProcessing: false, currentStep: '', estimatedTime: 0, elapsedTime: 0 });
  const ocrTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [showExtractedPreview, setShowExtractedPreview] = useState(false);

  const handleUseTrial = async () => {
    const success = await useTrial();
    if (success) {
      setTrialActive(true);
      toast.success("تم تفعيل التجربة المجانية");
    }
  };

  const complaintTypes = [
    "شكوى تجارية",
    "شكوى عمالية",
    "شكوى استهلاكية",
    "شكوى إدارية",
    "شكوى مالية / بنكية",
    "شكوى تأمينية",
    "شكوى عقارية",
    "شكوى اتصالات",
    "شكوى صحية",
    "شكوى تعليمية"
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles: UploadedFile[] = Array.from(files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        file: file
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
    setExtractedText("");
    setShowExtractedPreview(false);
  };

  const handleExtractText = async () => {
    if (uploadedFiles.length === 0) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token || !session.user) {
      toast.error("جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى");
      return;
    }

    const text = await processFilesWithOCR(session);
    if (text) {
      setExtractedText(text);
      setShowExtractedPreview(true);
      toast.success("تم استخراج النص بنجاح");
    } else {
      toast.error("لم يتم استخراج أي نص من الملفات");
    }
  };

  const processFilesWithOCR = async (session: { access_token: string; user: { id: string } }) => {
    if (uploadedFiles.length === 0) return "";

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const uploadedPaths: string[] = [];

    // رفع الملفات
    for (const fileObj of uploadedFiles) {
      const fileExtension = fileObj.name.split('.').pop()?.toLowerCase() || '';
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      const storagePath = `${session.user.id}/${uniqueFileName}`;

      const { error } = await supabase.storage
        .from('prediction-files')
        .upload(storagePath, fileObj.file);

      if (!error) {
        uploadedPaths.push(storagePath);
      }
    }

    if (uploadedPaths.length === 0) return "";

    // حساب الوقت المقدر
    const hasScannedPdf = uploadedFiles.some(f => 
      f.name.toLowerCase().endsWith('.pdf')
    );
    const estimatedSeconds = hasScannedPdf ? 60 : 15;

    // بدء عداد OCR
    setOcrStatus({
      isProcessing: true,
      currentStep: 'جاري قراءة المستندات باستخدام OCR...',
      estimatedTime: estimatedSeconds,
      elapsedTime: 0
    });

    ocrTimerRef.current = setInterval(() => {
      setOcrStatus(prev => ({
        ...prev,
        elapsedTime: prev.elapsedTime + 1
      }));
    }, 1000);

    let extractedText = "";

    try {
      const parseResponse = await fetch(`${SUPABASE_URL}/functions/v1/parse-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ filePaths: uploadedPaths }),
      });

      if (parseResponse.ok) {
        const parseData = await parseResponse.json();
        if (parseData.extractedText) {
          extractedText = parseData.extractedText;
        }
      }
    } finally {
      if (ocrTimerRef.current) {
        clearInterval(ocrTimerRef.current);
        ocrTimerRef.current = null;
      }
      setOcrStatus({ isProcessing: false, currentStep: '', estimatedTime: 0, elapsedTime: 0 });

      // حذف الملفات المؤقتة
      for (const path of uploadedPaths) {
        await supabase.storage.from('prediction-files').remove([path]);
      }
    }

    return extractedText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleAnalyze = async () => {
    if (!complaintType || !complaintDescription) return;
    
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
    setAnalysisProgress(10);
    
    try {
      // التأكد من وجود جلسة صالحة
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || !session.user) {
        toast.error("جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى");
        setIsAnalyzing(false);
        return;
      }

      // استخدام النص المستخرج مسبقاً أو معالجة الملفات
      let extractedFileContent = extractedText;
      if (!extractedFileContent && uploadedFiles.length > 0) {
        extractedFileContent = await processFilesWithOCR(session);
      }
      setUploadedFiles([]);
      setExtractedText("");
      setShowExtractedPreview(false);

      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 10, 80));
      }, 400);

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // دمج محتوى الملفات مع الوصف
      let fullDescription = complaintDescription;
      if (extractedFileContent) {
        fullDescription = `${complaintDescription}\n\n--- محتوى المستندات المرفقة ---\n${extractedFileContent}`;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/legal-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          type: 'complaint-analysis',
          complaintType,
          complaintDescription: fullDescription
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('AI Error:', response.status, errorData);
        throw new Error(errorData?.error || 'حدث خطأ في التحليل');
      }

      const data = await response.json();
      const error = null;

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (error) {
        console.error('AI Error:', error);
        toast.error('حدث خطأ في التحليل، يرجى المحاولة مرة أخرى');
        return;
      }

      console.log('AI Response:', data);
      setResult(data as AnalysisResult);
      toast.success('تم تحليل الشكوى بنجاح');
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low": return "text-green-400";
      case "medium": return "text-yellow-400";
      case "high": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "low": return "منخفضة";
      case "medium": return "متوسطة";
      case "high": return "عالية";
      default: return "";
    }
  };

  return (
    <Layout>
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-golden mb-6">
              <MessageSquareWarning className="w-10 h-10 text-navy-900" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              نظام الشكاوى <span className="text-gradient-golden">الذكي</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              حلل شكواك بالذكاء الاصطناعي واحصل على إرشادات قانونية ومسودة شكوى جاهزة
            </p>
          </div>

          {/* Trial Banner */}
          {user && !trialLoading && (
            <div className="max-w-4xl mx-auto mb-8">
              <TrialBanner 
                hasUsedTrial={hasUsedTrial} 
                isSubscribed={subscription.subscribed}
                onUseTrial={handleUseTrial}
              />
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              {/* Complaint Type */}
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-golden">
                    <Target className="w-5 h-5" />
                    نوع الشكوى
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={complaintType} onValueChange={setComplaintType}>
                    <SelectTrigger className="bg-background border-golden/30 text-foreground">
                      <SelectValue placeholder="اختر نوع الشكوى" />
                    </SelectTrigger>
                    <SelectContent>
                      {complaintTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Complaint Description */}
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-golden">
                    <FileText className="w-5 h-5" />
                    تفاصيل الشكوى
                  </CardTitle>
                  <CardDescription>
                    اشرح المشكلة بالتفصيل مع ذكر التواريخ والأحداث
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={complaintDescription}
                    onChange={(e) => setComplaintDescription(e.target.value)}
                    onTouchStart={(e) => {
                      e.currentTarget.focus();
                    }}
                    placeholder="اكتب تفاصيل شكواك هنا... مثال: في تاريخ كذا قمت بـ... ولم تقم الجهة بـ..."
                    className="min-h-[150px] w-full bg-transparent border border-golden/30 rounded-md px-3 py-2 text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    rows={5}
                    autoComplete="off"
                    autoCorrect="on"
                    autoCapitalize="sentences"
                    spellCheck={true}
                    inputMode="text"
                    style={{ 
                      fontSize: "16px",
                      WebkitAppearance: "none",
                      WebkitUserSelect: "text",
                      userSelect: "text",
                      touchAction: "manipulation"
                    }}
                  />
                </CardContent>
              </Card>

              {/* File Upload */}
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-golden">
                    <Upload className="w-5 h-5" />
                    المستندات الداعمة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Label
                      htmlFor="complaint-files"
                      className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-golden/30 rounded-lg cursor-pointer hover:border-golden/50 transition-colors bg-navy-800/30"
                    >
                      <Upload className="w-6 h-6 text-golden mb-1" />
                      <span className="text-sm text-muted-foreground">ارفع المستندات</span>
                      <input
                        id="complaint-files"
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                    </Label>

                    {uploadedFiles.length > 0 && !ocrStatus.isProcessing && (
                      <div className="space-y-2">
                        {uploadedFiles.map(file => (
                          <div 
                            key={file.id}
                            className="flex items-center justify-between p-2 bg-navy-800/50 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-golden" />
                              <span className="text-sm text-foreground truncate max-w-[200px]">{file.name}</span>
                              <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeFile(file.id)} className="h-6 w-6">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Extract Text Button */}
                    {uploadedFiles.length > 0 && !ocrStatus.isProcessing && !showExtractedPreview && (
                      <Button
                        variant="outline"
                        className="w-full border-golden/30 text-golden hover:bg-golden/10"
                        onClick={handleExtractText}
                      >
                        <FileCheck className="w-4 h-4 ml-2" />
                        استخراج النص من الملفات
                      </Button>
                    )}

                    {/* OCR Processing Status */}
                    {ocrStatus.isProcessing && (
                      <div className="p-4 rounded-lg bg-navy-800/80 border border-golden/30">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="relative">
                            <Loader2 className="w-6 h-6 text-golden animate-spin" />
                            <div className="absolute inset-0 w-6 h-6 rounded-full border-2 border-golden/20" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {ocrStatus.currentStep}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              الوقت المقدر: {Math.max(0, ocrStatus.estimatedTime - ocrStatus.elapsedTime)} ثانية متبقية
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Progress 
                            value={Math.min((ocrStatus.elapsedTime / ocrStatus.estimatedTime) * 100, 95)} 
                            className="h-2" 
                          />
                          <p className="text-xs text-muted-foreground text-center">
                            مضى {ocrStatus.elapsedTime} ثانية من أصل {ocrStatus.estimatedTime} ثانية تقريباً
                          </p>
                        </div>
                        <p className="text-xs text-golden/80 mt-2 text-center">
                          ⚡ يتم تحليل المستندات الممسوحة ضوئياً باستخدام تقنية OCR المتقدمة
                        </p>
                      </div>
                    )}

                    {/* Extracted Text Preview */}
                    {showExtractedPreview && extractedText && (
                      <div className="p-4 rounded-lg bg-navy-800/80 border border-golden/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-golden">
                            <FileCheck className="w-5 h-5" />
                            <span className="text-sm font-medium">النص المستخرج من الملفات</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setShowExtractedPreview(false);
                              setExtractedText("");
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <Textarea
                          value={extractedText}
                          onChange={(e) => setExtractedText(e.target.value)}
                          className="min-h-[150px] bg-background/50 border-golden/20 text-foreground text-sm"
                          placeholder="النص المستخرج..."
                        />
                        <p className="text-xs text-muted-foreground">
                          يمكنك تعديل النص المستخرج قبل إرساله للتحليل
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Analyze Button */}
              <Button
                variant="golden"
                size="xl"
                className="w-full"
                onClick={handleAnalyze}
                disabled={!complaintType || !complaintDescription || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Brain className="w-5 h-5 animate-pulse" />
                    جاري التحليل...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    تحليل الشكوى بالذكاء الاصطناعي
                  </>
                )}
              </Button>

              {isAnalyzing && (
                <div className="space-y-2">
                  <Progress value={analysisProgress} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground">
                    تحليل الشكوى والبحث عن الأنظمة ذات الصلة... {analysisProgress}%
                  </p>
                </div>
              )}
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              {result ? (
                <>
                  {/* Analysis Summary */}
                  <Card className="glass-card border-golden/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-golden">
                        <Target className="w-5 h-5" />
                        ملخص التحليل
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-navy-800/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">التصنيف</p>
                          <p className="text-sm font-bold text-golden">{result.category}</p>
                        </div>
                        <div className="p-3 bg-navy-800/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">درجة الأهمية</p>
                          <p className={`text-sm font-bold ${getSeverityColor(result.severity)}`}>
                            {getSeverityLabel(result.severity)}
                          </p>
                        </div>
                        <div className="p-3 bg-navy-800/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">احتمالية النجاح</p>
                          <p className="text-sm font-bold text-golden">{result.successProbability}%</p>
                        </div>
                        <div className="p-3 bg-navy-800/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">مدة الرد المتوقعة</p>
                          <p className="text-sm font-bold text-foreground">{result.estimatedResponse}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Legal Basis */}
                  <Card className="glass-card border-golden/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-golden">
                        <Scale className="w-5 h-5" />
                        السند النظامي
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.legalBasis.map((basis, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-golden mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{basis}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Required Documents */}
                  <Card className="glass-card border-golden/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-golden">
                        <FileCheck className="w-5 h-5" />
                        المستندات المطلوبة
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.requiredDocuments.map((doc, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{doc}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Suggested Steps */}
                  <Card className="glass-card border-golden/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-golden">
                        <Lightbulb className="w-5 h-5" />
                        الخطوات المقترحة
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="space-y-2">
                        {result.suggestedSteps.map((step, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-golden/20 text-golden text-xs shrink-0">
                              {index + 1}
                            </span>
                            <span className="text-foreground">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>

                  {/* Draft Complaint */}
                  <Card className="glass-card border-golden/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-golden">
                        <Send className="w-5 h-5" />
                        مسودة الشكوى
                      </CardTitle>
                      <CardDescription>نموذج جاهز للشكوى يمكنك تعديله</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={result.draftComplaint}
                        className="min-h-[250px] bg-navy-800/50 border-golden/30 text-sm"
                        readOnly
                      />
                      <Button variant="outline" className="w-full mt-4 border-golden/30 text-golden hover:bg-golden/10">
                        <FileText className="w-4 h-4 ml-2" />
                        نسخ المسودة
                      </Button>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="glass-card border-golden/20 h-full flex items-center justify-center min-h-[400px]">
                  <CardContent className="text-center py-12">
                    <MessageSquareWarning className="w-20 h-20 text-golden/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      نظام الشكاوى الذكي
                    </h3>
                    <p className="text-muted-foreground max-w-sm">
                      أدخل تفاصيل شكواك واحصل على تحليل قانوني شامل ومسودة شكوى جاهزة
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

const ComplaintsPage = () => (
  <ServiceGuard sectionKey="complaints">
    <Complaints />
  </ServiceGuard>
);

export default ComplaintsPage;
