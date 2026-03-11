import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { ServiceGuard } from "@/components/ServiceGuard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  FileText, 
  Download, 
  Eye, 
  Search, 
  PenTool,
  FileSearch,
  CheckCircle,
  Star,
  Upload,
  X,
  Brain,
  AlertTriangle,
  Shield,
  Scale,
  Lightbulb,
  Copy,
  Save,
  History,
  Trash2,
  Calendar,
  MessageSquare,
  Crown,
  Printer,
  FolderOpen,
  Share2
} from "lucide-react";
import ContractFillForm from "@/components/contracts/ContractFillForm";
import { UserTemplatesManager } from "@/components/contracts/UserTemplatesManager";
import SharedContractsManager from "@/components/contracts/SharedContractsManager";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const tabs = [
  { id: "browse", label: "تصفح العقود", icon: FileText },
  { id: "draft", label: "صياغة عقد", icon: PenTool },
  { id: "analyze", label: "تحليل عقد", icon: FileSearch },
  { id: "review", label: "مراجعة عقد", icon: CheckCircle },
  { id: "history", label: "التحليلات السابقة", icon: History },
  { id: "shared", label: "العقود المشاركة", icon: Share2 },
];

const contractCategories = [
  "الكل",
  "عقود العمل",
  "عقود الإيجار",
  "عقود البيع",
  "عقود الشراكة",
  "عقود الخدمات",
  "عقود الوكالات",
  "عقود التوريد",
  "عقود أخرى",
];

const sectorOptions = [
  { value: "الكل", label: "جميع القطاعات", icon: "📋" },
  { value: "عقاري", label: "عقاري", icon: "🏢" },
  { value: "تجاري", label: "تجاري", icon: "💼" },
  { value: "شخصي", label: "شخصي", icon: "👤" },
  { value: "عام", label: "عام", icon: "📄" },
];

const draftTemplates = [
  { id: 1, title: "عقد عمل", icon: "👔" },
  { id: 2, title: "عقد إيجار", icon: "🏠" },
  { id: 3, title: "عقد بيع", icon: "🤝" },
  { id: 4, title: "عقد شراكة", icon: "📊" },
  { id: 5, title: "عقد خدمات", icon: "⚙️" },
  { id: 6, title: "عقد مخصص", icon: "✨" },
];

interface ContractTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  sector: string;
  content: string;
  downloads_count: number;
  average_rating: number;
  ratings_count: number;
  is_premium: boolean;
}

interface AnalysisResult {
  summary: string;
  parties: string[];
  keyTerms: string[];
  obligations: { party: string; obligations: string[] }[];
  risks: string[];
  suggestions: string[];
  legalReferences: string[];
  overallRating: number;
}

interface SavedAnalysis {
  id: string;
  title: string;
  contract_text_encrypted: string | null;
  analysis_type: string;
  summary: string;
  risks: string[];
  suggestions: string[];
  legal_references: string[];
  overall_rating: number;
  created_at: string;
}

