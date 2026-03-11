import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { ServiceGuard } from "@/components/ServiceGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  BookOpen, 
  Scale, 
  FileText, 
  Filter,
  Calendar,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Copy,
  CheckCircle,
  Sparkles,
  Loader2,
  Lightbulb,
  ScrollText,
  Globe,
  Heart,
  Trash2,
  Upload,
  X,
  Paperclip
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServiceTrial } from "@/hooks/useServiceTrial";
import { useAuth } from "@/contexts/AuthContext";
import { TrialBanner } from "@/components/TrialBanner";

interface SavedSearch {
  id: string;
  query: string;
  result_content: string;
  citations: string[];
  search_type: string;
  created_at: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  file: File;
}

interface LegalDocument {
  id: string;
  title: string;
  type: "نظام" | "لائحة" | "قرار" | "تعميم" | "مرسوم";
  category: string;
  issuer: string;
  issueDate: string;
  lastUpdate: string;
  summary: string;
  articles: { number: number; text: string }[];
  keywords: string[];
}

interface AISearchResult {
  query: string;
  summary: string;
  relevantLaws: {
    name: string;
    type: string;
    issuer: string;
    relevance: string;
  }[];
  relevantArticles: {
    lawName: string;
    articleNumber: number;
    articleText: string;
    explanation: string;
  }[];
  practicalAdvice: string[];
  relatedTopics: string[];
}

interface PerplexitySearchResult {
  content: string;
  citations: string[];
  model: string;
}

// Safe content rendering using React's built-in XSS protection
// This replaces dangerouslySetInnerHTML with React components
const renderFormattedContent = (content: string): React.ReactNode => {
  // Split by newlines first
  const lines = content.split('\n');
  
  return lines.map((line, lineIndex) => {
    // Parse bold markers (**text**) and render with React components
    const parts = line.split(/\*\*(.+?)\*\*/g);
    
    return (
      <span key={lineIndex}>
        {parts.map((part, partIndex) => {
          // Odd indices are bold text (captured group)
          if (partIndex % 2 === 1) {
            return <strong key={partIndex} className="text-foreground">{part}</strong>;
          }
          return part;
        })}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    );
  });
};

