import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  Star,
  MessageSquare,
  Calendar,
  Clock,
  Video,
  FileText,
  TrendingUp,
  Loader2,
  Inbox
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface LawyerStats {
  activeClients: number;
  activeCases: number;
  monthlyRevenue: number;
  rating: number;
  completedConsultations: number;
}

interface RecentMessage {
  id: string;
  senderName: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

const LawyerDashboard = () => {
  const { user, isLawyer, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<LawyerStats>({
    activeClients: 0,
    activeCases: 0,
    monthlyRevenue: 0,
    rating: 0,
    completedConsultations: 0
  });
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // السماح للأدمن أو المحامين بالوصول
  const hasAccess = isLawyer || isAdmin;

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      toast({
        title: "غير مصرح",
        description: "هذه الصفحة مخصصة للمحامين فقط",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    if (user && hasAccess) {
      fetchRealData();
    }
  }, [user, hasAccess, authLoading, navigate]);

  const fetchRealData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch lawyer profile for rating
      const { data: lawyerProfile } = await supabase
        .from("lawyer_profiles")
        .select("rating, reviews_count")
        .eq("user_id", user.id)
        .maybeSingle();

      // Count unique clients (users who sent messages to this lawyer)
      const { data: clientsData } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("receiver_id", user.id);
      
      const uniqueClients = new Set(clientsData?.map(m => m.sender_id) || []);

      // Count messages as "cases/consultations"
      const { count: messagesCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      // Fetch recent messages
      const { data: messagesData } = await supabase
        .from("messages")
        .select(`
          id,
          content_encrypted,
          created_at,
          is_read,
          sender_id
        `)
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      // Get sender names
      const recentMsgs: RecentMessage[] = [];
      if (messagesData) {
        for (const msg of messagesData) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", msg.sender_id)
            .maybeSingle();
          
          recentMsgs.push({
            id: msg.id,
            senderName: profile?.full_name || "مستخدم",
            content: msg.content_encrypted ? "[رسالة مشفرة]" : "",
            createdAt: msg.created_at,
            isRead: msg.is_read || false
          });
        }
      }

      setStats({
        activeClients: uniqueClients.size,
        activeCases: 0, // No cases table yet
        monthlyRevenue: 0, // No revenue tracking for lawyers yet
        rating: lawyerProfile?.rating || 0,
        completedConsultations: messagesCount || 0
      });

      setRecentMessages(recentMsgs);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  };

  const statsDisplay = [
    { title: "العملاء النشطين", value: stats.activeClients.toString(), icon: Users },
    { title: "الاستشارات", value: stats.completedConsultations.toString(), icon: Briefcase },
    { title: "الإيرادات الشهرية", value: `${stats.monthlyRevenue.toLocaleString()} ر.س`, icon: DollarSign },
    { title: "التقييم", value: stats.rating > 0 ? stats.rating.toFixed(1) : "جديد", icon: Star },
  ];

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-golden" />
        </div>
      </Layout>
    );
  }

  if (!hasAccess) return null;

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              لوحة تحكم <span className="text-gradient-golden">المحامي</span>
            </h1>
            <p className="text-muted-foreground">مرحباً بك، إليك نظرة عامة على نشاطك</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statsDisplay.map((stat, index) => (
              <Card key={index} className="glass-card border-golden/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-golden/20 flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-golden" />
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

          <div className="grid lg:grid-cols-3 gap-6">
            {/* No Upcoming Appointments - Empty State */}
            <Card className="glass-card border-golden/20 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-golden">
                  <Calendar className="w-5 h-5" />
                  المواعيد القادمة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Inbox className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">لا توجد مواعيد قادمة</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    ستظهر هنا المواعيد عند حجزها من قبل العملاء
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Messages */}
            <Card className="glass-card border-golden/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-golden">
                  <MessageSquare className="w-5 h-5" />
                  الرسائل الأخيرة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm">لا توجد رسائل</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentMessages.map((msg) => (
                      <div key={msg.id} className={`p-3 rounded-lg ${!msg.isRead ? 'bg-golden/10 border border-golden/20' : 'bg-navy-800/50'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">{msg.senderName}</span>
                          {!msg.isRead && <span className="w-2 h-2 rounded-full bg-golden"></span>}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(msg.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance - Real Data */}
            <Card className="glass-card border-golden/20 lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-golden">
                  <TrendingUp className="w-5 h-5" />
                  الأداء
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-navy-800/50 rounded-lg">
                    <p className="text-3xl font-bold text-gradient-golden">{stats.completedConsultations}</p>
                    <p className="text-sm text-muted-foreground">إجمالي المحادثات</p>
                  </div>
                  <div className="text-center p-4 bg-navy-800/50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-400">{stats.activeClients}</p>
                    <p className="text-sm text-muted-foreground">عملاء تواصلوا معك</p>
                  </div>
                  <div className="text-center p-4 bg-navy-800/50 rounded-lg">
                    <p className="text-3xl font-bold text-green-400">{stats.rating > 0 ? stats.rating.toFixed(1) : "-"}</p>
                    <p className="text-sm text-muted-foreground">متوسط التقييم</p>
                  </div>
                  <div className="text-center p-4 bg-navy-800/50 rounded-lg">
                    <p className="text-3xl font-bold text-golden">{recentMessages.filter(m => !m.isRead).length}</p>
                    <p className="text-sm text-muted-foreground">رسائل غير مقروءة</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LawyerDashboard;
