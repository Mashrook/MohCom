import { useState, useEffect } from "react";
import { Json } from "@/integrations/supabase/types";
import { compressVideo, shouldCompressVideo, CompressionProgress, CompressionQuality, getEstimatedSize } from "@/utils/videoCompression";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  FileText, 
  Upload, 
  DollarSign,
  Users,
  MessageSquare,
  Save,
  Loader2,
  Trash2,
  Eye,
  Download,
  BarChart3,
  Briefcase,
  MessageCircle,
  Scale,
  Search,
  FileCheck,
  Brain,
  ExternalLink,
  Video,
  Image as ImageIcon,
  Sparkles,
  Star,
  Layers,
  Target,
  LayoutGrid,
  ToggleLeft,
  ToggleRight,
  GripVertical,
  Gift,
  Shield
} from "lucide-react";
import SecurityAlertsPanel from "@/components/admin/SecurityAlertsPanel";
import RLSPolicyTestsPanel from "@/components/admin/RLSPolicyTestsPanel";
import LiveServiceMonitor from "@/components/admin/LiveServiceMonitor";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableSectionItem } from "@/components/admin/SortableSectionItem";
import { TrialStatistics } from "@/components/admin/TrialStatistics";

interface SiteContent {
  id: string;
  page_key: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  content: unknown;
}

interface FileRecord {
  id: string;
  name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
  is_public: boolean;
}

interface SectionSetting {
  id: string;
  section_key: string;
  section_name: string;
  is_enabled: boolean;
  display_order: number;
}

const AdminFullDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("services");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // CMS State
  const [siteContent, setSiteContent] = useState<SiteContent[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>("");
  const [editingContent, setEditingContent] = useState<Partial<SiteContent>>({});
  
  // Files State
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Video State
  const [videoUrl, setVideoUrl] = useState("");
  const [videoThumbnail, setVideoThumbnail] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress | null>(null);
  const [compressionQuality, setCompressionQuality] = useState<CompressionQuality>('medium');
  const [isDirectVideo, setIsDirectVideo] = useState(false);
  const [videoTitle, setVideoTitle] = useState("تعرف على محامي كوم");
  const [videoDescription, setVideoDescription] = useState("شاهد كيف نُحدث ثورة في عالم الخدمات القانونية بالمملكة العربية السعودية");
  const [videoStats, setVideoStats] = useState({
    clients: "+1000",
    clientsLabel: "عميل سعيد",
    lawyers: "+50",
    lawyersLabel: "محامي معتمد",
    support: "24/7",
    supportLabel: "دعم متواصل"
  });
  const [videoViewsCount, setVideoViewsCount] = useState(0);

  // Section Settings State
  const [sectionSettings, setSectionSettings] = useState<SectionSetting[]>([]);
  const [savingSections, setSavingSections] = useState(false);

  // Hero State
  const [heroContent, setHeroContent] = useState({
    badge: "مدعوم بالذكاء الاصطناعي",
    titleLine1: "استشاراتك القانونية",
    titleLine2: "بذكاء اصطناعي متقدم",
    description: "محامي كوم تجمع نخبة من المحامين مع تقنيات الذكاء الاصطناعي لتقديم استشارات قانونية دقيقة وموثوقة في أي وقت",
    ctaButton1: "ابدأ استشارتك الآن",
    ctaButton2: "تعرف على المنصة",
    stat1Value: "+500",
    stat1Label: "محامي معتمد",
    stat2Value: "+10K",
    stat2Label: "استشارة منجزة",
    stat3Value: "98%",
    stat3Label: "نسبة الرضا"
  });

  // Features State
  const [featuresContent, setFeaturesContent] = useState({
    badge: "لماذا نحن؟",
    title: "مميزات تجعلنا الخيار الأمثل",
    description: "نجمع بين الخبرة القانونية والتقنية الحديثة لنقدم لك تجربة فريدة",
    features: [
      { icon: "Zap", title: "استجابة فورية", description: "احصل على إجابات قانونية دقيقة في ثوانٍ معدودة" },
      { icon: "Shield", title: "موثوقية عالية", description: "نظام مدعوم بخبرات محامين معتمدين وتقنيات متقدمة" },
      { icon: "Clock", title: "متاح 24/7", description: "الوصول لخدماتنا في أي وقت ومن أي مكان" },
      { icon: "Lock", title: "سرية تامة", description: "حماية كاملة لبياناتك ومعلوماتك القانونية" },
      { icon: "Award", title: "جودة مضمونة", description: "نسبة رضا عملاء تتجاوز 98% على خدماتنا" },
      { icon: "HeartHandshake", title: "دعم متميز", description: "فريق دعم متخصص جاهز لمساعدتك دائماً" }
    ]
  });

  // Services State
  const [servicesContent, setServicesContent] = useState({
    badge: "خدماتنا المتميزة",
    title: "حلول قانونية شاملة بتقنية ذكية",
    description: "نقدم مجموعة متكاملة من الخدمات القانونية المدعومة بالذكاء الاصطناعي لتلبية جميع احتياجاتك",
    services: [
      { icon: "MessageSquare", title: "الاستشارات القانونية", description: "واجهة دردشة ذكية متكاملة مع نماذج الذكاء الاصطناعي لتقديم استشارات قانونية فورية ودقيقة", href: "/consultation" },
      { icon: "Scale", title: "التنبؤ بالأحكام", description: "تحليل القضايا باستخدام الذكاء الاصطناعي للتنبؤ بالأحكام المحتملة مع عرض أمثلة مشابهة", href: "/prediction" },
      { icon: "FileText", title: "إدارة العقود", description: "مكتبة شاملة للعقود مع إمكانية الصياغة والتحليل والمراجعة بمساعدة الذكاء الاصطناعي", href: "/contracts" },
      { icon: "Users", title: "تجمع المحامين", description: "تواصل مباشر مع نخبة من المحامين عبر الدردشة الكتابية والصوتية والفيديو", href: "/lawyers" },
      { icon: "Search", title: "البحث القانوني", description: "محرك بحث متقدم في قاعدة بيانات الأنظمة والتشريعات مع فلترة ذكية للنتائج", href: "/search" },
      { icon: "AlertCircle", title: "نظام الشكاوى الذكي", description: "تقديم الشكاوى وتحليلها بواسطة الذكاء الاصطناعي لتوجيهها للجهة المختصة", href: "/complaints" }
    ]
  });
  // CTA State
  const [ctaContent, setCtaContent] = useState({
    title: "هل لديك استفسار قانوني؟",
    description: "ابدأ محادثتك الآن مع مستشارنا القانوني الذكي واحصل على إجابات دقيقة وموثوقة في دقائق",
    ctaButton1: "ابدأ استشارتك المجانية",
    ctaButton2: "اطلع على الباقات",
    badge1: "استشارة أولى مجانية",
    badge2: "بدون التزام",
    badge3: "سرية تامة"
  });
  
  // Footer State
  const [footerContent, setFooterContent] = useState({
    description: "منصة احترافية تجمع نخبة من المحامين لتقديم الاستشارات والخدمات القانونية من خلال خبرة جماعية موثوقة بتقنية ذكية.",
    email: "info@mohamie.com",
    phone: "+966 53 109 9732",
    address: "المملكة العربية السعودية",
    copyright: "محامي كوم. جميع الحقوق محفوظة.",
    tagline: "مدعوم بتقنيات الذكاء الاصطناعي",
    facebookUrl: "#",
    twitterUrl: "#",
    instagramUrl: "#",
    linkedinUrl: "#"
  });

  // Pricing State
  const [pricingContent, setPricingContent] = useState({
    badge: "خطط الاشتراك",
    title: "اختر الخطة المناسبة لك",
    description: "خطط مرنة تناسب احتياجاتك مع إمكانية الترقية في أي وقت",
    plans: [
      { 
        id: "basic", 
        name: "الأساسية", 
        description: "للاستخدام الشخصي", 
        monthlyPrice: 99, 
        features: ["5 استشارات شهرياً", "تحليل العقود", "محرك البحث القانوني", "دعم بريد إلكتروني"]
      },
      { 
        id: "professional", 
        name: "الاحترافية", 
        description: "للمستخدمين المحترفين", 
        monthlyPrice: 199, 
        features: ["استشارات غير محدودة", "جميع خدمات الباقة الأساسية", "التنبؤ بالأحكام", "نظام الشكاوى الذكي", "التواصل مع المحامين", "دعم أولوية"]
      },
      { 
        id: "enterprise", 
        name: "المؤسسات", 
        description: "للشركات والمؤسسات", 
        monthlyPrice: 499, 
        features: ["جميع مميزات الاحترافية", "دعم مخصص 24/7", "تواصل مباشر مع محامين", "تقارير شهرية مفصلة", "API للتكامل", "مستخدمين غير محدودين"]
      }
    ]
  });

  const pages = [
    { key: "home", label: "الصفحة الرئيسية" },
    { key: "about", label: "من نحن" },
    { key: "services", label: "خدماتنا" },
    { key: "contact", label: "اتصل بنا" },
    { key: "pricing", label: "الأسعار" },
  ];

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية الوصول لهذه الصفحة",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    if (isAdmin) {
      fetchContent();
      fetchFiles();
      fetchVideoContent();
      fetchHeroContent();
      fetchFeaturesContent();
      fetchServicesContent();
      fetchCtaContent();
      fetchFooterContent();
      fetchPricingContent();
      fetchSectionSettings();
    }
  }, [isAdmin, authLoading, navigate]);

  // Section Settings Functions
  const fetchSectionSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("section_settings")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setSectionSettings(data || []);
    } catch (error) {
      console.error("Error fetching section settings:", error);
    }
  };

  const toggleSection = async (sectionId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("section_settings")
        .update({ is_enabled: !currentState })
        .eq("id", sectionId);

      if (error) throw error;
      
      setSectionSettings(prev => 
        prev.map(s => s.id === sectionId ? { ...s, is_enabled: !currentState } : s)
      );
      
      toast({ 
        title: !currentState ? "تم التفعيل" : "تم الإلغاء", 
        description: `تم ${!currentState ? 'تفعيل' : 'إلغاء'} القسم بنجاح` 
      });
    } catch (error) {
      console.error("Error toggling section:", error);
      toast({ title: "خطأ", description: "فشل في تحديث الإعدادات", variant: "destructive" });
    }
  };

  const toggleAllSections = async (enable: boolean) => {
    setSavingSections(true);
    try {
      const { error } = await supabase
        .from("section_settings")
        .update({ is_enabled: enable })
        .neq("id", "");

      if (error) throw error;
      
      setSectionSettings(prev => prev.map(s => ({ ...s, is_enabled: enable })));
      
      toast({ 
        title: enable ? "تم تفعيل الكل" : "تم إلغاء الكل", 
        description: `تم ${enable ? 'تفعيل' : 'إلغاء'} جميع الأقسام` 
      });
    } catch (error) {
      console.error("Error toggling all sections:", error);
      toast({ title: "خطأ", description: "فشل في تحديث الإعدادات", variant: "destructive" });
    } finally {
      setSavingSections(false);
    }
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent, isHomepageSections: boolean) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const filteredSections = isHomepageSections 
        ? sectionSettings.filter(s => s.display_order < 10)
        : sectionSettings.filter(s => s.display_order >= 10);
      
      const oldIndex = filteredSections.findIndex(s => s.id === active.id);
      const newIndex = filteredSections.findIndex(s => s.id === over.id);

      const reorderedSections = arrayMove(filteredSections, oldIndex, newIndex);
      
      // Calculate new display_order values
      const baseOrder = isHomepageSections ? 1 : 10;
      const updates = reorderedSections.map((section, index) => ({
        id: section.id,
        display_order: baseOrder + index,
      }));

      // Update local state immediately for smooth UX
      setSectionSettings(prev => {
        const otherSections = prev.filter(s => 
          isHomepageSections ? s.display_order >= 10 : s.display_order < 10
        );
        const updatedSections = reorderedSections.map((section, index) => ({
          ...section,
          display_order: baseOrder + index,
        }));
        return [...updatedSections, ...otherSections].sort((a, b) => a.display_order - b.display_order);
      });

      // Update database
      try {
        for (const update of updates) {
          await supabase
            .from("section_settings")
            .update({ display_order: update.display_order })
            .eq("id", update.id);
        }
        toast({ title: "تم الحفظ", description: "تم حفظ الترتيب الجديد" });
      } catch (error) {
        console.error("Error updating order:", error);
        toast({ title: "خطأ", description: "فشل في حفظ الترتيب", variant: "destructive" });
        fetchSectionSettings(); // Revert on error
      }
    }
  };

  const fetchContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("site_content")
        .select("*")
        .order("page_key");

      if (error) throw error;
      setSiteContent(data || []);
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  const handlePageSelect = (pageKey: string) => {
    setSelectedPage(pageKey);
    const existing = siteContent.find(c => c.page_key === pageKey);
    if (existing) {
      setEditingContent(existing);
    } else {
      setEditingContent({
        page_key: pageKey,
        title: "",
        subtitle: "",
        description: "",
        content: {}
      });
    }
  };

  const saveContent = async () => {
    if (!selectedPage) return;
    setSaving(true);
    try {
      const existing = siteContent.find(c => c.page_key === selectedPage);
      
      const contentData = {
        title: editingContent.title || null,
        subtitle: editingContent.subtitle || null,
        description: editingContent.description || null,
        content: (editingContent.content || {}) as Json
      };
      
      if (existing) {
        const { error } = await supabase
          .from("site_content")
          .update(contentData)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_content")
          .insert([{
            page_key: selectedPage,
            ...contentData
          }]);
        if (error) throw error;
      }

      toast({ title: "تم الحفظ", description: "تم حفظ المحتوى بنجاح" });
      fetchContent();
    } catch (error) {
      console.error("Error saving content:", error);
      toast({ title: "خطأ", description: "فشل في حفظ المحتوى", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop() || 'file';
      const filePath = `${user.id}/${Date.now()}_file.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("platform-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("files")
        .insert({
          name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
          is_public: false
        });

      if (dbError) throw dbError;

      toast({ title: "تم الرفع", description: "تم رفع الملف بنجاح" });
      fetchFiles();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({ title: "خطأ", description: "فشل في رفع الملف", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string, filePath: string) => {
    try {
      await supabase.storage.from("platform-files").remove([filePath]);
      await supabase.from("files").delete().eq("id", fileId);
      toast({ title: "تم الحذف", description: "تم حذف الملف بنجاح" });
      fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({ title: "خطأ", description: "فشل في حذف الملف", variant: "destructive" });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "غير معروف";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  // Video Content Functions
  const fetchVideoContent = async () => {
    try {
      const { data } = await supabase
        .from("site_content")
        .select("*")
        .eq("page_key", "home_video")
        .maybeSingle();

      if (data?.content && typeof data.content === 'object') {
        const content = data.content as { 
          video_url?: string; 
          thumbnail_url?: string; 
          is_direct_video?: boolean;
          title?: string;
          description?: string;
          stats?: typeof videoStats;
          views_count?: number;
        };
        setVideoUrl(content.video_url || "");
        setVideoThumbnail(content.thumbnail_url || "");
        setIsDirectVideo(content.is_direct_video || false);
        if (content.title) setVideoTitle(content.title);
        if (content.description) setVideoDescription(content.description);
        if (content.stats) setVideoStats(content.stats);
        if (content.views_count !== undefined) setVideoViewsCount(content.views_count);
      }
    } catch (error) {
      console.error("Error fetching video content:", error);
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("video/")) {
      toast({ title: "خطأ", description: "يرجى اختيار ملف فيديو صالح", variant: "destructive" });
      return;
    }

    // Check file size (max 500MB for compression)
    if (file.size > 500 * 1024 * 1024) {
      toast({ title: "خطأ", description: "حجم الفيديو يجب أن يكون أقل من 500 ميجابايت", variant: "destructive" });
      return;
    }

    setUploadingVideo(true);
    setCompressionProgress(null);
    
    try {
      let fileToUpload = file;
      
      // Compress video if larger than 10MB
      if (shouldCompressVideo(file)) {
        toast({ title: "ضغط الفيديو", description: "جاري ضغط الفيديو لتقليل الحجم..." });
        
        try {
          fileToUpload = await compressVideo(file, {
            quality: compressionQuality,
            onProgress: (progress) => setCompressionProgress(progress)
          });
          
          const originalSize = (file.size / (1024 * 1024)).toFixed(1);
          const compressedSize = (fileToUpload.size / (1024 * 1024)).toFixed(1);
          toast({ 
            title: "تم الضغط", 
            description: `تم ضغط الفيديو من ${originalSize}MB إلى ${compressedSize}MB` 
          });
        } catch (compressionError) {
          console.warn("Compression failed, uploading original:", compressionError);
          toast({ 
            title: "تحذير", 
            description: "تعذر ضغط الفيديو، سيتم رفعه بالحجم الأصلي", 
            variant: "destructive" 
          });
          fileToUpload = file;
        }
      }
      
      setCompressionProgress({ progress: 100, message: "جاري رفع الفيديو..." });
      
      // Generate safe filename
      const filePath = `videos/${Date.now()}_video.mp4`;
      
      const { error: uploadError } = await supabase.storage
        .from("platform-files")
        .upload(filePath, fileToUpload);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("platform-files")
        .getPublicUrl(filePath);

      setVideoUrl(publicUrl.publicUrl);
      setIsDirectVideo(true);
      
      toast({ title: "تم الرفع", description: "تم رفع الفيديو بنجاح" });
    } catch (error) {
      console.error("Error uploading video:", error);
      toast({ title: "خطأ", description: "فشل في رفع الفيديو", variant: "destructive" });
    } finally {
      setUploadingVideo(false);
      setCompressionProgress(null);
    }
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "خطأ", description: "يرجى اختيار صورة صالحة", variant: "destructive" });
      return;
    }

    setUploadingVideo(true);
    try {
      // Generate safe filename with extension only (no Arabic characters)
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `thumbnails/${Date.now()}_thumbnail.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("platform-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("platform-files")
        .getPublicUrl(filePath);

      setVideoThumbnail(publicUrl.publicUrl);
      
      toast({ title: "تم الرفع", description: "تم رفع الصورة المصغرة بنجاح" });
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      toast({ title: "خطأ", description: "فشل في رفع الصورة", variant: "destructive" });
    } finally {
      setUploadingVideo(false);
    }
  };

  const saveVideoContent = async () => {
    setSaving(true);
    try {
      const contentData = {
        video_url: videoUrl,
        thumbnail_url: videoThumbnail,
        is_direct_video: isDirectVideo,
        title: videoTitle,
        description: videoDescription,
        stats: videoStats,
        views_count: videoViewsCount
      };

      const { data: existing } = await supabase
        .from("site_content")
        .select("id")
        .eq("page_key", "home_video")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("site_content")
          .update({ content: contentData as unknown as Json })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("site_content")
          .insert({
            page_key: "home_video",
            title: "فيديو الصفحة الرئيسية",
            content: contentData as unknown as Json
          });
      }

      toast({ title: "تم الحفظ", description: "تم حفظ إعدادات الفيديو بنجاح" });
    } catch (error) {
      console.error("Error saving video content:", error);
      toast({ title: "خطأ", description: "فشل في حفظ إعدادات الفيديو", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Hero Content Functions
  const fetchHeroContent = async () => {
    try {
      const { data } = await supabase
        .from("site_content")
        .select("*")
        .eq("page_key", "home_hero")
        .maybeSingle();

      if (data?.content && typeof data.content === 'object') {
        const content = data.content as typeof heroContent;
        setHeroContent(prev => ({ ...prev, ...content }));
      }
    } catch (error) {
      console.error("Error fetching hero content:", error);
    }
  };

  const saveHeroContent = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("site_content")
        .select("id")
        .eq("page_key", "home_hero")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("site_content")
          .update({ content: heroContent as unknown as Json })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("site_content")
          .insert({
            page_key: "home_hero",
            title: "قسم Hero",
            content: heroContent as unknown as Json
          });
      }

      toast({ title: "تم الحفظ", description: "تم حفظ محتوى Hero بنجاح" });
    } catch (error) {
      console.error("Error saving hero content:", error);
      toast({ title: "خطأ", description: "فشل في حفظ المحتوى", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Features Content Functions
  const fetchFeaturesContent = async () => {
    try {
      const { data } = await supabase
        .from("site_content")
        .select("*")
        .eq("page_key", "home_features")
        .maybeSingle();

      if (data?.content && typeof data.content === 'object') {
        const content = data.content as typeof featuresContent;
        setFeaturesContent(prev => ({ ...prev, ...content }));
      }
    } catch (error) {
      console.error("Error fetching features content:", error);
    }
  };

  const saveFeaturesContent = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("site_content")
        .select("id")
        .eq("page_key", "home_features")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("site_content")
          .update({ content: featuresContent as unknown as Json })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("site_content")
          .insert({
            page_key: "home_features",
            title: "قسم المميزات",
            content: featuresContent as unknown as Json
          });
      }

      toast({ title: "تم الحفظ", description: "تم حفظ محتوى المميزات بنجاح" });
    } catch (error) {
      console.error("Error saving features content:", error);
      toast({ title: "خطأ", description: "فشل في حفظ المحتوى", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateFeature = (index: number, field: 'title' | 'description', value: string) => {
    setFeaturesContent(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? { ...f, [field]: value } : f)
    }));
  };

  // Services Content Functions
  const fetchServicesContent = async () => {
    try {
      const { data } = await supabase
        .from("site_content")
        .select("*")
        .eq("page_key", "home_services")
        .maybeSingle();

      if (data?.content && typeof data.content === 'object') {
        const content = data.content as typeof servicesContent;
        setServicesContent(prev => ({ ...prev, ...content }));
      }
    } catch (error) {
      console.error("Error fetching services content:", error);
    }
  };

  const saveServicesContent = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("site_content")
        .select("id")
        .eq("page_key", "home_services")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("site_content")
          .update({ content: servicesContent as unknown as Json })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("site_content")
          .insert({
            page_key: "home_services",
            title: "قسم الخدمات",
            content: servicesContent as unknown as Json
          });
      }

      toast({ title: "تم الحفظ", description: "تم حفظ محتوى الخدمات بنجاح" });
    } catch (error) {
      console.error("Error saving services content:", error);
      toast({ title: "خطأ", description: "فشل في حفظ المحتوى", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateService = (index: number, field: 'title' | 'description', value: string) => {
    setServicesContent(prev => ({
      ...prev,
      services: prev.services.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  // CTA Content Functions
  const fetchCtaContent = async () => {
    try {
      const { data } = await supabase
        .from("site_content")
        .select("*")
        .eq("page_key", "home_cta")
        .maybeSingle();

      if (data?.content && typeof data.content === 'object') {
        const content = data.content as typeof ctaContent;
        setCtaContent(prev => ({ ...prev, ...content }));
      }
    } catch (error) {
      console.error("Error fetching CTA content:", error);
    }
  };

  const saveCtaContent = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("site_content")
        .select("id")
        .eq("page_key", "home_cta")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("site_content")
          .update({ content: ctaContent as unknown as Json })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("site_content")
          .insert({
            page_key: "home_cta",
            title: "قسم CTA",
            content: ctaContent as unknown as Json
          });
      }

      toast({ title: "تم الحفظ", description: "تم حفظ محتوى CTA بنجاح" });
    } catch (error) {
      console.error("Error saving CTA content:", error);
      toast({ title: "خطأ", description: "فشل في حفظ المحتوى", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Footer Content Functions
  const fetchFooterContent = async () => {
    try {
      const { data } = await supabase
        .from("site_content")
        .select("*")
        .eq("page_key", "footer")
        .maybeSingle();

      if (data?.content && typeof data.content === 'object') {
        const content = data.content as typeof footerContent;
        setFooterContent(prev => ({ ...prev, ...content }));
      }
    } catch (error) {
      console.error("Error fetching footer content:", error);
    }
  };

  const saveFooterContent = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("site_content")
        .select("id")
        .eq("page_key", "footer")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("site_content")
          .update({ content: footerContent as unknown as Json })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("site_content")
          .insert({
            page_key: "footer",
            title: "الفوتر",
            content: footerContent as unknown as Json
          });
      }

      toast({ title: "تم الحفظ", description: "تم حفظ محتوى الفوتر بنجاح" });
    } catch (error) {
      console.error("Error saving footer content:", error);
      toast({ title: "خطأ", description: "فشل في حفظ المحتوى", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Pricing Content Functions
  const fetchPricingContent = async () => {
    try {
      const { data } = await supabase
        .from("site_content")
        .select("*")
        .eq("page_key", "pricing_page")
        .maybeSingle();

      if (data?.content && typeof data.content === 'object') {
        const content = data.content as typeof pricingContent;
        setPricingContent(prev => ({ ...prev, ...content }));
      }
    } catch (error) {
      console.error("Error fetching pricing content:", error);
    }
  };

  const savePricingContent = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("site_content")
        .select("id")
        .eq("page_key", "pricing_page")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("site_content")
          .update({ content: pricingContent as unknown as Json })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("site_content")
          .insert({
            page_key: "pricing_page",
            title: "صفحة الأسعار",
            content: pricingContent as unknown as Json
          });
      }

      toast({ title: "تم الحفظ", description: "تم حفظ صفحة الأسعار بنجاح" });
    } catch (error) {
      console.error("Error saving pricing content:", error);
      toast({ title: "خطأ", description: "فشل في حفظ المحتوى", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-golden" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                لوحة تحكم <span className="text-gradient-golden">الإدارة الكاملة</span>
              </h1>
              <p className="text-muted-foreground">إدارة المحتوى، الملفات، والإعدادات</p>
            </div>
            <div className="flex gap-2">
              <Link to="/admin">
                <Button variant="outline" className="border-golden/30">
                  <Users className="w-4 h-4 ml-2" />
                  إدارة المستخدمين
                </Button>
              </Link>
              <Link to="/admin/analytics">
                <Button variant="outline" className="border-golden/30">
                  <BarChart3 className="w-4 h-4 ml-2" />
                  الإحصائيات
                </Button>
              </Link>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="h-auto flex-wrap gap-1 border border-border/60 bg-muted/60 p-1 backdrop-blur-sm">
              <TabsTrigger value="services" className="data-[state=active]:bg-golden/20">
                <Briefcase className="w-4 h-4 ml-2" />
                الخدمات
              </TabsTrigger>
              <TabsTrigger value="content" className="data-[state=active]:bg-golden/20">
                <FileText className="w-4 h-4 ml-2" />
                إدارة المحتوى
              </TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-golden/20">
                <Upload className="w-4 h-4 ml-2" />
                إدارة الملفات
              </TabsTrigger>
              <TabsTrigger value="hero" className="data-[state=active]:bg-golden/20">
                <Sparkles className="w-4 h-4 ml-2" />
                قسم Hero
              </TabsTrigger>
              <TabsTrigger value="features" className="data-[state=active]:bg-golden/20">
                <Star className="w-4 h-4 ml-2" />
                قسم المميزات
              </TabsTrigger>
              <TabsTrigger value="services-edit" className="data-[state=active]:bg-golden/20">
                <Layers className="w-4 h-4 ml-2" />
                قسم الخدمات
              </TabsTrigger>
              <TabsTrigger value="cta" className="data-[state=active]:bg-golden/20">
                <Target className="w-4 h-4 ml-2" />
                قسم CTA
              </TabsTrigger>
              <TabsTrigger value="video" className="data-[state=active]:bg-golden/20">
                <Video className="w-4 h-4 ml-2" />
                فيديو الرئيسية
              </TabsTrigger>
              <TabsTrigger value="footer" className="data-[state=active]:bg-golden/20">
                <LayoutGrid className="w-4 h-4 ml-2" />
                الفوتر
              </TabsTrigger>
              <TabsTrigger value="pricing" className="data-[state=active]:bg-golden/20">
                <DollarSign className="w-4 h-4 ml-2" />
                أسعار الاشتراكات
              </TabsTrigger>
              <TabsTrigger value="messages" className="data-[state=active]:bg-golden/20">
                <MessageSquare className="w-4 h-4 ml-2" />
                الرسائل
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-golden/20">
                <Settings className="w-4 h-4 ml-2" />
                الإعدادات
              </TabsTrigger>
              <TabsTrigger value="sections" className="data-[state=active]:bg-golden/20 bg-primary/10">
                <ToggleLeft className="w-4 h-4 ml-2" />
                تفعيل/إلغاء الأقسام
              </TabsTrigger>
              <TabsTrigger value="trials" className="data-[state=active]:bg-golden/20">
                <Gift className="w-4 h-4 ml-2" />
                التجارب المجانية
              </TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-golden/20 bg-red-500/10">
                <Shield className="w-4 h-4 ml-2" />
                الأمان
              </TabsTrigger>
            </TabsList>

            {/* Video Management Tab */}
            <TabsContent value="video">
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    إدارة فيديو الصفحة الرئيسية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Title & Description */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-base font-semibold">عنوان القسم</Label>
                      <Input
                        value={videoTitle}
                        onChange={(e) => setVideoTitle(e.target.value)}
                        placeholder="تعرف على محامي كوم"
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">وصف القسم</Label>
                      <Input
                        value={videoDescription}
                        onChange={(e) => setVideoDescription(e.target.value)}
                        placeholder="شاهد كيف نُحدث ثورة في عالم الخدمات القانونية"
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                  </div>

                  {/* Stats Section */}
                  <div className="p-4 rounded-lg border border-golden/20 bg-navy-800/30">
                    <Label className="text-base font-semibold mb-4 block">إحصائيات القسم</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">الرقم الأول</Label>
                        <Input
                          value={videoStats.clients}
                          onChange={(e) => setVideoStats({...videoStats, clients: e.target.value})}
                          className="bg-navy-800/50 border-golden/30"
                        />
                        <Input
                          value={videoStats.clientsLabel}
                          onChange={(e) => setVideoStats({...videoStats, clientsLabel: e.target.value})}
                          placeholder="الوصف"
                          className="bg-navy-800/50 border-golden/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">الرقم الثاني</Label>
                        <Input
                          value={videoStats.lawyers}
                          onChange={(e) => setVideoStats({...videoStats, lawyers: e.target.value})}
                          className="bg-navy-800/50 border-golden/30"
                        />
                        <Input
                          value={videoStats.lawyersLabel}
                          onChange={(e) => setVideoStats({...videoStats, lawyersLabel: e.target.value})}
                          placeholder="الوصف"
                          className="bg-navy-800/50 border-golden/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">الرقم الثالث</Label>
                        <Input
                          value={videoStats.support}
                          onChange={(e) => setVideoStats({...videoStats, support: e.target.value})}
                          className="bg-navy-800/50 border-golden/30"
                        />
                        <Input
                          value={videoStats.supportLabel}
                          onChange={(e) => setVideoStats({...videoStats, supportLabel: e.target.value})}
                          placeholder="الوصف"
                          className="bg-navy-800/50 border-golden/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm flex items-center gap-2">
                          <Eye className="w-4 h-4 text-golden" />
                          عداد المشاهدات
                        </Label>
                        <Input
                          type="number"
                          value={videoViewsCount}
                          onChange={(e) => setVideoViewsCount(parseInt(e.target.value) || 0)}
                          className="bg-navy-800/50 border-golden/30"
                          min="0"
                        />
                        <p className="text-xs text-muted-foreground">يمكنك تعديل عدد المشاهدات يدوياً</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Video Upload/URL Section */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-semibold">رابط الفيديو (YouTube أو رابط مباشر)</Label>
                        <Input
                          value={videoUrl}
                          onChange={(e) => {
                            setVideoUrl(e.target.value);
                            setIsDirectVideo(false);
                          }}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="bg-navy-800/50 border-golden/30 mt-2"
                        />
                      </div>

                      <div className="text-center text-muted-foreground">أو</div>

                      <div>
                        <Label className="text-base font-semibold">رفع ملف فيديو</Label>
                        
                        {/* Quality Selection */}
                        <div className="mt-3 mb-3">
                          <Label className="text-sm text-muted-foreground mb-2 block">جودة الضغط:</Label>
                          <div className="flex gap-2">
                            {(['high', 'medium', 'low'] as CompressionQuality[]).map((q) => (
                              <Button
                                key={q}
                                type="button"
                                variant={compressionQuality === q ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCompressionQuality(q)}
                                className={compressionQuality === q ? 'bg-primary' : 'border-golden/30'}
                              >
                                {q === 'high' ? 'عالية' : q === 'medium' ? 'متوسطة' : 'منخفضة'}
                              </Button>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {compressionQuality === 'high' && 'جودة عالية (1080p) - ضغط أقل، حجم أكبر'}
                            {compressionQuality === 'medium' && 'جودة متوسطة (720p) - توازن بين الجودة والحجم (موصى به)'}
                            {compressionQuality === 'low' && 'جودة منخفضة (480p) - ضغط عالي، حجم صغير جداً'}
                          </p>
                        </div>
                        
                        <div className="mt-2">
                          <label className="cursor-pointer">
                            <Input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={handleVideoUpload}
                              disabled={uploadingVideo}
                            />
                            <Button asChild variant="outline" className="w-full border-golden/30" disabled={uploadingVideo}>
                              <span>
                                {uploadingVideo ? (
                                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                                ) : (
                                  <Upload className="w-4 h-4 ml-2" />
                                )}
                                اختيار ملف فيديو (حتى 500 ميجابايت)
                              </span>
                            </Button>
                          </label>
                          
                          {/* Compression Progress */}
                          {compressionProgress && (
                            <div className="mt-3 space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{compressionProgress.message}</span>
                                <span className="text-primary font-medium">{compressionProgress.progress}%</span>
                              </div>
                              <div className="w-full bg-navy-800 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-primary to-golden h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${compressionProgress.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          <p className="text-xs text-muted-foreground mt-2">
                            ✓ ضغط سريع باستخدام preset ultrafast
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label className="text-base font-semibold">الصورة المصغرة (Thumbnail)</Label>
                        <div className="mt-2">
                          <label className="cursor-pointer">
                            <Input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleThumbnailUpload}
                              disabled={uploadingVideo}
                            />
                            <Button asChild variant="outline" className="w-full border-golden/30" disabled={uploadingVideo}>
                              <span>
                                {uploadingVideo ? (
                                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                                ) : (
                                  <ImageIcon className="w-4 h-4 ml-2" />
                                )}
                                اختيار صورة مصغرة
                              </span>
                            </Button>
                          </label>
                        </div>
                        {videoThumbnail && (
                          <div className="mt-3">
                            <img 
                              src={videoThumbnail} 
                              alt="معاينة الصورة المصغرة"
                              className="w-full h-32 object-cover rounded-lg border border-golden/20"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Preview Section */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">معاينة الفيديو</Label>
                      <div className="aspect-video rounded-lg overflow-hidden border border-golden/20 bg-navy-800/50">
                        {videoUrl ? (
                          isDirectVideo ? (
                            <video
                              src={videoUrl}
                              controls
                              className="w-full h-full"
                            />
                          ) : (
                            <iframe
                              src={
                                videoUrl.includes("youtube.com/watch")
                                  ? `https://www.youtube.com/embed/${videoUrl.split("v=")[1]?.split("&")[0]}`
                                  : videoUrl.includes("youtu.be/")
                                  ? `https://www.youtube.com/embed/${videoUrl.split("youtu.be/")[1]?.split("?")[0]}`
                                  : videoUrl
                              }
                              title="معاينة الفيديو"
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                              <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              <p>لم يتم تحديد فيديو</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={saveVideoContent} 
                    disabled={saving} 
                    className="bg-golden hover:bg-golden/90"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                    حفظ إعدادات الفيديو
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Footer Section Tab */}
            <TabsContent value="footer">
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5" />
                    تحرير الفوتر
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Description */}
                  <div>
                    <Label className="text-base font-semibold">وصف المنصة</Label>
                    <Textarea
                      value={footerContent.description}
                      onChange={(e) => setFooterContent({...footerContent, description: e.target.value})}
                      placeholder="وصف المنصة في الفوتر"
                      className="bg-navy-800/50 border-golden/30 mt-2"
                      rows={3}
                    />
                  </div>

                  {/* Contact Info */}
                  <div className="p-4 rounded-lg border border-golden/20 bg-navy-800/30">
                    <Label className="text-base font-semibold mb-4 block">معلومات التواصل</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm">البريد الإلكتروني</Label>
                        <Input
                          value={footerContent.email}
                          onChange={(e) => setFooterContent({...footerContent, email: e.target.value})}
                          placeholder="info@example.com"
                          className="bg-navy-800/50 border-golden/30 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">رقم الهاتف</Label>
                        <Input
                          value={footerContent.phone}
                          onChange={(e) => setFooterContent({...footerContent, phone: e.target.value})}
                          placeholder="+966 xx xxx xxxx"
                          className="bg-navy-800/50 border-golden/30 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">العنوان</Label>
                        <Input
                          value={footerContent.address}
                          onChange={(e) => setFooterContent({...footerContent, address: e.target.value})}
                          placeholder="المملكة العربية السعودية"
                          className="bg-navy-800/50 border-golden/30 mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Copyright & Tagline */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-base font-semibold">نص حقوق النشر</Label>
                      <Input
                        value={footerContent.copyright}
                        onChange={(e) => setFooterContent({...footerContent, copyright: e.target.value})}
                        placeholder="محامي كوم. جميع الحقوق محفوظة."
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">الشعار التذييلي</Label>
                      <Input
                        value={footerContent.tagline}
                        onChange={(e) => setFooterContent({...footerContent, tagline: e.target.value})}
                        placeholder="مدعوم بتقنيات الذكاء الاصطناعي"
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="p-4 rounded-lg border border-golden/20 bg-navy-800/30">
                    <Label className="text-base font-semibold mb-4 block">روابط التواصل الاجتماعي</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm">Facebook</Label>
                        <Input
                          value={footerContent.facebookUrl}
                          onChange={(e) => setFooterContent({...footerContent, facebookUrl: e.target.value})}
                          placeholder="https://facebook.com/..."
                          className="bg-navy-800/50 border-golden/30 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Twitter</Label>
                        <Input
                          value={footerContent.twitterUrl}
                          onChange={(e) => setFooterContent({...footerContent, twitterUrl: e.target.value})}
                          placeholder="https://twitter.com/..."
                          className="bg-navy-800/50 border-golden/30 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Instagram</Label>
                        <Input
                          value={footerContent.instagramUrl}
                          onChange={(e) => setFooterContent({...footerContent, instagramUrl: e.target.value})}
                          placeholder="https://instagram.com/..."
                          className="bg-navy-800/50 border-golden/30 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">LinkedIn</Label>
                        <Input
                          value={footerContent.linkedinUrl}
                          onChange={(e) => setFooterContent({...footerContent, linkedinUrl: e.target.value})}
                          placeholder="https://linkedin.com/..."
                          className="bg-navy-800/50 border-golden/30 mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={saveFooterContent} 
                    disabled={saving} 
                    className="bg-golden hover:bg-golden/90"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                    حفظ محتوى الفوتر
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hero Section Tab */}
            <TabsContent value="hero">
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    تحرير قسم Hero
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Badge & Titles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-base font-semibold">شارة القسم</Label>
                      <Input
                        value={heroContent.badge}
                        onChange={(e) => setHeroContent({...heroContent, badge: e.target.value})}
                        placeholder="مدعوم بالذكاء الاصطناعي"
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">السطر الأول من العنوان</Label>
                      <Input
                        value={heroContent.titleLine1}
                        onChange={(e) => setHeroContent({...heroContent, titleLine1: e.target.value})}
                        placeholder="استشاراتك القانونية"
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-base font-semibold">السطر الثاني (ذهبي)</Label>
                      <Input
                        value={heroContent.titleLine2}
                        onChange={(e) => setHeroContent({...heroContent, titleLine2: e.target.value})}
                        placeholder="بذكاء اصطناعي متقدم"
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">الوصف</Label>
                      <Textarea
                        value={heroContent.description}
                        onChange={(e) => setHeroContent({...heroContent, description: e.target.value})}
                        placeholder="محامي كوم تجمع نخبة من المحامين..."
                        className="bg-navy-800/50 border-golden/30 mt-2"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="p-4 rounded-lg border border-golden/20 bg-navy-800/30">
                    <Label className="text-base font-semibold mb-4 block">أزرار الإجراء</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">الزر الرئيسي</Label>
                        <Input
                          value={heroContent.ctaButton1}
                          onChange={(e) => setHeroContent({...heroContent, ctaButton1: e.target.value})}
                          className="bg-navy-800/50 border-golden/30 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">الزر الثانوي</Label>
                        <Input
                          value={heroContent.ctaButton2}
                          onChange={(e) => setHeroContent({...heroContent, ctaButton2: e.target.value})}
                          className="bg-navy-800/50 border-golden/30 mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stats Section */}
                  <div className="p-4 rounded-lg border border-golden/20 bg-navy-800/30">
                    <Label className="text-base font-semibold mb-4 block">الإحصائيات</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">الإحصائية الأولى</Label>
                        <Input
                          value={heroContent.stat1Value}
                          onChange={(e) => setHeroContent({...heroContent, stat1Value: e.target.value})}
                          placeholder="+500"
                          className="bg-navy-800/50 border-golden/30"
                        />
                        <Input
                          value={heroContent.stat1Label}
                          onChange={(e) => setHeroContent({...heroContent, stat1Label: e.target.value})}
                          placeholder="محامي معتمد"
                          className="bg-navy-800/50 border-golden/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">الإحصائية الثانية</Label>
                        <Input
                          value={heroContent.stat2Value}
                          onChange={(e) => setHeroContent({...heroContent, stat2Value: e.target.value})}
                          placeholder="+10K"
                          className="bg-navy-800/50 border-golden/30"
                        />
                        <Input
                          value={heroContent.stat2Label}
                          onChange={(e) => setHeroContent({...heroContent, stat2Label: e.target.value})}
                          placeholder="استشارة منجزة"
                          className="bg-navy-800/50 border-golden/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">الإحصائية الثالثة</Label>
                        <Input
                          value={heroContent.stat3Value}
                          onChange={(e) => setHeroContent({...heroContent, stat3Value: e.target.value})}
                          placeholder="98%"
                          className="bg-navy-800/50 border-golden/30"
                        />
                        <Input
                          value={heroContent.stat3Label}
                          onChange={(e) => setHeroContent({...heroContent, stat3Label: e.target.value})}
                          placeholder="نسبة الرضا"
                          className="bg-navy-800/50 border-golden/30"
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={saveHeroContent} 
                    disabled={saving} 
                    className="bg-golden hover:bg-golden/90"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                    حفظ محتوى Hero
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Features Section Tab */}
            <TabsContent value="features">
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    تحرير قسم المميزات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Section Header */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-base font-semibold">شارة القسم</Label>
                      <Input
                        value={featuresContent.badge}
                        onChange={(e) => setFeaturesContent({...featuresContent, badge: e.target.value})}
                        placeholder="لماذا نحن؟"
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">العنوان الرئيسي</Label>
                      <Input
                        value={featuresContent.title}
                        onChange={(e) => setFeaturesContent({...featuresContent, title: e.target.value})}
                        placeholder="مميزات تجعلنا الخيار الأمثل"
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">الوصف</Label>
                      <Input
                        value={featuresContent.description}
                        onChange={(e) => setFeaturesContent({...featuresContent, description: e.target.value})}
                        placeholder="نجمع بين الخبرة القانونية..."
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="p-4 rounded-lg border border-golden/20 bg-navy-800/30">
                    <Label className="text-base font-semibold mb-4 block">المميزات (6 عناصر)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {featuresContent.features.map((feature, index) => (
                        <div key={index} className="p-4 rounded-lg border border-golden/10 bg-navy-800/20 space-y-2">
                          <div className="flex items-center gap-2 text-golden text-sm font-medium">
                            <span className="w-6 h-6 rounded bg-golden/20 flex items-center justify-center text-xs">{index + 1}</span>
                            الميزة {index + 1}
                          </div>
                          <Input
                            value={feature.title}
                            onChange={(e) => updateFeature(index, 'title', e.target.value)}
                            placeholder="عنوان الميزة"
                            className="bg-navy-800/50 border-golden/30"
                          />
                          <Input
                            value={feature.description}
                            onChange={(e) => updateFeature(index, 'description', e.target.value)}
                            placeholder="وصف الميزة"
                            className="bg-navy-800/50 border-golden/30"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={saveFeaturesContent} 
                    disabled={saving} 
                    className="bg-golden hover:bg-golden/90"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                    حفظ محتوى المميزات
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Services Section Edit Tab */}
            <TabsContent value="services-edit">
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    تحرير قسم الخدمات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Section Header */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-base font-semibold">شارة القسم</Label>
                      <Input
                        value={servicesContent.badge}
                        onChange={(e) => setServicesContent({...servicesContent, badge: e.target.value})}
                        placeholder="خدماتنا المتميزة"
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">العنوان الرئيسي</Label>
                      <Input
                        value={servicesContent.title}
                        onChange={(e) => setServicesContent({...servicesContent, title: e.target.value})}
                        placeholder="حلول قانونية شاملة بتقنية ذكية"
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">الوصف</Label>
                      <Input
                        value={servicesContent.description}
                        onChange={(e) => setServicesContent({...servicesContent, description: e.target.value})}
                        placeholder="نقدم مجموعة متكاملة من الخدمات..."
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                  </div>

                  {/* Services List */}
                  <div className="p-4 rounded-lg border border-golden/20 bg-navy-800/30">
                    <Label className="text-base font-semibold mb-4 block">الخدمات (6 عناصر)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {servicesContent.services.map((service, index) => (
                        <div key={index} className="p-4 rounded-lg border border-golden/10 bg-navy-800/20 space-y-2">
                          <div className="flex items-center gap-2 text-golden text-sm font-medium">
                            <span className="w-6 h-6 rounded bg-golden/20 flex items-center justify-center text-xs">{index + 1}</span>
                            الخدمة {index + 1}
                          </div>
                          <Input
                            value={service.title}
                            onChange={(e) => updateService(index, 'title', e.target.value)}
                            placeholder="عنوان الخدمة"
                            className="bg-navy-800/50 border-golden/30"
                          />
                          <Textarea
                            value={service.description}
                            onChange={(e) => updateService(index, 'description', e.target.value)}
                            placeholder="وصف الخدمة"
                            className="bg-navy-800/50 border-golden/30"
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={saveServicesContent} 
                    disabled={saving} 
                    className="bg-golden hover:bg-golden/90"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                    حفظ محتوى الخدمات
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* CTA Section Tab */}
            <TabsContent value="cta">
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    تحرير قسم CTA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Title & Description */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-base font-semibold">العنوان الرئيسي</Label>
                      <Input
                        value={ctaContent.title}
                        onChange={(e) => setCtaContent({...ctaContent, title: e.target.value})}
                        placeholder="هل لديك استفسار قانوني؟"
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">الوصف</Label>
                      <Textarea
                        value={ctaContent.description}
                        onChange={(e) => setCtaContent({...ctaContent, description: e.target.value})}
                        placeholder="ابدأ محادثتك الآن..."
                        className="bg-navy-800/50 border-golden/30 mt-2"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="p-4 rounded-lg border border-golden/20 bg-navy-800/30">
                    <Label className="text-base font-semibold mb-4 block">أزرار الإجراء</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">الزر الرئيسي</Label>
                        <Input
                          value={ctaContent.ctaButton1}
                          onChange={(e) => setCtaContent({...ctaContent, ctaButton1: e.target.value})}
                          className="bg-navy-800/50 border-golden/30 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">الزر الثانوي</Label>
                        <Input
                          value={ctaContent.ctaButton2}
                          onChange={(e) => setCtaContent({...ctaContent, ctaButton2: e.target.value})}
                          className="bg-navy-800/50 border-golden/30 mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Trust Badges */}
                  <div className="p-4 rounded-lg border border-golden/20 bg-navy-800/30">
                    <Label className="text-base font-semibold mb-4 block">شارات الثقة</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm">الشارة الأولى</Label>
                        <Input
                          value={ctaContent.badge1}
                          onChange={(e) => setCtaContent({...ctaContent, badge1: e.target.value})}
                          className="bg-navy-800/50 border-golden/30 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">الشارة الثانية</Label>
                        <Input
                          value={ctaContent.badge2}
                          onChange={(e) => setCtaContent({...ctaContent, badge2: e.target.value})}
                          className="bg-navy-800/50 border-golden/30 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">الشارة الثالثة</Label>
                        <Input
                          value={ctaContent.badge3}
                          onChange={(e) => setCtaContent({...ctaContent, badge3: e.target.value})}
                          className="bg-navy-800/50 border-golden/30 mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={saveCtaContent} 
                    disabled={saving} 
                    className="bg-golden hover:bg-golden/90"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                    حفظ محتوى CTA
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Services Tab - Admin can access all services */}
            <TabsContent value="services">
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden">جميع خدمات المنصة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* الاستشارات القانونية */}
                    <Card className="group border-golden/20 bg-card/80 transition-all hover:border-golden/40 hover:bg-muted/40">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <MessageCircle className="w-6 h-6 text-white" />
                          </div>
                          <Link to="/consultation">
                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">الاستشارات القانونية</h3>
                        <p className="text-sm text-muted-foreground mb-4">استشارات قانونية ذكية مدعومة بالذكاء الاصطناعي</p>
                        <Link to="/consultation">
                          <Button className="w-full bg-blue-500 hover:bg-blue-600">
                            تجربة الخدمة
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>

                    {/* التنبؤ بالأحكام */}
                    <Card className="group border-golden/20 bg-card/80 transition-all hover:border-golden/40 hover:bg-muted/40">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                            <Brain className="w-6 h-6 text-white" />
                          </div>
                          <Link to="/predictions">
                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">التنبؤ بالأحكام</h3>
                        <p className="text-sm text-muted-foreground mb-4">تحليل القضايا والتنبؤ بالأحكام المحتملة</p>
                        <Link to="/predictions">
                          <Button className="w-full bg-purple-500 hover:bg-purple-600">
                            تجربة الخدمة
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>

                    {/* العقود */}
                    <Card className="group border-golden/20 bg-card/80 transition-all hover:border-golden/40 hover:bg-muted/40">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                            <FileCheck className="w-6 h-6 text-white" />
                          </div>
                          <Link to="/contracts">
                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">العقود الذكية</h3>
                        <p className="text-sm text-muted-foreground mb-4">إنشاء وتحليل ومراجعة العقود</p>
                        <Link to="/contracts">
                          <Button className="w-full bg-green-500 hover:bg-green-600">
                            تجربة الخدمة
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>

                    {/* المحامين */}
                    <Card className="group border-golden/20 bg-card/80 transition-all hover:border-golden/40 hover:bg-muted/40">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                            <Scale className="w-6 h-6 text-white" />
                          </div>
                          <Link to="/lawyers">
                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">مركز المحامين</h3>
                        <p className="text-sm text-muted-foreground mb-4">التواصل مع محامين متخصصين</p>
                        <Link to="/lawyers">
                          <Button className="w-full bg-orange-500 hover:bg-orange-600">
                            تجربة الخدمة
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>

                    {/* البحث القانوني */}
                    <Card className="group border-golden/20 bg-card/80 transition-all hover:border-golden/40 hover:bg-muted/40">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                            <Search className="w-6 h-6 text-white" />
                          </div>
                          <Link to="/legal-search">
                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">البحث القانوني</h3>
                        <p className="text-sm text-muted-foreground mb-4">البحث في الأنظمة واللوائح السعودية</p>
                        <Link to="/legal-search">
                          <Button className="w-full bg-cyan-500 hover:bg-cyan-600">
                            تجربة الخدمة
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>

                    {/* الشكاوى */}
                    <Card className="group border-golden/20 bg-card/80 transition-all hover:border-golden/40 hover:bg-muted/40">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                          <Link to="/complaints">
                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">نظام الشكاوى</h3>
                        <p className="text-sm text-muted-foreground mb-4">تحليل وصياغة الشكاوى القانونية</p>
                        <Link to="/complaints">
                          <Button className="w-full bg-red-500 hover:bg-red-600">
                            تجربة الخدمة
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>

                    {/* الرسائل */}
                    <Card className="group border-golden/20 bg-card/80 transition-all hover:border-golden/40 hover:bg-muted/40">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-golden to-yellow-500 flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-white" />
                          </div>
                          <Link to="/messages">
                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">نظام المراسلات</h3>
                        <p className="text-sm text-muted-foreground mb-4">التواصل مع المستخدمين والمحامين</p>
                        <Link to="/messages">
                          <Button className="w-full bg-golden hover:bg-golden/90">
                            تجربة الخدمة
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>

                    {/* لوحة المحامي */}
                    <Card className="group border-golden/20 bg-card/80 transition-all hover:border-golden/40 hover:bg-muted/40">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-white" />
                          </div>
                          <Link to="/lawyer-full-dashboard">
                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">لوحة المحامي</h3>
                        <p className="text-sm text-muted-foreground mb-4">تجربة لوحة تحكم المحامي الكاملة</p>
                        <Link to="/lawyer-full-dashboard">
                          <Button className="w-full bg-indigo-500 hover:bg-indigo-600">
                            تجربة اللوحة
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>

                    {/* لوحة المشترك */}
                    <Card className="group border-golden/20 bg-card/80 transition-all hover:border-golden/40 hover:bg-muted/40">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <Link to="/client-dashboard">
                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">لوحة المشترك</h3>
                        <p className="text-sm text-muted-foreground mb-4">تجربة لوحة تحكم المشترك</p>
                        <Link to="/client-dashboard">
                          <Button className="w-full bg-pink-500 hover:bg-pink-600">
                            تجربة اللوحة
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Management Tab */}
            <TabsContent value="content">
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden">إدارة محتوى الصفحات (CMS)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                      <Label>اختر الصفحة</Label>
                      <Select value={selectedPage} onValueChange={handlePageSelect}>
                        <SelectTrigger className="bg-navy-800/50 border-golden/30">
                          <SelectValue placeholder="اختر صفحة للتعديل" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-golden/30">
                          {pages.map(page => (
                            <SelectItem key={page.key} value={page.key}>
                              {page.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedPage && (
                      <div className="md:col-span-3 space-y-4">
                        <div>
                          <Label>العنوان الرئيسي</Label>
                          <Input
                            value={editingContent.title || ""}
                            onChange={(e) => setEditingContent({...editingContent, title: e.target.value})}
                            className="bg-navy-800/50 border-golden/30"
                            placeholder="أدخل العنوان الرئيسي"
                          />
                        </div>
                        <div>
                          <Label>العنوان الفرعي</Label>
                          <Input
                            value={editingContent.subtitle || ""}
                            onChange={(e) => setEditingContent({...editingContent, subtitle: e.target.value})}
                            className="bg-navy-800/50 border-golden/30"
                            placeholder="أدخل العنوان الفرعي"
                          />
                        </div>
                        <div>
                          <Label>الوصف</Label>
                          <Textarea
                            value={editingContent.description || ""}
                            onChange={(e) => setEditingContent({...editingContent, description: e.target.value})}
                            className="bg-navy-800/50 border-golden/30 min-h-[150px]"
                            placeholder="أدخل الوصف"
                          />
                        </div>
                        <Button onClick={saveContent} disabled={saving} className="bg-golden hover:bg-golden/90">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                          حفظ التغييرات
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Files Management Tab */}
            <TabsContent value="files">
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden flex items-center justify-between">
                    <span>إدارة الملفات</span>
                    <label className="cursor-pointer">
                      <Input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <Button asChild disabled={uploading}>
                        <span>
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Upload className="w-4 h-4 ml-2" />}
                          رفع ملف جديد
                        </span>
                      </Button>
                    </label>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-golden/20">
                        <TableHead className="text-right">اسم الملف</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">الحجم</TableHead>
                        <TableHead className="text-right">تاريخ الرفع</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map(file => (
                        <TableRow key={file.id} className="border-golden/10">
                          <TableCell className="font-medium">{file.name}</TableCell>
                          <TableCell>{file.file_type || "غير معروف"}</TableCell>
                          <TableCell>{formatFileSize(file.file_size)}</TableCell>
                          <TableCell>{new Date(file.created_at).toLocaleDateString('ar-SA')}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" className="text-blue-400">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-green-400">
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-red-400"
                                onClick={() => deleteFile(file.id, file.file_path)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {files.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">لا توجد ملفات مرفوعة</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing">
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden">إدارة صفحة الأسعار</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Page Header */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-base font-semibold">شارة الصفحة</Label>
                      <Input
                        value={pricingContent.badge}
                        onChange={(e) => setPricingContent({...pricingContent, badge: e.target.value})}
                        placeholder="خطط الاشتراك"
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">العنوان الرئيسي</Label>
                      <Input
                        value={pricingContent.title}
                        onChange={(e) => setPricingContent({...pricingContent, title: e.target.value})}
                        placeholder="اختر الخطة المناسبة لك"
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-base font-semibold">الوصف</Label>
                      <Input
                        value={pricingContent.description}
                        onChange={(e) => setPricingContent({...pricingContent, description: e.target.value})}
                        placeholder="خطط مرنة تناسب احتياجاتك"
                        className="bg-navy-800/50 border-golden/30 mt-2"
                      />
                    </div>
                  </div>

                  {/* Plans */}
                  <div className="p-4 rounded-lg border border-golden/20 bg-navy-800/30">
                    <Label className="text-base font-semibold mb-4 block">باقات الاشتراك (3 باقات)</Label>
                    <div className="space-y-6">
                      {pricingContent.plans.map((plan, index) => (
                        <div key={plan.id} className="p-4 rounded-lg border border-golden/10 bg-navy-800/20 space-y-4">
                          <div className="flex items-center gap-2 text-golden text-base font-semibold">
                            <span className="w-8 h-8 rounded bg-golden/20 flex items-center justify-center text-sm">{index + 1}</span>
                            باقة {plan.name}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-sm">اسم الباقة</Label>
                              <Input
                                value={plan.name}
                                onChange={(e) => {
                                  const newPlans = [...pricingContent.plans];
                                  newPlans[index] = {...newPlans[index], name: e.target.value};
                                  setPricingContent({...pricingContent, plans: newPlans});
                                }}
                                className="bg-navy-800/50 border-golden/30 mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">الوصف</Label>
                              <Input
                                value={plan.description}
                                onChange={(e) => {
                                  const newPlans = [...pricingContent.plans];
                                  newPlans[index] = {...newPlans[index], description: e.target.value};
                                  setPricingContent({...pricingContent, plans: newPlans});
                                }}
                                className="bg-navy-800/50 border-golden/30 mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">السعر (ريال/شهر)</Label>
                              <Input
                                type="number"
                                value={plan.monthlyPrice}
                                onChange={(e) => {
                                  const newPlans = [...pricingContent.plans];
                                  newPlans[index] = {...newPlans[index], monthlyPrice: parseInt(e.target.value) || 0};
                                  setPricingContent({...pricingContent, plans: newPlans});
                                }}
                                className="bg-navy-800/50 border-golden/30 mt-1"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm">المميزات (كل ميزة في سطر)</Label>
                            <Textarea
                              value={plan.features.join("\n")}
                              onChange={(e) => {
                                const newPlans = [...pricingContent.plans];
                                newPlans[index] = {...newPlans[index], features: e.target.value.split("\n").filter(f => f.trim())};
                                setPricingContent({...pricingContent, plans: newPlans});
                              }}
                              className="bg-navy-800/50 border-golden/30 mt-1"
                              rows={4}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={savePricingContent} 
                    disabled={saving} 
                    className="bg-golden hover:bg-golden/90"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                    حفظ صفحة الأسعار
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages">
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden">رسائل المنصة</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    سيتم عرض جميع الرسائل هنا
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden">إعدادات المنصة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label>اسم المنصة</Label>
                      <Input defaultValue="محامي كوم" className="bg-navy-800/50 border-golden/30" />
                    </div>
                    <div>
                      <Label>البريد الإلكتروني</Label>
                      <Input defaultValue="info@mohamie.com" className="bg-navy-800/50 border-golden/30" />
                    </div>
                    <div>
                      <Label>رقم الهاتف</Label>
                      <Input defaultValue="+966 XX XXX XXXX" className="bg-navy-800/50 border-golden/30" />
                    </div>
                    <div>
                      <Label>العنوان</Label>
                      <Input defaultValue="المملكة العربية السعودية" className="bg-navy-800/50 border-golden/30" />
                    </div>
                  </div>
                  <Button className="bg-golden hover:bg-golden/90">
                    <Save className="w-4 h-4 ml-2" />
                    حفظ الإعدادات
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sections Management Tab */}
            <TabsContent value="sections">
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden flex items-center gap-2">
                    <ToggleLeft className="w-5 h-5" />
                    تفعيل وإلغاء الأقسام والخدمات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Quick Actions */}
                  <div className="flex gap-4 p-4 rounded-lg bg-navy-800/30 border border-golden/20">
                    <Button 
                      onClick={() => toggleAllSections(true)} 
                      disabled={savingSections}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {savingSections ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <ToggleRight className="w-4 h-4 ml-2" />}
                      تفعيل الكل
                    </Button>
                    <Button 
                      onClick={() => toggleAllSections(false)} 
                      disabled={savingSections}
                      variant="destructive"
                    >
                      {savingSections ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <ToggleLeft className="w-4 h-4 ml-2" />}
                      إلغاء الكل
                    </Button>
                  </div>

                  {/* Homepage Sections */}
                  <div className="p-4 rounded-lg border border-golden/20 bg-navy-800/30">
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-base font-semibold text-golden">أقسام الصفحة الرئيسية</Label>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <GripVertical className="w-4 h-4" />
                        اسحب لإعادة الترتيب
                      </span>
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, true)}
                    >
                      <SortableContext
                        items={sectionSettings.filter(s => s.display_order < 10).map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {sectionSettings.filter(s => s.display_order < 10).map((section) => (
                            <SortableSectionItem
                              key={section.id}
                              section={section}
                              onToggle={toggleSection}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>

                  {/* Services Sections */}
                  <div className="p-4 rounded-lg border border-golden/20 bg-navy-800/30">
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-base font-semibold text-golden">الخدمات</Label>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <GripVertical className="w-4 h-4" />
                        اسحب لإعادة الترتيب
                      </span>
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, false)}
                    >
                      <SortableContext
                        items={sectionSettings.filter(s => s.display_order >= 10).map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {sectionSettings.filter(s => s.display_order >= 10).map((section) => (
                            <SortableSectionItem
                              key={section.id}
                              section={section}
                              onToggle={toggleSection}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    * عند إلغاء قسم أو خدمة، لن يظهر للمستخدمين في الموقع حتى يتم تفعيله مرة أخرى.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trial Statistics Tab */}
            <TabsContent value="trials">
              {/* Global Trial Toggle Card */}
              <Card className="glass-card border-golden/20 mb-6">
                <CardHeader>
                  <CardTitle className="text-golden flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    إعدادات التجارب المجانية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-golden/10">
                        <Gift className="w-5 h-5 text-golden" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">تفعيل التجارب المجانية للمستخدمين</p>
                        <p className="text-sm text-muted-foreground">
                          السماح للمستخدمين غير المشتركين بتجربة كل خدمة مرة واحدة مجاناً
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={sectionSettings.find(s => s.section_key === 'free_trials')?.is_enabled ?? true}
                      onCheckedChange={() => {
                        const setting = sectionSettings.find(s => s.section_key === 'free_trials');
                        if (setting) {
                          toggleSection(setting.id, setting.is_enabled);
                        }
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    * عند إلغاء التفعيل، لن يتمكن المستخدمون غير المشتركين من تجربة الخدمات مجاناً
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    إحصائيات التجارب المجانية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TrialStatistics />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Tabs defaultValue="monitoring" className="w-full">
                <TabsList className="grid grid-cols-3 w-full max-w-lg">
                  <TabsTrigger value="monitoring">مراقبة الخدمات</TabsTrigger>
                  <TabsTrigger value="alerts">التنبيهات الأمنية</TabsTrigger>
                  <TabsTrigger value="rls-tests">اختبارات RLS</TabsTrigger>
                </TabsList>
                
                <TabsContent value="monitoring" className="mt-4">
                  <LiveServiceMonitor />
                </TabsContent>
                
                <TabsContent value="alerts" className="mt-4">
                  <SecurityAlertsPanel />
                </TabsContent>
                
                <TabsContent value="rls-tests" className="mt-4">
                  <RLSPolicyTestsPanel />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default AdminFullDashboard;