const Contracts = () => {
  const { user, subscription, isAdmin, isLawyer } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("browse");
  
  // Check if user has access to download/fill contracts
  const hasContractAccess = isAdmin || isLawyer || subscription.subscribed;
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [selectedSector, setSelectedSector] = useState("الكل");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Templates state
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isFillFormOpen, setIsFillFormOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userFeedback, setUserFeedback] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  
  // Analysis states
  const [contractText, setContractText] = useState("");
  const [analysisTitle, setAnalysisTitle] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentAnalysisType, setCurrentAnalysisType] = useState<'analyze' | 'review'>('analyze');
  const [uploadedFileName, setUploadedFileName] = useState("");
  
  // History states
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SavedAnalysis | null>(null);
  
  // User templates state
  const [showUserTemplates, setShowUserTemplates] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch templates from database
  const fetchTemplates = async (retryCount = 0) => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .order('downloads_count', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        // Retry up to 2 times on error
        if (retryCount < 2) {
          console.log(`Retrying fetch (attempt ${retryCount + 1})...`);
          setTimeout(() => fetchTemplates(retryCount + 1), 1000);
          return;
        }
        throw error;
      }
      
      console.log('Fetched templates:', data?.length || 0);
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('حدث خطأ في جلب القوالب، يرجى تحديث الصفحة');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === "الكل" || template.category === selectedCategory;
    const matchesSector = selectedSector === "الكل" || template.sector === selectedSector;
    const matchesSearch = template.title.includes(searchQuery) || template.description?.includes(searchQuery);
    return matchesCategory && matchesSector && matchesSearch;
  });

  // Fetch saved analyses
  const fetchSavedAnalyses = async () => {
    if (!user) return;
    
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('contract_analyses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedAnalyses(data || []);
    } catch (error) {
      console.error('Error fetching analyses:', error);
      toast.error('حدث خطأ في جلب التحليلات');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && user) {
      fetchSavedAnalyses();
    }
  }, [activeTab, user]);

  // Download template
  const handleDownload = async (template: ContractTemplate) => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لتحميل العقد');
      return;
    }

    // Only admins, lawyers, and subscribers can download
    if (!hasContractAccess) {
      toast.error('هذه الخدمة متاحة للمشتركين فقط');
      navigate('/pricing', { state: { requireSubscription: true } });
      return;
    }

    if (!subscription.subscribed && !isAdmin && !isLawyer && template.is_premium) {
      toast.error('هذا القالب متاح للمشتركين فقط');
      return;
    }

    try {
      // Track download
      await supabase.from('contract_downloads').insert({
        user_id: user.id,
        template_id: template.id
      });

      // Create downloadable file
      const blob = new Blob([template.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.title}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('تم تحميل العقد بنجاح');
      
      // Refresh templates to update download count
      fetchTemplates();
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('حدث خطأ في التحميل');
    }
  };

  // Submit rating
  const handleSubmitRating = async () => {
    if (!user || !selectedTemplate || userRating === 0) {
      toast.error('يرجى تحديد التقييم');
      return;
    }

    setIsSubmittingRating(true);
    try {
      const { error } = await supabase.from('contract_ratings').upsert({
        user_id: user.id,
        template_id: selectedTemplate.id,
        rating: userRating,
        feedback: userFeedback.trim() || null
      }, {
        onConflict: 'user_id,template_id'
      });

      if (error) throw error;

      toast.success('شكراً لتقييمك!');
      setIsRatingOpen(false);
      setUserRating(0);
      setUserFeedback("");
      fetchTemplates();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('حدث خطأ في إرسال التقييم');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setAnalysisTitle(file.name.replace(/\.[^/.]+$/, ""));
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setContractText(text);
      };
      reader.readAsText(file);
      toast.info("تم رفع الملف. يرجى التأكد من النص أو لصقه مباشرة.");
    }
  };

  const analyzeContract = async (type: "analyze" | "review") => {
    if (!contractText.trim()) {
      toast.error("يرجى إدخال نص العقد أو رفع ملف");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisProgress(10);
    setCurrentAnalysisType(type);

    try {
      // التأكد من وجود جلسة صالحة
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى");
        setIsAnalyzing(false);
        return;
      }

      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 10, 80));
      }, 500);

      const { data, error } = await supabase.functions.invoke('legal-ai', {
        body: {
          type: 'contract-analysis',
          messages: [
            {
              role: 'user',
              content: type === "analyze" 
                ? `قم بتحليل العقد التالي تحليلاً شاملاً وحدد الأطراف والبنود الرئيسية والالتزامات:\n\n${contractText}`
                : `راجع العقد التالي واكتشف الثغرات والمخاطر القانونية واقترح التحسينات:\n\n${contractText}`
            }
          ],
          contractText,
          analysisType: type
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (error) {
        console.error('AI Error:', error);
        toast.error('حدث خطأ في التحليل');
        return;
      }

      let fullResponse = "";
      
      if (typeof data === 'string') {
        fullResponse = data;
      } else if (data?.content) {
        fullResponse = data.content;
      } else {
        setAnalysisResult({
          summary: data?.summary || "تم تحليل العقد بنجاح",
          parties: data?.parties || ["الطرف الأول", "الطرف الثاني"],
          keyTerms: data?.keyTerms || [],
          obligations: data?.obligations || [],
          risks: data?.risks || [],
          suggestions: data?.suggestions || [],
          legalReferences: data?.legalReferences || [],
          overallRating: data?.overallRating || 75
        });
        toast.success('تم تحليل العقد بنجاح');
        return;
      }

      setAnalysisResult({
        summary: fullResponse,
        parties: ["تم تحديد الأطراف في التحليل أعلاه"],
        keyTerms: ["البنود الرئيسية موضحة في التحليل"],
        obligations: [],
        risks: type === "review" ? ["تم تحديد المخاطر في التحليل أعلاه"] : [],
        suggestions: type === "review" ? ["التوصيات موضحة في التحليل"] : [],
        legalReferences: ["الأنظمة ذات الصلة موضحة في التحليل"],
        overallRating: 75
      });
      
      toast.success('تم تحليل العقد بنجاح');
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveAnalysis = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لحفظ التحليل');
      return;
    }

    if (!analysisResult || !contractText) {
      toast.error('لا يوجد تحليل لحفظه');
      return;
    }

    const title = analysisTitle.trim() || `تحليل ${new Date().toLocaleDateString('ar-SA')}`;

    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('insert_encrypted_analysis', {
        p_title: title,
        p_contract_text: contractText,
        p_analysis_type: currentAnalysisType,
        p_summary: analysisResult.summary,
        p_risks: analysisResult.risks,
        p_suggestions: analysisResult.suggestions,
        p_legal_references: analysisResult.legalReferences,
        p_overall_rating: analysisResult.overallRating
      });

      if (error) throw error;
      
      toast.success('تم حفظ التحليل بنجاح');
      setAnalysisTitle('');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('حدث خطأ في حفظ التحليل');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAnalysis = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contract_analyses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSavedAnalyses(prev => prev.filter(a => a.id !== id));
      if (selectedAnalysis?.id === id) setSelectedAnalysis(null);
      toast.success('تم حذف التحليل');
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('حدث خطأ في حذف التحليل');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ");
  };

  const resetAnalysis = () => {
    setContractText("");
    setAnalysisResult(null);
    setUploadedFileName("");
    setAnalysisProgress(0);
    setAnalysisTitle("");
  };

  const renderStars = (rating: number, interactive = false, size = "w-4 h-4") => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              size,
              interactive && "cursor-pointer transition-colors",
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-muted-foreground"
            )}
            onClick={() => interactive && setUserRating(star)}
          />
        ))}
      </div>
    );
  };

  const renderAnalysisInput = (type: 'analyze' | 'review') => (
    <div className="space-y-6">
      <Card className="glass-card border-golden/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-golden">
            {type === 'analyze' ? <FileSearch className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            {type === 'analyze' ? 'نص العقد للتحليل' : 'العقد للمراجعة واكتشاف الثغرات'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={analysisTitle}
            onChange={(e) => setAnalysisTitle(e.target.value)}
            placeholder="عنوان التحليل (اختياري)"
            className="bg-navy-800/50 border-golden/30 text-foreground"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-golden/30 rounded-lg cursor-pointer hover:border-golden/50 transition-colors bg-navy-800/30"
          >
            <Upload className="w-6 h-6 text-golden mb-1" />
            <span className="text-sm text-muted-foreground">
              {uploadedFileName || "ارفع ملف العقد (PDF, DOCX, TXT)"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
            />
          </div>

          {uploadedFileName && (
            <div className="flex items-center justify-between p-2 bg-navy-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-golden" />
                <span className="text-sm">{uploadedFileName}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setUploadedFileName("");
                  setContractText("");
                }}
                className="h-6 w-6"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          <div className="text-center text-muted-foreground text-sm">أو</div>

          <Textarea
            value={contractText}
            onChange={(e) => setContractText(e.target.value)}
            placeholder={type === 'analyze' ? "الصق نص العقد هنا للتحليل..." : "الصق نص العقد هنا للمراجعة واكتشاف الثغرات..."}
            className="min-h-[200px] bg-navy-800/50 border-golden/30 text-foreground"
          />
        </CardContent>
      </Card>

      <Button
        variant="golden"
        size="xl"
        className="w-full"
        onClick={() => analyzeContract(type)}
        disabled={!contractText.trim() || isAnalyzing}
      >
        {isAnalyzing ? (
          <>
            <Brain className="w-5 h-5 animate-pulse" />
            جاري {type === 'analyze' ? 'التحليل' : 'المراجعة'}...
          </>
        ) : (
          <>
            {type === 'analyze' ? <Brain className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            {type === 'analyze' ? 'تحليل العقد بالذكاء الاصطناعي' : 'مراجعة العقد واكتشاف الثغرات'}
          </>
        )}
      </Button>

      {isAnalyzing && (
        <div className="space-y-2">
          <Progress value={analysisProgress} className="h-2" />
          <p className="text-sm text-center text-muted-foreground">
            {type === 'analyze' ? 'تحليل بنود العقد والتزامات الأطراف' : 'فحص العقد والبحث عن الثغرات'}... {analysisProgress}%
          </p>
        </div>
      )}
    </div>
  );

  const renderAnalysisResults = () => (
    <div className="space-y-6">
      {analysisResult ? (
        <>
          <Card className="glass-card border-golden/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-golden">
                <Scale className="w-5 h-5" />
                ملخص التحليل
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(analysisResult.summary)}>
                  <Copy className="w-4 h-4" />
                </Button>
                {user && (
                  <Button variant="golden-outline" size="sm" onClick={saveAnalysis} disabled={isSaving}>
                    <Save className="w-4 h-4 ml-1" />
                    {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {analysisResult.summary}
              </p>
            </CardContent>
          </Card>

          {analysisResult.risks.length > 0 && (
            <Card className="glass-card border-red-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  {currentAnalysisType === 'review' ? 'الثغرات والمخاطر المكتشفة' : 'المخاطر المحتملة'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysisResult.risks.map((risk, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {analysisResult.suggestions.length > 0 && (
            <Card className="glass-card border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-400">
                  <Lightbulb className="w-5 h-5" />
                  التوصيات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysisResult.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="glass-card border-golden/20">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              {currentAnalysisType === 'analyze' ? (
                <FileSearch className="w-10 h-10 text-primary" />
              ) : (
                <Shield className="w-10 h-10 text-primary" />
              )}
            </div>
            <h3 className="font-cairo font-semibold text-xl text-foreground mb-2">جاهز للتحليل</h3>
            <p className="text-muted-foreground">ارفع العقد أو الصق نصه للحصول على تحليل شامل</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              إدارة العقود
            </span>
            <h1 className="font-cairo font-bold text-3xl md:text-4xl text-foreground mb-4">
              مكتبة العقود <span className="text-gradient-golden">الذكية</span>
            </h1>
            <p className="text-muted-foreground">
              تصفح، صِغ، حلل، وراجع عقودك بمساعدة الذكاء الاصطناعي
            </p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {tabs.map((tab) => {
              // Tabs that require login (everything except browse)
              const requiresAuth = tab.id !== "browse";
              
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    // Redirect guests to auth for protected tabs
                    if (requiresAuth && !user) {
                      toast.info('يجب تسجيل الدخول للوصول لهذه الخدمة');
                      navigate('/auth', { state: { from: '/contracts', message: 'يرجى تسجيل الدخول أو إنشاء حساب للوصول لخدمات العقود المتقدمة' } });
                      return;
                    }
                    setActiveTab(tab.id);
                    if (tab.id !== "analyze" && tab.id !== "review" && tab.id !== "history") {
                      resetAnalysis();
                    }
                    setSelectedAnalysis(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 text-sm",
                    activeTab === tab.id
                      ? "bg-gradient-golden text-primary-foreground shadow-golden"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Browse Tab */}
          {activeTab === "browse" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث عن عقد..."
                      className="w-full bg-navy-900/80 border border-golden/30 rounded-xl pr-12 pl-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  {user && (
                    <Button
                      variant="golden-outline"
                      onClick={() => setShowUserTemplates(true)}
                      className="whitespace-nowrap"
                    >
                      <FolderOpen className="w-4 h-4 ml-2" />
                      قوالبي المخصصة
                    </Button>
                  )}
                </div>
                
                {/* Sector Filter */}
                <div className="flex gap-2 flex-wrap justify-center">
                  {sectorOptions.map((sector) => (
                    <button
                      key={sector.value}
                      onClick={() => setSelectedSector(sector.value)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
                        selectedSector === sector.value
                          ? "bg-gradient-golden text-primary-foreground shadow-golden"
                          : "bg-card text-muted-foreground hover:bg-muted border border-border"
                      )}
                    >
                      <span>{sector.icon}</span>
                      {sector.label}
                    </button>
                  ))}
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 flex-wrap">
                  {contractCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        selectedCategory === category
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {isLoadingTemplates ? (
                <div className="text-center py-12">
                  <Brain className="w-12 h-12 text-golden animate-pulse mx-auto mb-4" />
                  <p className="text-muted-foreground">جاري تحميل القوالب...</p>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <Card className="glass-card border-golden/20">
                  <CardContent className="py-16 text-center">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">لا توجد قوالب</h3>
                    <p className="text-muted-foreground mb-4">
                      {templates.length === 0 
                        ? "لا توجد قوالب عقود في النظام حاليًا" 
                        : "لا توجد قوالب تطابق معايير البحث الخاصة بك"}
                    </p>
                    {(selectedCategory !== "الكل" || selectedSector !== "الكل" || searchQuery) && (
                      <Button
                        variant="golden-outline"
                        onClick={() => {
                          setSelectedCategory("الكل");
                          setSelectedSector("الكل");
                          setSearchQuery("");
                        }}
                      >
                        إعادة تعيين الفلاتر
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((template, index) => (
                    <div
                      key={template.id}
                      className="group relative bg-gradient-to-br from-navy-800/90 to-navy-900/95 rounded-2xl border border-golden/20 p-6 transition-all duration-500 hover:border-golden/60 hover:shadow-[0_8px_40px_-12px_hsl(var(--golden)/0.4)] hover:-translate-y-2 overflow-hidden"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Background Glow Effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-golden/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      {/* Animated Border Glow */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-golden/0 via-golden/20 to-golden/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700" />
                      
                      {template.is_premium && (
                        <div className="absolute top-4 left-4 z-10">
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-golden text-xs text-navy-900 font-bold shadow-golden animate-pulse-golden">
                            <Crown className="w-3.5 h-3.5" />
                            مميز
                          </span>
                        </div>
                      )}
                      
                      {/* Icon with Glow */}
                      <div className="relative flex items-start justify-between mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-golden/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
                          <FileText className="w-7 h-7 text-primary group-hover:text-golden transition-colors duration-300" />
                        </div>
                        <span className="px-3 py-1.5 rounded-full bg-muted/50 backdrop-blur-sm text-xs text-muted-foreground border border-border/50 group-hover:border-golden/30 group-hover:bg-golden/10 transition-all duration-300">
                          {template.category}
                        </span>
                      </div>
                      
                      {/* Title with Gradient on Hover */}
                      <h3 className="relative font-cairo font-bold text-lg text-foreground mb-2 group-hover:text-transparent group-hover:bg-gradient-golden group-hover:bg-clip-text transition-all duration-300">
                        {template.title}
                      </h3>
                      <p className="relative text-sm text-muted-foreground mb-5 line-clamp-2 leading-relaxed">
                        {template.description}
                      </p>
                      
                      {/* Stats with Enhanced Styling */}
                      <div className="relative flex items-center justify-between text-sm mb-5 py-3 px-4 rounded-xl bg-navy-950/50 border border-border/30 group-hover:border-golden/20 transition-all duration-300">
                        <span className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                          <Download className="w-4 h-4 text-primary" />
                          <span className="font-medium">{template.downloads_count}</span>
                          <span className="text-xs opacity-70">تحميل</span>
                        </span>
                        <div className="flex items-center gap-2">
                          {renderStars(Math.round(template.average_rating))}
                          <span className="text-muted-foreground text-xs">({template.ratings_count})</span>
                        </div>
                      </div>
                      
                      {/* Action Buttons with Enhanced Styling */}
                      <div className="relative flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-golden/30 hover:border-golden hover:bg-golden/10 hover:text-golden transition-all duration-300"
                          onClick={() => {
                            // Redirect guests to auth page
                            if (!user) {
                              toast.info('يجب تسجيل الدخول لمعاينة محتوى العقد');
                              navigate('/auth', { state: { from: '/contracts', message: 'يرجى تسجيل الدخول أو إنشاء حساب للاطلاع على محتوى العقود' } });
                              return;
                            }
                            setSelectedTemplate(template);
                            setIsPreviewOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 ml-2" />
                          معاينة
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-primary/30 hover:border-primary hover:bg-primary/10 hover:text-primary transition-all duration-300"
                          onClick={() => {
                            if (!user) {
                              toast.info('يجب تسجيل الدخول لتعبئة العقد');
                              navigate('/auth', { state: { from: '/contracts', message: 'يرجى تسجيل الدخول أو إنشاء حساب لتعبئة العقود' } });
                              return;
                            }
                            if (!hasContractAccess) {
                              toast.error('هذه الخدمة متاحة للمشتركين فقط');
                              navigate('/pricing', { state: { requireSubscription: true } });
                              return;
                            }
                            setSelectedTemplate(template);
                            setIsFillFormOpen(true);
                          }}
                        >
                          <Printer className="w-4 h-4 ml-2" />
                          تعبئة
                        </Button>
                        <Button
                          variant="golden"
                          size="sm"
                          className="w-full mt-2 shadow-golden hover:shadow-[0_4px_20px_hsl(var(--golden)/0.5)] transition-all duration-300 hover:scale-[1.02]"
                          onClick={() => {
                            // Redirect guests to auth page
                            if (!user) {
                              toast.info('يجب تسجيل الدخول لتحميل العقد');
                              navigate('/auth', { state: { from: '/contracts', message: 'يرجى تسجيل الدخول أو إنشاء حساب لتحميل العقود' } });
                              return;
                            }
                            handleDownload(template);
                          }}
                        >
                          <Download className="w-4 h-4 ml-2" />
                          تحميل القالب
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Draft Tab */}
          {activeTab === "draft" && (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="font-cairo font-semibold text-2xl text-foreground mb-2">اختر نوع العقد</h2>
                <p className="text-muted-foreground">حدد نوع العقد وسيساعدك الذكاء الاصطناعي في صياغته</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {draftTemplates.map((template) => (
                  <button
                    key={template.id}
                    className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover-lift text-center group"
                  >
                    <span className="text-4xl mb-4 block">{template.icon}</span>
                    <h3 className="font-cairo font-semibold text-foreground group-hover:text-primary transition-colors">
                      {template.title}
                    </h3>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Analyze Tab */}
          {activeTab === "analyze" && (
            <div className="grid lg:grid-cols-2 gap-8">
              {renderAnalysisInput('analyze')}
              {renderAnalysisResults()}
            </div>
          )}

          {/* Review Tab */}
          {activeTab === "review" && (
            <div className="grid lg:grid-cols-2 gap-8">
              {renderAnalysisInput('review')}
              {renderAnalysisResults()}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <h2 className="font-cairo font-semibold text-xl text-foreground mb-4">التحليلات المحفوظة</h2>
                
                {!user ? (
                  <Card className="glass-card border-golden/20">
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">يجب تسجيل الدخول لعرض التحليلات المحفوظة</p>
                    </CardContent>
                  </Card>
                ) : isLoadingHistory ? (
                  <div className="text-center py-8">
                    <Brain className="w-8 h-8 text-golden animate-pulse mx-auto mb-2" />
                    <p className="text-muted-foreground">جاري التحميل...</p>
                  </div>
                ) : savedAnalyses.length === 0 ? (
                  <Card className="glass-card border-golden/20">
                    <CardContent className="py-8 text-center">
                      <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">لا توجد تحليلات محفوظة بعد</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {savedAnalyses.map((analysis) => (
                      <Card
                        key={analysis.id}
                        onClick={() => setSelectedAnalysis(analysis)}
                        className={cn(
                          "cursor-pointer transition-all hover:border-golden/50",
                          selectedAnalysis?.id === analysis.id ? "border-golden bg-golden/5" : "glass-card border-golden/20"
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground truncate">{analysis.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full",
                                  analysis.analysis_type === 'analyze' ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"
                                )}>
                                  {analysis.analysis_type === 'analyze' ? 'تحليل' : 'مراجعة'}
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(analysis.created_at), 'dd MMM yyyy', { locale: ar })}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAnalysis(analysis.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 space-y-6">
                {selectedAnalysis ? (
                  <>
                    <Card className="glass-card border-golden/20">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-golden">
                          <Scale className="w-5 h-5" />
                          {selectedAnalysis.title}
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(selectedAnalysis.summary)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {selectedAnalysis.summary}
                        </p>
                      </CardContent>
                    </Card>

                    {selectedAnalysis.risks?.length > 0 && (
                      <Card className="glass-card border-red-500/20">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-red-400">
                            <AlertTriangle className="w-5 h-5" />
                            المخاطر والثغرات
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {selectedAnalysis.risks.map((risk, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                <span className="text-muted-foreground">{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {selectedAnalysis.suggestions?.length > 0 && (
                      <Card className="glass-card border-green-500/20">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-green-400">
                            <Lightbulb className="w-5 h-5" />
                            التوصيات
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {selectedAnalysis.suggestions.map((suggestion, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                <span className="text-muted-foreground">{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card className="glass-card border-golden/20">
                    <CardContent className="py-16 text-center">
                      <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-cairo font-semibold text-xl text-foreground mb-2">اختر تحليلاً لعرضه</h3>
                      <p className="text-muted-foreground">اضغط على أحد التحليلات المحفوظة لعرض تفاصيله</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Shared Contracts Tab */}
          {activeTab === "shared" && (
            <SharedContractsManager />
          )}
        </div>
      </section>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-golden flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {selectedTemplate?.title}
            </DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <pre className="bg-muted/50 p-4 rounded-lg text-sm whitespace-pre-wrap font-sans leading-relaxed">
              {selectedTemplate?.content}
            </pre>
            
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {renderStars(Math.round(selectedTemplate?.average_rating || 0))}
                  <span className="text-sm text-muted-foreground mr-1">
                    ({selectedTemplate?.ratings_count} تقييم)
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                {user && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsPreviewOpen(false);
                      setIsRatingOpen(true);
                    }}
                  >
                    <MessageSquare className="w-4 h-4 ml-2" />
                    تقييم
                  </Button>
                )}
                <Button
                  variant="golden"
                  size="sm"
                  onClick={() => {
                    if (selectedTemplate) handleDownload(selectedTemplate);
                    setIsPreviewOpen(false);
                  }}
                >
                  <Download className="w-4 h-4 ml-2" />
                  تحميل
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-golden">تقييم العقد</DialogTitle>
            <DialogDescription>شاركنا رأيك في هذا القالب</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="text-center">
              <p className="mb-3 text-foreground">{selectedTemplate?.title}</p>
              <div className="flex justify-center">
                {renderStars(userRating, true, "w-8 h-8")}
              </div>
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground block mb-2">ملاحظاتك (اختياري)</label>
              <Textarea
                value={userFeedback}
                onChange={(e) => setUserFeedback(e.target.value)}
                placeholder="شاركنا اقتراحاتك لتحسين هذا القالب..."
                className="min-h-[100px]"
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsRatingOpen(false)}>
                إلغاء
              </Button>
              <Button
                variant="golden"
                onClick={handleSubmitRating}
                disabled={userRating === 0 || isSubmittingRating}
              >
                {isSubmittingRating ? 'جاري الإرسال...' : 'إرسال التقييم'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fill Form Dialog */}
      <ContractFillForm
        template={selectedTemplate}
        isOpen={isFillFormOpen}
        onClose={() => setIsFillFormOpen(false)}
      />

      {/* User Templates Manager */}
      <UserTemplatesManager
        isOpen={showUserTemplates}
        onClose={() => setShowUserTemplates(false)}
        onSelectTemplate={(template) => {
          setSelectedTemplate({
            id: template.id,
            title: template.title,
            description: template.description || '',
            category: template.category,
            sector: template.sector || 'عام',
            content: template.content,
            downloads_count: 0,
            average_rating: 0,
            ratings_count: 0,
            is_premium: false,
          });
          setIsFillFormOpen(true);
        }}
      />
    </Layout>
  );
};

const ContractsPage = () => (
  <ServiceGuard sectionKey="contracts">
    <Contracts />
  </ServiceGuard>
);

export default ContractsPage;
