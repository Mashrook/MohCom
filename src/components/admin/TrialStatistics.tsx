import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Gift, 
  Users, 
  TrendingUp, 
  Calendar,
  MessageSquare,
  Scale,
  FileText,
  Search,
  AlertCircle,
  Briefcase,
  Loader2
} from "lucide-react";

interface TrialStats {
  totalTrials: number;
  uniqueUsers: number;
  trialsToday: number;
  trialsThisWeek: number;
  byService: {
    service_key: string;
    count: number;
  }[];
  recentTrials: {
    id: string;
    user_id: string;
    service_key: string;
    used_at: string;
    user_email?: string;
  }[];
}

const serviceLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  consultation: { label: "الاستشارات", icon: <MessageSquare className="w-4 h-4" /> },
  predictions: { label: "التنبؤ بالأحكام", icon: <Scale className="w-4 h-4" /> },
  complaints: { label: "الشكاوى", icon: <AlertCircle className="w-4 h-4" /> },
  contracts: { label: "العقود", icon: <FileText className="w-4 h-4" /> },
  "legal-search": { label: "البحث القانوني", icon: <Search className="w-4 h-4" /> },
  lawyers: { label: "تجمع المحامين", icon: <Briefcase className="w-4 h-4" /> },
};

export function TrialStatistics() {
  const [stats, setStats] = useState<TrialStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrialStats();
  }, []);

  const fetchTrialStats = async () => {
    setLoading(true);
    try {
      // Get total trials count
      const { count: totalTrials } = await supabase
        .from("service_trials")
        .select("*", { count: "exact", head: true });

      // Get unique users count
      const { data: uniqueUsersData } = await supabase
        .from("service_trials")
        .select("user_id")
        .limit(10000);
      
      const uniqueUsers = new Set(uniqueUsersData?.map(t => t.user_id)).size;

      // Get today's trials
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: trialsToday } = await supabase
        .from("service_trials")
        .select("*", { count: "exact", head: true })
        .gte("used_at", today.toISOString());

      // Get this week's trials
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: trialsThisWeek } = await supabase
        .from("service_trials")
        .select("*", { count: "exact", head: true })
        .gte("used_at", weekAgo.toISOString());

      // Get trials by service
      const { data: allTrials } = await supabase
        .from("service_trials")
        .select("service_key");

      const serviceCounts: Record<string, number> = {};
      allTrials?.forEach(trial => {
        serviceCounts[trial.service_key] = (serviceCounts[trial.service_key] || 0) + 1;
      });

      const byService = Object.entries(serviceCounts)
        .map(([service_key, count]) => ({ service_key, count }))
        .sort((a, b) => b.count - a.count);

      // Get recent trials with user emails
      const { data: recentTrialsData } = await supabase
        .from("service_trials")
        .select("id, user_id, service_key, used_at")
        .order("used_at", { ascending: false })
        .limit(10);

      // Get user emails for recent trials using secure function
      const userIds = [...new Set(recentTrialsData?.map(t => t.user_id) || [])];
      const emailPromises = userIds.map(async (userId) => {
        try {
          const { data: email } = await supabase.rpc('get_user_email_for_admin', { 
            target_user_id: userId 
          });
          return { id: userId, email: email || null };
        } catch {
          return { id: userId, email: null };
        }
      });
      
      const emailResults = await Promise.all(emailPromises);
      const emailMap = new Map(emailResults.map(e => [e.id, e.email]));
      
      const recentTrials = recentTrialsData?.map(t => ({
        ...t,
        user_email: emailMap.get(t.user_id) || "غير معروف"
      })) || [];

      setStats({
        totalTrials: totalTrials || 0,
        uniqueUsers,
        trialsToday: trialsToday || 0,
        trialsThisWeek: trialsThisWeek || 0,
        byService,
        recentTrials
      });
    } catch (error) {
      console.error("Error fetching trial stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        لا توجد بيانات متاحة
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card border-golden/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي التجارب</p>
                <p className="text-3xl font-bold text-golden">{stats.totalTrials}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-golden/20 flex items-center justify-center">
                <Gift className="w-6 h-6 text-golden" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-golden/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المستخدمين</p>
                <p className="text-3xl font-bold text-blue-400">{stats.uniqueUsers}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-400/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-golden/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">اليوم</p>
                <p className="text-3xl font-bold text-green-400">{stats.trialsToday}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-400/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-golden/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">هذا الأسبوع</p>
                <p className="text-3xl font-bold text-purple-400">{stats.trialsThisWeek}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-400/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trials by Service */}
      <Card className="glass-card border-golden/20">
        <CardHeader>
          <CardTitle className="text-golden flex items-center gap-2">
            <Gift className="w-5 h-5" />
            التجارب حسب الخدمة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.byService.map(({ service_key, count }) => {
              const service = serviceLabels[service_key] || { label: service_key, icon: <Gift className="w-4 h-4" /> };
              const percentage = stats.totalTrials > 0 ? Math.round((count / stats.totalTrials) * 100) : 0;
              
              return (
                <div 
                  key={service_key}
                  className="p-4 rounded-lg border border-golden/20 bg-navy-800/30"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-golden/20 flex items-center justify-center text-golden">
                      {service.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{service.label}</p>
                      <p className="text-sm text-muted-foreground">{count} تجربة</p>
                    </div>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 right-0 bg-gradient-to-l from-golden to-primary rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-left">{percentage}%</p>
                </div>
              );
            })}
          </div>
          
          {stats.byService.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              لا توجد تجارب مستخدمة بعد
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Trials */}
      <Card className="glass-card border-golden/20">
        <CardHeader>
          <CardTitle className="text-golden flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            أحدث التجارب المستخدمة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentTrials.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">الخدمة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentTrials.map((trial) => {
                  const service = serviceLabels[trial.service_key] || { label: trial.service_key, icon: <Gift className="w-4 h-4" /> };
                  
                  return (
                    <TableRow key={trial.id}>
                      <TableCell className="font-medium">
                        {trial.user_email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-golden/30 text-golden flex items-center gap-1 w-fit">
                          {service.icon}
                          {service.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(trial.used_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              لا توجد تجارب مستخدمة بعد
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
