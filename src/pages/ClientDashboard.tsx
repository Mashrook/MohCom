import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquare, 
  FileText, 
  Calendar, 
  Clock,
  CheckCircle,
  AlertCircle,
  Scale,
  Briefcase,
  CreditCard,
  Video,
  Download,
  Plus,
  TrendingUp,
  BarChart3,
  Search,
  Sparkles,
  FileSearch,
  Loader2,
  Bell,
  Mail,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CaseDocumentUploader, { type UploadedDocument } from "@/components/CaseDocumentUploader";

interface UsageStats {
  totalConsultations: number;
  totalContracts: number;
  totalDownloads: number;
  totalSearches: number;
  contractAnalyses: number;
  thisMonthConsultations: number;
  thisMonthContracts: number;
}

interface ContractAnalysis {
  id: string;
  title: string;
  analysis_type: string;
  created_at: string;
  overall_rating: number | null;
}

interface ContractDownload {
  id: string;
  downloaded_at: string;
  template: {
    title: string;
    category: string;
  } | null;
}

const ClientDashboard = () => {
  const { user, isClient, isAdmin, isLawyer, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [usageStats, setUsageStats] = useState<UsageStats>({
    totalConsultations: 0,
    totalContracts: 0,
    totalDownloads: 0,
    totalSearches: 0,
    contractAnalyses: 0,
    thisMonthConsultations: 0,
    thisMonthContracts: 0,
  });
  const [recentAnalyses, setRecentAnalyses] = useState<ContractAnalysis[]>([]);
  const [recentDownloads, setRecentDownloads] = useState<ContractDownload[]>([]);

  // السماح للأدمن بالوصول لجميع اللوحات للرقابة والإدارة
  const hasAccess = isClient || isAdmin;

  useEffect(() => {
    // التحقق من صلاحية الوصول - السماح للعملاء والأدمن (للرقابة)
    if (!authLoading && user) {
      // المحامي فقط يتم توجيهه - الأدمن يستطيع مشاهدة جميع اللوحات
      if (isLawyer && !isAdmin) {
        navigate("/lawyer-full-dashboard");
        return;
      }
    }
    
    if (user && !authLoading && hasAccess) {
      fetchUserStats();
    }
  }, [user, authLoading, isAdmin, isLawyer, hasAccess, navigate]);

  const fetchUserStats = async () => {
    setIsLoading(true);
    try {
      // Fetch contract analyses
      const { data: analyses, error: analysesError } = await supabase
        .from("contract_analyses")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (analysesError) throw analysesError;

      // Fetch contract downloads
      const { data: downloads, error: downloadsError } = await supabase
        .from("contract_downloads")
        .select(`
          id,
          downloaded_at,
          template_id
        `)
        .eq("user_id", user?.id)
        .order("downloaded_at", { ascending: false });

      if (downloadsError) throw downloadsError;

      // Get template details for downloads
      const downloadsWithTemplates: ContractDownload[] = [];
      if (downloads) {
        for (const download of downloads.slice(0, 5)) {
          const { data: template } = await supabase
            .from("contract_templates")
            .select("title, category")
            .eq("id", download.template_id)
            .maybeSingle();
          
          downloadsWithTemplates.push({
            id: download.id,
            downloaded_at: download.downloaded_at,
            template: template
          });
        }
      }

      // Calculate this month stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const thisMonthAnalyses = analyses?.filter(a => 
        new Date(a.created_at) >= startOfMonth
      ).length || 0;

      const thisMonthDownloads = downloads?.filter(d => 
        new Date(d.downloaded_at) >= startOfMonth
      ).length || 0;

      setUsageStats({
        totalConsultations: 0,
        totalContracts: downloads?.length || 0,
        totalDownloads: downloads?.length || 0,
        totalSearches: 0,
        contractAnalyses: analyses?.length || 0,
        thisMonthConsultations: 0,
        thisMonthContracts: thisMonthDownloads,
      });

      setRecentAnalyses(analyses?.slice(0, 5) || []);
      setRecentDownloads(downloadsWithTemplates);

    } catch (error) {
      console.error("Error fetching user stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-SA", {
      day: "numeric",
      month: "long",
    });
  };

  const getAnalysisTypeLabel = (type: string) => {
    switch (type) {
      case "analyze": return "تحليل";
      case "review": return "مراجعة";
      default: return type;
    }
  };

  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const handleSendReminder = async (appointment: { lawyer: string; type: string; time: string; date: string }) => {
    if (!user?.email) {
      toast.error("لم يتم العثور على البريد الإلكتروني");
      return;
    }

    setSendingReminder(`${appointment.lawyer}-${appointment.date}`);
    
    try {
      const { data, error } = await supabase.functions.invoke("send-reminder-email", {
        body: {
          userEmail: user.email,
          userName: user.user_metadata?.full_name || "عميل",
          appointmentDate: appointment.date,
          appointmentTime: appointment.time,
          lawyerName: appointment.lawyer,
          appointmentType: appointment.type,
        },
      });

      if (error) throw error;

      toast.success("تم إرسال التذكير إلى بريدك الإلكتروني");
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error("حدث خطأ أثناء إرسال التذكير");
    } finally {
      setSendingReminder(null);
    }
  };

  const stats = [
    { title: "الاستشارات", value: usageStats.totalConsultations.toString(), icon: MessageSquare, color: "text-blue-400" },
    { title: "تحليلات العقود", value: usageStats.contractAnalyses.toString(), icon: FileSearch, color: "text-purple-400" },
    { title: "العقود المحملة", value: usageStats.totalDownloads.toString(), icon: Download, color: "text-green-400" },
    { title: "عمليات البحث", value: usageStats.totalSearches.toString(), icon: Search, color: "text-golden" },
  ];

  const usageData = [
    { label: "الاستشارات هذا الشهر", current: usageStats.thisMonthConsultations, max: 10, icon: MessageSquare },
    { label: "تحليلات العقود", current: usageStats.contractAnalyses, max: 20, icon: FileSearch },
    { label: "التحميلات هذا الشهر", current: usageStats.thisMonthContracts, max: 15, icon: Download },
  ];

  const upcomingAppointments = [
    { lawyer: "محمد العتيبي", type: "متابعة فيديو", time: "3:00 م", date: "14 ديسمبر" },
    { lawyer: "خالد القحطاني", type: "استشارة أولية", time: "11:00 ص", date: "16 ديسمبر" },
  ];

  const activeCases = [
    { 
      title: "قضية تجارية ضد شركة النور",
      lawyer: "محمد العتيبي",
      status: "active",
      nextStep: "جلسة استماع",
      date: "20 ديسمبر"
    }
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-golden animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                لوحة تحكم <span className="text-gradient-golden">العميل</span>
              </h1>
              <p className="text-muted-foreground">مرحباً بك، إليك ملخص نشاطك القانوني</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-3">
              <Link to="/consultation">
                <Button variant="golden">
                  <Plus className="w-4 h-4 ml-2" />
                  استشارة جديدة
                </Button>
              </Link>
              <Link to="/contracts">
                <Button variant="outline" className="border-golden/30 text-golden hover:bg-golden/10">
                  <FileText className="w-4 h-4 ml-2" />
                  إنشاء عقد
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className="glass-card border-golden/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-golden/20 flex items-center justify-center">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                      <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Usage Statistics */}
          <Card className="glass-card border-golden/20 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-golden">
                <BarChart3 className="w-5 h-5" />
                إحصائيات الاستخدام
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {usageData.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-golden" />
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold text-foreground">{item.current}/{item.max}</span>
                    </div>
                    <Progress value={(item.current / item.max) * 100} className="h-2" />
                  </div>
                ))}
              </div>
              
              {/* Quick Stats Summary */}
              <div className="mt-6 pt-6 border-t border-golden/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-navy-800/50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{usageStats.thisMonthConsultations}</p>
                    <p className="text-xs text-muted-foreground">استشارات هذا الشهر</p>
                  </div>
                  <div className="text-center p-4 bg-navy-800/50 rounded-lg">
                    <FileSearch className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{usageStats.contractAnalyses}</p>
                    <p className="text-xs text-muted-foreground">إجمالي التحليلات</p>
                  </div>
                  <div className="text-center p-4 bg-navy-800/50 rounded-lg">
                    <Download className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{usageStats.totalDownloads}</p>
                    <p className="text-xs text-muted-foreground">إجمالي التحميلات</p>
                  </div>
                  <div className="text-center p-4 bg-navy-800/50 rounded-lg">
                    <Sparkles className="w-6 h-6 text-golden mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{usageStats.totalSearches}</p>
                    <p className="text-xs text-muted-foreground">عمليات البحث الذكي</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Upcoming Appointments */}
            <Card className="glass-card border-golden/20 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-golden">
                  <Calendar className="w-5 h-5" />
                  المواعيد القادمة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingAppointments.map((apt, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-navy-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-golden/20 flex items-center justify-center">
                            <Video className="w-6 h-6 text-golden" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{apt.lawyer}</p>
                            <p className="text-sm text-muted-foreground">{apt.type}</p>
                          </div>
                        </div>
                        <div className="text-right sm:text-left">
                          <div className="flex items-center gap-2 text-golden">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">{apt.time}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{apt.date}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-golden/30 text-golden hover:bg-golden/10"
                            onClick={() => handleSendReminder(apt)}
                            disabled={sendingReminder === `${apt.lawyer}-${apt.date}`}
                          >
                            {sendingReminder === `${apt.lawyer}-${apt.date}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Mail className="w-4 h-4 ml-1" />
                                تذكير
                              </>
                            )}
                          </Button>
                          <Button size="sm" variant="golden">
                            انضمام
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-golden/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">لا توجد مواعيد قادمة</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Cases */}
            <Card className="glass-card border-golden/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-golden">
                  <Scale className="w-5 h-5" />
                  القضايا النشطة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeCases.length > 0 ? (
                  <div className="space-y-3">
                    {activeCases.map((case_, index) => (
                      <div key={index} className="p-4 bg-navy-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-blue-500/20 text-blue-400">جارية</Badge>
                        </div>
                        <h4 className="font-medium text-foreground mb-1">{case_.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">المحامي: {case_.lawyer}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <AlertCircle className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-400">{case_.nextStep}</span>
                          <span className="text-muted-foreground">- {case_.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="w-12 h-12 text-golden/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">لا توجد قضايا نشطة</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Contract Analyses */}
            <Card className="glass-card border-golden/20 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-golden">
                  <FileSearch className="w-5 h-5" />
                  تحليلات العقود الأخيرة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentAnalyses.length > 0 ? (
                  <div className="space-y-3">
                    {recentAnalyses.map((analysis) => (
                      <div key={analysis.id} className="flex items-center justify-between p-3 bg-navy-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <FileSearch className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{analysis.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {getAnalysisTypeLabel(analysis.analysis_type)}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-sm text-muted-foreground">{formatDate(analysis.created_at)}</p>
                          {analysis.overall_rating && (
                            <Badge className={`mt-1 ${
                              analysis.overall_rating >= 70 ? "bg-green-500/20 text-green-400" :
                              analysis.overall_rating >= 50 ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-red-500/20 text-red-400"
                            }`}>
                              {analysis.overall_rating}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileSearch className="w-12 h-12 text-golden/30 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">لم تقم بأي تحليل للعقود بعد</p>
                    <Link to="/contracts">
                      <Button variant="golden" size="sm">
                        ابدأ تحليل عقد
                      </Button>
                    </Link>
                  </div>
                )}
                {recentAnalyses.length > 0 && (
                  <Link to="/contracts">
                    <Button variant="outline" className="w-full mt-4 border-golden/30 text-golden hover:bg-golden/10">
                      عرض جميع التحليلات
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Recent Downloads */}
            <Card className="glass-card border-golden/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-golden">
                  <Download className="w-5 h-5" />
                  آخر التحميلات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentDownloads.length > 0 ? (
                  <div className="space-y-3">
                    {recentDownloads.map((download) => (
                      <div key={download.id} className="flex items-center justify-between p-3 bg-navy-800/50 rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-golden shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {download.template?.title || "نموذج عقد"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {download.template?.category || "عقد"}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground shrink-0">
                          {formatDate(download.downloaded_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Download className="w-12 h-12 text-golden/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">لم تقم بأي تحميل بعد</p>
                  </div>
                )}
                <Link to="/contracts">
                  <Button variant="outline" className="w-full mt-4 border-golden/30 text-golden hover:bg-golden/10">
                    تصفح نماذج العقود
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Case Documents */}
          <div className="mt-8">
            <CaseDocumentUploader
              bucket="platform-files"
              title="مستندات القضايا"
              description="ارفع المستندات والملفات المتعلقة بقضاياك (عقود، إثباتات، مراسلات، تسجيلات)"
              maxFiles={20}
              saveToDatabase={true}
            />
          </div>

          {/* Quick Actions */}
          <Card className="glass-card border-golden/20 mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-golden">
                <Sparkles className="w-5 h-5" />
                إجراءات سريعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to="/consultation">
                  <Button variant="outline" className="w-full h-20 flex-col gap-2 border-golden/30 text-foreground hover:bg-golden/10">
                    <MessageSquare className="w-6 h-6 text-golden" />
                    <span className="text-sm">استشارة جديدة</span>
                  </Button>
                </Link>
                <Link to="/contracts">
                  <Button variant="outline" className="w-full h-20 flex-col gap-2 border-golden/30 text-foreground hover:bg-golden/10">
                    <FileText className="w-6 h-6 text-golden" />
                    <span className="text-sm">تحليل عقد</span>
                  </Button>
                </Link>
                <Link to="/legal-search">
                  <Button variant="outline" className="w-full h-20 flex-col gap-2 border-golden/30 text-foreground hover:bg-golden/10">
                    <Search className="w-6 h-6 text-golden" />
                    <span className="text-sm">بحث قانوني</span>
                  </Button>
                </Link>
                <Link to="/predictions">
                  <Button variant="outline" className="w-full h-20 flex-col gap-2 border-golden/30 text-foreground hover:bg-golden/10">
                    <Scale className="w-6 h-6 text-golden" />
                    <span className="text-sm">توقع حكم</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ClientDashboard;
