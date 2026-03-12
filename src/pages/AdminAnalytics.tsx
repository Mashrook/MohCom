import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Briefcase, 
  User,
  Shield,
  TrendingUp,
  FileText,
  MessageSquare,
  Scale,
  Loader2,
  ArrowLeft,
  UserCheck,
  Circle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";

interface Stats {
  totalUsers: number;
  lawyers: number;
  clients: number;
  admins: number;
  totalContracts: number;
  totalConsultations: number;
  activeSubscriptions: number;
  onlineUsers: number;
}

interface OnlineUser {
  user_id: string;
  full_name: string | null;
  role: string;
  last_seen: string;
}

interface UserGrowth {
  month: string;
  users: number;
}

const AdminAnalytics = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [onlineUsersList, setOnlineUsersList] = useState<OnlineUser[]>([]);
  const [monthlyGrowth, setMonthlyGrowth] = useState<UserGrowth[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    lawyers: 0,
    clients: 0,
    admins: 0,
    totalContracts: 0,
    totalConsultations: 0,
    activeSubscriptions: 0,
    onlineUsers: 0,
  });

  const COLORS = ['#D4AF37', '#3B82F6', '#22C55E', '#EF4444'];

  const fetchAnalytics = async () => {
    let successCount = 0;

    try {
      const [rolesResult, contractsResult, subscriptionsResult, presenceResult, profilesGrowthResult] = await Promise.allSettled([
        supabase.from("user_roles").select("role, user_id"),
        supabase.from("contract_analyses").select("*", { count: 'exact', head: true }),
        supabase.from("subscriptions").select("status").eq("status", "active"),
        supabase.from("user_presence").select("user_id, last_seen").eq("is_online", true),
        supabase.from("profiles").select("created_at"),
      ]);

      const roles = rolesResult.status === "fulfilled" && !rolesResult.value.error
        ? (successCount++, rolesResult.value.data || [])
        : [];

      const contractsCount = contractsResult.status === "fulfilled" && !contractsResult.value.error
        ? (successCount++, contractsResult.value.count || 0)
        : 0;

      const subscriptions = subscriptionsResult.status === "fulfilled" && !subscriptionsResult.value.error
        ? (successCount++, subscriptionsResult.value.data || [])
        : [];

      const onlinePresence = presenceResult.status === "fulfilled" && !presenceResult.value.error
        ? (successCount++, presenceResult.value.data || [])
        : [];

      const profileDates = profilesGrowthResult.status === "fulfilled" && !profilesGrowthResult.value.error
        ? (successCount++, profilesGrowthResult.value.data || [])
        : [];

      if (rolesResult.status === "rejected") {
        console.error("Failed to fetch user roles:", rolesResult.reason);
      } else if (rolesResult.value.error) {
        console.error("Failed to fetch user roles:", rolesResult.value.error);
      }

      if (contractsResult.status === "rejected") {
        console.error("Failed to fetch contracts analytics:", contractsResult.reason);
      } else if (contractsResult.value.error) {
        console.error("Failed to fetch contracts analytics:", contractsResult.value.error);
      }

      if (subscriptionsResult.status === "rejected") {
        console.error("Failed to fetch subscriptions analytics:", subscriptionsResult.reason);
      } else if (subscriptionsResult.value.error) {
        console.error("Failed to fetch subscriptions analytics:", subscriptionsResult.value.error);
      }

      if (presenceResult.status === "rejected") {
        console.error("Failed to fetch user presence analytics:", presenceResult.reason);
      } else if (presenceResult.value.error) {
        console.error("Failed to fetch user presence analytics:", presenceResult.value.error);
      }

      // Get profiles for online users
      const onlineUserIds = onlinePresence?.map(p => p.user_id) || [];
      let onlineUsersData: OnlineUser[] = [];

      if (onlineUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", onlineUserIds);

        if (profilesError) {
          console.error("Failed to fetch online user profiles:", profilesError);
          onlineUsersData = onlineUserIds.map((userId) => {
            const userRole = roles.find(r => r.user_id === userId);
            const presence = onlinePresence.find(p => p.user_id === userId);
            return {
              user_id: userId,
              full_name: null,
              role: userRole?.role || 'client',
              last_seen: presence?.last_seen || ''
            };
          });
        } else if (profiles) {
          onlineUsersData = profiles.map(profile => {
            const userRole = roles.find(r => r.user_id === profile.id);
            const presence = onlinePresence.find(p => p.user_id === profile.id);
            return {
              user_id: profile.id,
              full_name: profile.full_name,
              role: userRole?.role || 'client',
              last_seen: presence?.last_seen || ''
            };
          });
        }
      }

      setOnlineUsersList(onlineUsersData);

      const activeSubscriptions = subscriptions.length || 0;

      // Calculate role counts
      const lawyers = roles.filter(r => r.role === 'lawyer').length || 0;
      const clients = roles.filter(r => r.role === 'client').length || 0;
      const admins = roles.filter(r => r.role === 'admin').length || 0;

      setStats({
        totalUsers: roles.length || 0,
        lawyers,
        clients,
        admins,
        totalContracts: contractsCount || 0,
        totalConsultations: 0,
        activeSubscriptions,
        onlineUsers: onlinePresence.length || 0,
      });

      // Calculate real monthly user growth from profiles.created_at
      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const now = new Date();
      const growthData: UserGrowth[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const cutoff = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
        const count = profileDates.filter(p => p.created_at && p.created_at < cutoff).length;
        growthData.push({ month: monthNames[d.getMonth()], users: count });
      }
      setMonthlyGrowth(growthData);

      if (successCount === 0) {
        throw new Error("No analytics queries succeeded");
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "خطأ",
        description: "فشل في جلب البيانات التحليلية",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
      fetchAnalytics();
      
      // Subscribe to presence changes
      const channel = supabase
        .channel("admin-presence-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_presence",
          },
          () => {
            fetchAnalytics();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin, authLoading, navigate]);

  // Pie chart data for role distribution
  const roleDistribution = [
    { name: 'العملاء', value: stats.clients, color: '#22C55E' },
    { name: 'المحامين', value: stats.lawyers, color: '#3B82F6' },
    { name: 'المسؤولين', value: stats.admins, color: '#D4AF37' },
  ];

  // Service usage data
  const serviceUsage = [
    { name: 'العقود', value: stats.totalContracts, fill: '#D4AF37' },
    { name: 'الاستشارات', value: stats.totalConsultations, fill: '#3B82F6' },
    { name: 'الاشتراكات النشطة', value: stats.activeSubscriptions, fill: '#22C55E' },
  ];

  const statCards = [
    { title: "إجمالي المستخدمين", value: stats.totalUsers, icon: Users, color: "text-golden" },
    { title: "المتواجدون الآن", value: stats.onlineUsers, icon: UserCheck, color: "text-emerald-400" },
    { title: "المحامين", value: stats.lawyers, icon: Briefcase, color: "text-blue-400" },
    { title: "العملاء", value: stats.clients, icon: User, color: "text-green-400" },
    { title: "المسؤولين", value: stats.admins, icon: Shield, color: "text-golden" },
    { title: "العقود المحللة", value: stats.totalContracts, icon: FileText, color: "text-purple-400" },
    { title: "الاشتراكات النشطة", value: stats.activeSubscriptions, icon: TrendingUp, color: "text-emerald-400" },
  ];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'مسؤول';
      case 'lawyer': return 'محامي';
      case 'client': return 'عميل';
      default: return 'مستخدم';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-golden';
      case 'lawyer': return 'text-blue-400';
      case 'client': return 'text-green-400';
      default: return 'text-muted-foreground';
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-golden" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                الإحصائيات و<span className="text-gradient-golden">التحليلات</span>
              </h1>
              <p className="text-muted-foreground">نظرة شاملة على أداء المنصة</p>
            </div>
            <Link to="/admin">
              <Button variant="outline" className="border-golden/30 hover:bg-golden/10">
                <ArrowLeft className="w-4 h-4 ml-2" />
                لوحة التحكم
              </Button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {statCards.map((stat, index) => (
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

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* User Growth Chart */}
            <Card className="glass-card border-golden/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-golden">
                  <TrendingUp className="w-5 h-5" />
                  نمو المستخدمين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyGrowth}>
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="month" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1a1f35', 
                          border: '1px solid #D4AF37',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="users" 
                        stroke="#D4AF37" 
                        fillOpacity={1} 
                        fill="url(#colorUsers)" 
                        name="المستخدمين"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Role Distribution Pie Chart */}
            <Card className="glass-card border-golden/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-golden">
                  <Users className="w-5 h-5" />
                  توزيع الأدوار
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {roleDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1a1f35', 
                          border: '1px solid #D4AF37',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Online Users List */}
          <Card className="glass-card border-golden/20 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-golden">
                <UserCheck className="w-5 h-5" />
                المتواجدون الآن ({onlineUsersList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {onlineUsersList.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">لا يوجد مستخدمين متصلين حالياً</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {onlineUsersList.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/70 p-3"
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-golden flex items-center justify-center text-navy-900 font-bold">
                          {user.full_name?.charAt(0) || "م"}
                        </div>
                        <Circle className="w-3 h-3 text-emerald-500 fill-emerald-500 absolute -bottom-0.5 -right-0.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.full_name || "مستخدم"}
                        </p>
                        <p className={`text-xs ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Usage Bar Chart */}
          <Card className="glass-card border-golden/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-golden">
                <Scale className="w-5 h-5" />
                استخدام الخدمات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceUsage} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" stroke="#888" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#888" fontSize={12} width={120} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1f35', 
                        border: '1px solid #D4AF37',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} name="العدد" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default AdminAnalytics;