const LegalSearch = () => {
  const { subscription, user } = useAuth();
  const { hasUsedTrial, useTrial, loading: trialLoading } = useServiceTrial("legal-search");
  const [trialActive, setTrialActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchResults, setSearchResults] = useState<LegalDocument[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("traditional");
  
  // AI Search State
  const [isAISearching, setIsAISearching] = useState(false);
  const [aiSearchResult, setAiSearchResult] = useState<AISearchResult | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  
  // Perplexity Search State
  const [isPerplexitySearching, setIsPerplexitySearching] = useState(false);
  const [perplexityResult, setPerplexityResult] = useState<PerplexitySearchResult | null>(null);

  // Saved Searches State
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);

  // File Upload & OCR State
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ocrStatus, setOcrStatus] = useState<{
    isProcessing: boolean;
    currentStep: string;
    estimatedTime: number;
    elapsedTime: number;
  }>({ isProcessing: false, currentStep: '', estimatedTime: 0, elapsedTime: 0 });
  const ocrTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [showExtractedPreview, setShowExtractedPreview] = useState(false);

  // Load saved searches
  useEffect(() => {
    if (user) {
      loadSavedSearches();
    }
  }, [user]);

  const loadSavedSearches = async () => {
    if (!user) return;
    setLoadingSaved(true);
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSavedSearches(data?.map(item => ({
        ...item,
        citations: Array.isArray(item.citations) 
          ? (item.citations as unknown as string[]).filter((c): c is string => typeof c === 'string')
          : []
      })) || []);
    } catch (error) {
      console.error('Error loading saved searches:', error);
    } finally {
      setLoadingSaved(false);
    }
  };

  const saveSearch = async (query: string, content: string, citations: string[], searchType: string) => {
    if (!user) {
      toast.error("يرجى تسجيل الدخول لحفظ النتائج");
      return;
    }
    setSavingSearch(true);
    try {
      const { error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: user.id,
          query,
          result_content: content,
          citations,
          search_type: searchType
        });
      
      if (error) throw error;
      toast.success("تم حفظ النتيجة في المفضلة");
      loadSavedSearches();
    } catch (error) {
      console.error('Error saving search:', error);
      toast.error("حدث خطأ في حفظ النتيجة");
    } finally {
      setSavingSearch(false);
    }
  };

  const deleteSavedSearch = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success("تم حذف النتيجة من المفضلة");
      setSavedSearches(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting saved search:', error);
      toast.error("حدث خطأ في حذف النتيجة");
    }
  };

  const isSearchSaved = (query: string, searchType: string) => {
    return savedSearches.some(s => s.query === query && s.search_type === searchType);
  };

  const handleUseTrial = async () => {
    const success = await useTrial();
    if (success) {
      setTrialActive(true);
      toast.success("تم تفعيل التجربة المجانية");
    }
  };

  // File handling functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

  const legalDatabase: LegalDocument[] = [
    {
      id: "1",
      title: "نظام العمل",
      type: "نظام",
      category: "أنظمة العمل",
      issuer: "مجلس الوزراء",
      issueDate: "1426/08/23",
      lastUpdate: "1444/01/15",
      summary: "ينظم العلاقة بين أصحاب العمل والعمال، ويحدد حقوق وواجبات كل طرف، ويضع الضوابط اللازمة لبيئة العمل.",
      articles: [
        { number: 1, text: "يسمى هذا النظام نظام العمل، ويعمل به بعد مائة وثمانين يوماً من تاريخ نشره في الجريدة الرسمية." },
        { number: 74, text: "عقد العمل هو عقد مبرم بين صاحب عمل وعامل، يتعهد الأخير بموجبه أن يعمل تحت إدارة صاحب العمل أو إشرافه." },
        { number: 77, text: "إذا أنهي العقد لسبب غير مشروع كان للطرف الذي أصابه ضرر من هذا الإنهاء الحق في تعويض." }
      ],
      keywords: ["عقد العمل", "حقوق العامل", "فصل تعسفي", "أجور", "إجازات"]
    },
    {
      id: "2",
      title: "نظام المعاملات المدنية",
      type: "نظام",
      category: "الأنظمة المدنية",
      issuer: "مجلس الوزراء",
      issueDate: "1444/06/19",
      lastUpdate: "1444/06/19",
      summary: "ينظم المعاملات المدنية والعقود والالتزامات بين الأفراد والجهات في المملكة العربية السعودية.",
      articles: [
        { number: 1, text: "يسمى هذا النظام نظام المعاملات المدنية." },
        { number: 45, text: "العقد شريعة المتعاقدين، فلا يجوز نقضه ولا تعديله إلا باتفاق الطرفين." },
        { number: 120, text: "يجب تنفيذ العقد طبقاً لما اشتمل عليه وبطريقة تتفق مع ما يوجبه حسن النية." }
      ],
      keywords: ["عقود", "التزامات", "ضمان", "مسؤولية", "تعويض"]
    },
    {
      id: "3",
      title: "نظام الشركات",
      type: "نظام",
      category: "الأنظمة التجارية",
      issuer: "مجلس الوزراء",
      issueDate: "1437/01/28",
      lastUpdate: "1444/03/10",
      summary: "ينظم تأسيس الشركات وإدارتها وتحويلها واندماجها وتصفيتها في المملكة العربية السعودية.",
      articles: [
        { number: 1, text: "يسمى هذا النظام نظام الشركات." },
        { number: 2, text: "الشركة عقد يلتزم بمقتضاه شخصان أو أكثر بأن يساهم كل منهم في مشروع يستهدف الربح." },
        { number: 150, text: "الشركة ذات المسؤولية المحدودة شركة لا يزيد عدد الشركاء فيها على خمسين شريكاً." }
      ],
      keywords: ["تأسيس شركة", "مسؤولية محدودة", "مساهمة", "تصفية", "اندماج"]
    },
    {
      id: "4",
      title: "نظام الإجراءات الجزائية",
      type: "نظام",
      category: "الأنظمة الجنائية",
      issuer: "مجلس الوزراء",
      issueDate: "1422/07/22",
      lastUpdate: "1442/05/18",
      summary: "ينظم إجراءات الضبط والتحقيق والمحاكمة في القضايا الجزائية.",
      articles: [
        { number: 1, text: "تطبق المحاكم على القضايا المعروضة أمامها أحكام الشريعة الإسلامية." },
        { number: 2, text: "لا يجوز القبض على أي إنسان أو تفتيشه أو توقيفه أو سجنه إلا في الأحوال المنصوص عليها نظاماً." },
        { number: 35, text: "في غير حالات التلبس لا يجوز القبض على أي شخص أو توقيفه إلا بأمر من السلطة المختصة." }
      ],
      keywords: ["قبض", "تحقيق", "محاكمة", "سجن", "توقيف"]
    },
    {
      id: "5",
      title: "نظام التنفيذ",
      type: "نظام",
      category: "أنظمة التنفيذ",
      issuer: "مجلس الوزراء",
      issueDate: "1433/06/18",
      lastUpdate: "1443/08/22",
      summary: "ينظم إجراءات تنفيذ الأحكام والسندات التنفيذية.",
      articles: [
        { number: 1, text: "يسمى هذا النظام نظام التنفيذ." },
        { number: 9, text: "لا يجوز التنفيذ الجبري إلا بسند تنفيذي لحق محقق الوجود ومعين المقدار وحال الأداء." },
        { number: 46, text: "يجوز الحجز التنفيذي على أموال المدين المنقولة وغير المنقولة." }
      ],
      keywords: ["تنفيذ", "حجز", "سند تنفيذي", "إيقاف خدمات", "منع سفر"]
    },
    {
      id: "6",
      title: "لائحة نظام العمل",
      type: "لائحة",
      category: "أنظمة العمل",
      issuer: "وزارة الموارد البشرية",
      issueDate: "1440/04/12",
      lastUpdate: "1444/09/05",
      summary: "اللائحة التنفيذية لنظام العمل التي تفصل أحكام النظام وتوضح آليات تطبيقه.",
      articles: [
        { number: 1, text: "تسري أحكام هذه اللائحة على جميع عقود العمل في القطاع الخاص." },
        { number: 14, text: "يجوز للعامل إنهاء عقد العمل في حالة عدم وفاء صاحب العمل بالتزاماته التعاقدية." }
      ],
      keywords: ["لائحة العمل", "ساعات العمل", "الإجازات", "نهاية الخدمة"]
    },
    {
      id: "7",
      title: "نظام الأحوال الشخصية",
      type: "نظام",
      category: "أنظمة الأحوال الشخصية",
      issuer: "مجلس الوزراء",
      issueDate: "1443/03/08",
      lastUpdate: "1443/03/08",
      summary: "ينظم شؤون الأسرة من زواج وطلاق ونفقة وحضانة ووصاية وميراث.",
      articles: [
        { number: 1, text: "يسمى هذا النظام نظام الأحوال الشخصية." },
        { number: 9, text: "الزواج عقد بين رجل وامرأة تحل له شرعاً، غايته الإحصان وإنشاء أسرة مستقرة." },
        { number: 127, text: "الحضانة حفظ الطفل وتربيته ورعايته بما لا يتعارض مع حق الولي في الولاية على النفس." }
      ],
      keywords: ["زواج", "طلاق", "حضانة", "نفقة", "ميراث", "وصاية"]
    },
    {
      id: "8",
      title: "نظام المرافعات الشرعية",
      type: "نظام",
      category: "أنظمة المحاكم",
      issuer: "مجلس الوزراء",
      issueDate: "1421/03/10",
      lastUpdate: "1443/12/15",
      summary: "ينظم إجراءات التقاضي أمام المحاكم الشرعية.",
      articles: [
        { number: 1, text: "تسري أحكام هذا النظام على الدعاوى التي ترفع أمام المحاكم الشرعية." },
        { number: 4, text: "ترفع الدعوى بصحيفة تودع لدى المحكمة." },
        { number: 80, text: "يجب على المحكمة أن تحكم في موضوع الدعوى بكل ما طلبه الخصوم." }
      ],
      keywords: ["دعوى", "محكمة", "استئناف", "حكم", "تقاضي"]
    }
  ];

  const categories = [
    "أنظمة العمل",
    "الأنظمة المدنية",
    "الأنظمة التجارية",
    "الأنظمة الجنائية",
    "أنظمة التنفيذ",
    "أنظمة الأحوال الشخصية",
    "أنظمة المحاكم"
  ];

  const documentTypes = ["نظام", "لائحة", "قرار", "تعميم", "مرسوم"];

  const handleSearch = () => {
    setHasSearched(true);
    
    let results = legalDatabase;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(doc => 
        doc.title.toLowerCase().includes(query) ||
        doc.summary.toLowerCase().includes(query) ||
        doc.keywords.some(k => k.toLowerCase().includes(query)) ||
        doc.articles.some(a => a.text.toLowerCase().includes(query))
      );
    }

    if (selectedType !== "all") {
      results = results.filter(doc => doc.type === selectedType);
    }

    if (selectedCategory !== "all") {
      results = results.filter(doc => doc.category === selectedCategory);
    }

    setSearchResults(results);
  };

  const handleAISearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("الرجاء إدخال نص للبحث");
      return;
    }

    // Check trial/subscription for AI search
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

    setIsAISearching(true);
    setAiSearchResult(null);

    try {
      // التأكد من وجود جلسة صالحة
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || !session.user) {
        toast.error("جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى");
        setIsAISearching(false);
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

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // دمج محتوى الملفات مع البحث
      let fullQuery = searchQuery;
      if (extractedFileContent) {
        fullQuery = `${searchQuery}\n\n--- محتوى المستندات المرفقة ---\n${extractedFileContent}`;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/legal-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          type: "legal-search",
          messages: [{ role: "user", content: fullQuery }]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('AI Error:', response.status, errorData);
        throw new Error(errorData?.error || 'حدث خطأ في البحث');
      }

      const data = await response.json();

      setAiSearchResult(data);
      toast.success("تم البحث بنجاح");
    } catch (error) {
      console.error("AI Search error:", error);
      toast.error("حدث خطأ أثناء البحث");
    } finally {
      setIsAISearching(false);
    }
  };

  const handlePerplexitySearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("الرجاء إدخال نص للبحث");
      return;
    }

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

    setIsPerplexitySearching(true);
    setPerplexityResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى");
        setIsPerplexitySearching(false);
        return;
      }

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/perplexity-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Perplexity Error:', response.status, errorData);
        
        if (response.status === 429) {
          toast.error("تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً");
        } else {
          toast.error(errorData?.error || "حدث خطأ في البحث");
        }
        return;
      }

      const data = await response.json();
      setPerplexityResult(data);
      toast.success("تم البحث بنجاح مع مصادر موثقة");
    } catch (error) {
      console.error("Perplexity Search error:", error);
      toast.error("حدث خطأ أثناء البحث");
    } finally {
      setIsPerplexitySearching(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("تم النسخ");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const popularSearches = [
    "عقد العمل",
    "فصل تعسفي",
    "حضانة",
    "تأسيس شركة",
    "إيقاف خدمات",
    "نفقة"
  ];

  return (
    <Layout>
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-golden mb-6">
              <BookOpen className="w-10 h-10 text-navy-900" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              محرك البحث <span className="text-gradient-golden">القانوني</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              ابحث في الأنظمة والتشريعات السعودية بسهولة وسرعة
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

          {/* Search Type Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-4 mb-6">
              <TabsTrigger value="traditional" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">البحث التقليدي</span>
                <span className="sm:hidden">تقليدي</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">البحث الذكي</span>
                <span className="sm:hidden">ذكي</span>
              </TabsTrigger>
              <TabsTrigger value="perplexity" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">البحث الموثق</span>
                <span className="sm:hidden">موثق</span>
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">المفضلة</span>
                <span className="sm:hidden">مفضلة</span>
                {savedSearches.length > 0 && (
                  <Badge className="bg-golden/20 text-golden text-xs">{savedSearches.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Traditional Search Tab */}
            <TabsContent value="traditional">
              <Card className="glass-card border-golden/20 mb-8">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="flex-1 relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="ابحث في الأنظمة والتشريعات..."
                        className="h-12 border-golden/30 bg-background/80 pr-10 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <Button variant="golden" size="lg" onClick={handleSearch}>
                      <Search className="w-5 h-5 ml-2" />
                      بحث
                    </Button>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-golden" />
                      <span className="text-sm text-muted-foreground">تصفية:</span>
                    </div>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="w-full border-golden/30 bg-background/80 text-foreground md:w-[180px]">
                        <SelectValue placeholder="نوع الوثيقة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الأنواع</SelectItem>
                        {documentTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full border-golden/30 bg-background/80 text-foreground md:w-[200px]">
                        <SelectValue placeholder="التصنيف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع التصنيفات</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Popular Searches */}
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">عمليات بحث شائعة:</p>
                    <div className="flex flex-wrap gap-2">
                      {popularSearches.map(term => (
                        <Button
                          key={term}
                          variant="outline"
                          size="sm"
                          className="border-golden/30 text-golden hover:bg-golden/10"
                          onClick={() => {
                            setSearchQuery(term);
                            handleSearch();
                          }}
                        >
                          {term}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Traditional Results Section */}
              {hasSearched && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">
                      تم العثور على <span className="text-golden font-bold">{searchResults.length}</span> نتيجة
                    </p>
                  </div>

                  {searchResults.length > 0 ? (
                    <div className="space-y-4">
                      {searchResults.map(doc => (
                        <Card key={doc.id} className="glass-card border-golden/20 overflow-hidden">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-golden/20 text-golden">{doc.type}</Badge>
                                  <Badge variant="outline" className="border-golden/30 text-muted-foreground">{doc.category}</Badge>
                                </div>
                                <CardTitle className="text-xl text-golden">{doc.title}</CardTitle>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="text-golden hover:bg-golden/10">
                                  <Bookmark className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-golden hover:bg-golden/10">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground mb-4">{doc.summary}</p>
                            
                            <div className="flex flex-wrap gap-4 text-sm mb-4">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Building2 className="w-4 h-4" />
                                {doc.issuer}
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                صدر: {doc.issueDate}
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                آخر تحديث: {doc.lastUpdate}
                              </div>
                            </div>

                            {/* Keywords */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              {doc.keywords.map(keyword => (
                                <span 
                                  key={keyword}
                                  className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>

                            {/* Expandable Articles */}
                            <Button
                              variant="outline"
                              className="w-full border-golden/30 text-golden hover:bg-golden/10"
                              onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                            >
                              {expandedDoc === doc.id ? (
                                <>
                                  <ChevronUp className="w-4 h-4 ml-2" />
                                  إخفاء المواد
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4 ml-2" />
                                  عرض المواد ({doc.articles.length})
                                </>
                              )}
                            </Button>

                            {expandedDoc === doc.id && (
                              <div className="mt-4 space-y-3">
                                {doc.articles.map(article => (
                                  <div 
                                    key={article.number}
                                    className="rounded-lg border border-border/60 bg-muted/40 p-4"
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <p className="text-golden font-bold mb-2">المادة {article.number}</p>
                                        <p className="text-foreground">{article.text}</p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 text-muted-foreground hover:text-golden"
                                        onClick={() => handleCopy(article.text, `${doc.id}-${article.number}`)}
                                      >
                                        {copiedId === `${doc.id}-${article.number}` ? (
                                          <CheckCircle className="w-4 h-4 text-green-400" />
                                        ) : (
                                          <Copy className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="glass-card border-golden/20">
                      <CardContent className="py-12 text-center">
                        <Search className="w-16 h-16 text-golden/30 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-foreground mb-2">لا توجد نتائج</h3>
                        <p className="text-muted-foreground">جرب البحث بكلمات مختلفة أو تغيير التصفية</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Initial State - Browse Categories */}
              {!hasSearched && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map(category => {
                    const count = legalDatabase.filter(d => d.category === category).length;
                    return (
                      <Card 
                        key={category}
                        className="glass-card border-golden/20 cursor-pointer hover:border-golden/40 transition-colors"
                        onClick={() => {
                          setSelectedCategory(category);
                          setHasSearched(true);
                          setSearchResults(legalDatabase.filter(d => d.category === category));
                        }}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-golden/20 flex items-center justify-center">
                              <Scale className="w-6 h-6 text-golden" />
                            </div>
                            <div>
                              <h3 className="font-bold text-foreground">{category}</h3>
                              <p className="text-sm text-muted-foreground">{count} وثيقة</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* AI Search Tab */}
            <TabsContent value="ai">
              <Card className="glass-card border-golden/20 mb-8">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-golden flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-navy-900" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">البحث الذكي بالذكاء الاصطناعي</h3>
                      <p className="text-sm text-muted-foreground">اسأل بلغتك الطبيعية واحصل على إجابات قانونية شاملة</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-golden" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !isAISearching && handleAISearch()}
                        placeholder="اسأل سؤالك القانوني... مثال: ما هي حقوقي عند الفصل التعسفي؟"
                        className="h-12 border-golden/30 bg-background/80 pr-10 text-foreground placeholder:text-muted-foreground"
                        disabled={isAISearching}
                      />
                    </div>
                    <Button 
                      variant="golden" 
                      size="lg" 
                      onClick={handleAISearch}
                      disabled={isAISearching}
                    >
                      {isAISearching ? (
                        <>
                          <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                          جاري البحث...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 ml-2" />
                          بحث ذكي
                        </>
                      )}
                    </Button>
                  </div>

                  {/* File Upload Section */}
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-golden/40 text-golden hover:bg-golden/10"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAISearching || ocrStatus.isProcessing}
                      >
                        <Paperclip className="w-4 h-4 ml-2" />
                        إرفاق مستند
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        PDF, Word, صور
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        title="اختيار ملفات للبحث الذكي"
                        aria-label="اختيار ملفات للبحث الذكي"
                      />
                    </div>

                    {/* Uploaded Files Preview */}
                    {uploadedFiles.length > 0 && !ocrStatus.isProcessing && (
                      <div className="flex flex-wrap gap-2">
                        {uploadedFiles.map(file => (
                          <div
                            key={file.id}
                            className="flex items-center gap-2 rounded-full border border-golden/20 bg-card/80 px-3 py-1.5 text-xs text-foreground shadow-sm"
                          >
                            <FileText className="w-3 h-3 text-golden" />
                            <span className="max-w-[120px] truncate">{file.name}</span>
                            <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                            <button
                              type="button"
                              onClick={() => removeFile(file.id)}
                              className="text-muted-foreground hover:text-foreground"
                              title={`إزالة الملف ${file.name}`}
                              aria-label={`إزالة الملف ${file.name}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Extract Text Button */}
                    {uploadedFiles.length > 0 && !ocrStatus.isProcessing && !showExtractedPreview && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-golden/30 text-golden hover:bg-golden/10"
                        onClick={handleExtractText}
                      >
                        <FileText className="w-4 h-4 ml-2" />
                        استخراج النص من الملفات
                      </Button>
                    )}

                    {/* OCR Processing Status */}
                    {ocrStatus.isProcessing && (
                      <div className="rounded-lg border border-golden/30 bg-card/85 p-4 shadow-sm">
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
                      <div className="space-y-3 rounded-lg border border-golden/30 bg-card/85 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-golden">
                            <FileText className="w-5 h-5" />
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
                        <textarea
                          value={extractedText}
                          onChange={(e) => setExtractedText(e.target.value)}
                          className="min-h-[120px] w-full bg-background/50 border border-golden/20 rounded-md px-3 py-2 text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-golden/30"
                          placeholder="النص المستخرج..."
                        />
                        <p className="text-xs text-muted-foreground">
                          يمكنك تعديل النص المستخرج قبل إرساله للبحث
                        </p>
                      </div>
                    )}
                  </div>

                  {/* AI Search Examples */}
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">أمثلة على الأسئلة:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "ما هي إجراءات رفع دعوى حضانة؟",
                        "كيف أحسب مستحقات نهاية الخدمة؟",
                        "ما عقوبة التشهير في السعودية؟",
                        "حقوق المستأجر عند إنهاء العقد"
                      ].map(example => (
                        <Button
                          key={example}
                          variant="outline"
                          size="sm"
                          className="border-golden/30 text-golden hover:bg-golden/10"
                          onClick={() => {
                            setSearchQuery(example);
                          }}
                          disabled={isAISearching || ocrStatus.isProcessing}
                        >
                          {example}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Search Results */}
              {isAISearching && (
                <Card className="glass-card border-golden/20">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="w-12 h-12 text-golden animate-spin mb-4" />
                      <h3 className="text-lg font-bold text-foreground mb-2">جاري البحث في الأنظمة السعودية...</h3>
                      <p className="text-muted-foreground">يتم تحليل سؤالك والبحث في قاعدة البيانات القانونية</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {aiSearchResult && !isAISearching && (
                <div className="space-y-6">
                  {/* Summary */}
                  <Card className="glass-card border-golden/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-golden">
                        <FileText className="w-5 h-5" />
                        ملخص الإجابة
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground leading-relaxed whitespace-pre-line">
                        {aiSearchResult.summary}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Relevant Laws */}
                  <Card className="glass-card border-golden/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-golden">
                        <Scale className="w-5 h-5" />
                        الأنظمة ذات الصلة
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        {aiSearchResult.relevantLaws.map((law, idx) => (
                          <div key={idx} className="rounded-lg border border-border/60 bg-muted/40 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-golden/20 text-golden">{law.type}</Badge>
                              <span className="text-sm text-muted-foreground">{law.issuer}</span>
                            </div>
                            <h4 className="font-bold text-foreground mb-2">{law.name}</h4>
                            <p className="text-sm text-muted-foreground">{law.relevance}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Relevant Articles */}
                  <Card className="glass-card border-golden/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-golden">
                        <ScrollText className="w-5 h-5" />
                        المواد القانونية
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {aiSearchResult.relevantArticles.map((article, idx) => (
                          <div key={idx} className="border border-golden/20 rounded-lg overflow-hidden">
                            <button
                              className="flex w-full items-center justify-between bg-muted/30 p-4 transition-colors hover:bg-muted/60"
                              onClick={() => setExpandedArticle(expandedArticle === `${idx}` ? null : `${idx}`)}
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="border-golden/30">
                                  المادة {article.articleNumber}
                                </Badge>
                                <span className="font-bold text-foreground">{article.lawName}</span>
                              </div>
                              {expandedArticle === `${idx}` ? (
                                <ChevronUp className="w-5 h-5 text-golden" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-golden" />
                              )}
                            </button>
                            
                            {expandedArticle === `${idx}` && (
                              <div className="p-4 space-y-4">
                                <div>
                                  <h5 className="text-sm font-bold text-golden mb-2">نص المادة:</h5>
                                  <p className="rounded-lg bg-muted/40 p-3 text-foreground">
                                    {article.articleText}
                                  </p>
                                </div>
                                <div>
                                  <h5 className="text-sm font-bold text-golden mb-2">الشرح المبسط:</h5>
                                  <p className="text-muted-foreground">
                                    {article.explanation}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-golden hover:bg-golden/10"
                                  onClick={() => handleCopy(article.articleText, `ai-${idx}`)}
                                >
                                  {copiedId === `ai-${idx}` ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 ml-2 text-green-400" />
                                      تم النسخ
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-4 h-4 ml-2" />
                                      نسخ المادة
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Practical Advice */}
                  <Card className="glass-card border-golden/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-golden">
                        <Lightbulb className="w-5 h-5" />
                        نصائح عملية
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {aiSearchResult.practicalAdvice.map((advice, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-golden/20 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-golden text-sm font-bold">{idx + 1}</span>
                            </div>
                            <p className="text-foreground">{advice}</p>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Related Topics */}
                  <Card className="glass-card border-golden/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-golden">
                        <Search className="w-5 h-5" />
                        مواضيع ذات صلة
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {aiSearchResult.relatedTopics.map((topic, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            className="border-golden/30 text-golden hover:bg-golden/10"
                            onClick={() => {
                              setSearchQuery(topic);
                              handleAISearch();
                            }}
                          >
                            {topic}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Initial State */}
              {!aiSearchResult && !isAISearching && (
                <Card className="glass-card border-golden/20">
                  <CardContent className="py-12 text-center">
                    <Sparkles className="w-16 h-16 text-golden/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">اسأل سؤالك القانوني</h3>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                      استخدم البحث الذكي للحصول على إجابات شاملة تتضمن المواد القانونية ذات الصلة والنصائح العملية
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Perplexity Search Tab */}
            <TabsContent value="perplexity">
              <Card className="glass-card border-golden/20 mb-8">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-golden">
                      <Globe className="w-5 h-5" />
                      <span className="text-sm font-medium">بحث موثق بالمصادر الرسمية</span>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handlePerplexitySearch()}
                          placeholder="ابحث عن أي موضوع قانوني..."
                          className="h-12 border-golden/30 bg-background/80 pr-10 text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <Button 
                        variant="golden" 
                        size="lg" 
                        onClick={handlePerplexitySearch}
                        disabled={isPerplexitySearching}
                      >
                        {isPerplexitySearching ? (
                          <>
                            <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                            جارٍ البحث...
                          </>
                        ) : (
                          <>
                            <Globe className="w-5 h-5 ml-2" />
                            بحث موثق
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      يستخدم الذكاء الاصطناعي للبحث في المصادر الرسمية السعودية (هيئة الخبراء، وزارة العدل، وزارة الموارد البشرية)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Perplexity Loading State */}
              {isPerplexitySearching && (
                <Card className="glass-card border-golden/20">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-12 h-12 text-golden animate-spin" />
                      <p className="text-muted-foreground">جارٍ البحث في المصادر الرسمية...</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Perplexity Results */}
              {perplexityResult && !isPerplexitySearching && (
                <div className="space-y-6">
                  <Card className="glass-card border-golden/20">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        نتائج البحث الموثق
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={savingSearch || isSearchSaved(searchQuery, 'perplexity')}
                        onClick={() => saveSearch(
                          searchQuery, 
                          perplexityResult.content, 
                          perplexityResult.citations || [], 
                          'perplexity'
                        )}
                        className="border-golden/30 text-golden hover:bg-golden/10"
                      >
                        {isSearchSaved(searchQuery, 'perplexity') ? (
                          <>
                            <BookmarkCheck className="w-4 h-4 ml-2" />
                            محفوظ
                          </>
                        ) : savingSearch ? (
                          <>
                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                            جارٍ الحفظ...
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-4 h-4 ml-2" />
                            حفظ في المفضلة
                          </>
                        )}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-invert max-w-none">
                        <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {renderFormattedContent(perplexityResult.content)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Citations */}
                  {perplexityResult.citations && perplexityResult.citations.length > 0 && (
                    <Card className="glass-card border-golden/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                          <ExternalLink className="w-5 h-5 text-golden" />
                          المصادر والمراجع ({perplexityResult.citations.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {perplexityResult.citations.map((citation, index) => (
                            <a
                              key={index}
                              href={citation}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 rounded-lg bg-background/50 hover:bg-golden/10 transition-colors group"
                            >
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-golden/20 text-golden text-xs flex items-center justify-center">
                                {index + 1}
                              </span>
                              <span className="text-sm text-muted-foreground group-hover:text-golden truncate flex-1">
                                {citation}
                              </span>
                              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-golden flex-shrink-0" />
                            </a>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Initial State */}
              {!perplexityResult && !isPerplexitySearching && (
                <Card className="glass-card border-golden/20">
                  <CardContent className="py-12 text-center">
                    <Globe className="w-16 h-16 text-golden/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">البحث الموثق بالمصادر</h3>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                      احصل على إجابات شاملة مع روابط للمصادر الرسمية من الأنظمة والتشريعات السعودية
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Saved Searches Tab */}
            <TabsContent value="saved">
              {!user ? (
                <Card className="glass-card border-golden/20">
                  <CardContent className="py-12 text-center">
                    <Heart className="w-16 h-16 text-golden/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">تسجيل الدخول مطلوب</h3>
                    <p className="text-muted-foreground">
                      يرجى تسجيل الدخول لعرض نتائج البحث المحفوظة
                    </p>
                  </CardContent>
                </Card>
              ) : loadingSaved ? (
                <Card className="glass-card border-golden/20">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-12 h-12 text-golden animate-spin" />
                      <p className="text-muted-foreground">جارٍ تحميل المفضلة...</p>
                    </div>
                  </CardContent>
                </Card>
              ) : savedSearches.length === 0 ? (
                <Card className="glass-card border-golden/20">
                  <CardContent className="py-12 text-center">
                    <Heart className="w-16 h-16 text-golden/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">لا توجد نتائج محفوظة</h3>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                      احفظ نتائج البحث المهمة من البحث الموثق للرجوع إليها لاحقاً
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-muted-foreground">
                      <span className="text-golden font-bold">{savedSearches.length}</span> نتيجة محفوظة
                    </p>
                  </div>
                  {savedSearches.map((saved) => (
                    <Card key={saved.id} className="glass-card border-golden/20">
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-golden/20 text-golden">
                              {saved.search_type === 'perplexity' ? 'بحث موثق' : 'بحث ذكي'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(saved.created_at).toLocaleDateString('ar-SA')}
                            </span>
                          </div>
                          <CardTitle className="text-lg text-foreground">{saved.query}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => deleteSavedSearch(saved.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm line-clamp-4 mb-4">
                          {renderFormattedContent(saved.result_content)}
                        </div>
                        
                        {saved.citations && saved.citations.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-golden/10">
                            <p className="text-xs text-muted-foreground mb-2">
                              <ExternalLink className="w-3 h-3 inline-block ml-1" />
                              {saved.citations.length} مصادر
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {saved.citations.slice(0, 3).map((citation, idx) => (
                                <a
                                  key={idx}
                                  href={citation}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-golden hover:underline truncate max-w-[200px]"
                                >
                                  {citation}
                                </a>
                              ))}
                              {saved.citations.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{saved.citations.length - 3} أخرى
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

const LegalSearchPage = () => (
  <ServiceGuard sectionKey="legal_search">
    <LegalSearch />
  </ServiceGuard>
);

export default LegalSearchPage;
