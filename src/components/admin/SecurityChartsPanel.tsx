import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { Loader2, TrendingUp, TrendingDown, Shield, AlertTriangle } from "lucide-react";

interface DailyStats {
  date: string;
  failedLogins: number;
  passwordRejections: number;
  securityEvents: number;
  blockedIPs: number;
}

interface ThreatDistribution {
  name: string;
  value: number;
  color: string;
}

const SecurityChartsPanel = () => {
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [threatDistribution, setThreatDistribution] = useState<ThreatDistribution[]>([]);
  const [trends, setTrends] = useState({
    failedLoginsChange: 0,
    securityEventsChange: 0,
    blockedIPsChange: 0,
  });

  useEffect(() => {
    fetchSecurityStats();
  }, []);

  const fetchSecurityStats = async () => {
    setLoading(true);
    try {
      const last7Days: DailyStats[] = [];
      const today = startOfDay(new Date());

      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = format(date, "yyyy-MM-dd");
        const nextDate = format(subDays(today, i - 1), "yyyy-MM-dd");

        // Fetch failed logins for this day
        const { count: failedLogins } = await supabase
          .from("failed_login_attempts")
          .select("*", { count: "exact", head: true })
          .gte("attempt_time", dateStr)
          .lt("attempt_time", i === 0 ? new Date().toISOString() : nextDate);

        // Fetch password rejections
        const { count: passwordRejections } = await supabase
          .from("password_security_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", dateStr)
          .lt("created_at", i === 0 ? new Date().toISOString() : nextDate);

        // Fetch security audit events
        const { count: securityEvents } = await supabase
          .from("security_audit_log")
          .select("*", { count: "exact", head: true })
          .eq("success", false)
          .gte("created_at", dateStr)
          .lt("created_at", i === 0 ? new Date().toISOString() : nextDate);

        // Fetch blocked IPs
        const { count: blockedIPs } = await supabase
          .from("blocked_ips")
          .select("*", { count: "exact", head: true })
          .gte("blocked_at", dateStr)
          .lt("blocked_at", i === 0 ? new Date().toISOString() : nextDate);

        last7Days.push({
          date: format(date, "EEE", { locale: ar }),
          failedLogins: failedLogins || 0,
          passwordRejections: passwordRejections || 0,
          securityEvents: securityEvents || 0,
          blockedIPs: blockedIPs || 0,
        });
      }

      setDailyStats(last7Days);

      // Calculate trends (comparing last 3 days to previous 3 days)
      const recent = last7Days.slice(-3);
      const previous = last7Days.slice(-6, -3);

      const recentFailedLogins = recent.reduce((acc, d) => acc + d.failedLogins, 0);
      const previousFailedLogins = previous.reduce((acc, d) => acc + d.failedLogins, 0);
      const recentEvents = recent.reduce((acc, d) => acc + d.securityEvents, 0);
      const previousEvents = previous.reduce((acc, d) => acc + d.securityEvents, 0);
      const recentBlocked = recent.reduce((acc, d) => acc + d.blockedIPs, 0);
      const previousBlocked = previous.reduce((acc, d) => acc + d.blockedIPs, 0);

      setTrends({
        failedLoginsChange: previousFailedLogins
          ? Math.round(((recentFailedLogins - previousFailedLogins) / previousFailedLogins) * 100)
          : 0,
        securityEventsChange: previousEvents
          ? Math.round(((recentEvents - previousEvents) / previousEvents) * 100)
          : 0,
        blockedIPsChange: previousBlocked
          ? Math.round(((recentBlocked - previousBlocked) / previousBlocked) * 100)
          : 0,
      });

      // Fetch threat distribution
      const { data: passwordLogs } = await supabase
        .from("password_security_logs")
        .select("rejection_reason");

      const rejectionCounts: Record<string, number> = {};
      passwordLogs?.forEach((log) => {
        rejectionCounts[log.rejection_reason] =
          (rejectionCounts[log.rejection_reason] || 0) + 1;
      });

      const threatColors: Record<string, string> = {
        leaked: "#ef4444",
        weak: "#f97316",
        common: "#eab308",
        short: "#22c55e",
        other: "#6b7280",
      };

      const threatLabels: Record<string, string> = {
        leaked: "كلمات مرور مسربة",
        weak: "كلمات مرور ضعيفة",
        common: "كلمات مرور شائعة",
        short: "كلمات مرور قصيرة",
        other: "أخرى",
      };

      setThreatDistribution(
        Object.entries(rejectionCounts).map(([key, value]) => ({
          name: threatLabels[key] || key,
          value,
          color: threatColors[key] || "#6b7280",
        }))
      );
    } catch (error) {
      console.error("Error fetching security stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalThreats = dailyStats.reduce(
    (acc, d) => acc + d.failedLogins + d.passwordRejections + d.securityEvents,
    0
  );

  return (
    <div className="space-y-6">
      {/* Trend Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">محاولات الدخول الفاشلة</p>
                <p className="text-2xl font-bold">
                  {dailyStats.reduce((acc, d) => acc + d.failedLogins, 0)}
                </p>
              </div>
              <div
                className={`flex items-center gap-1 text-sm ${
                  trends.failedLoginsChange > 0 ? "text-red-400" : "text-green-400"
                }`}
              >
                {trends.failedLoginsChange > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(trends.failedLoginsChange)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">أحداث أمنية</p>
                <p className="text-2xl font-bold">
                  {dailyStats.reduce((acc, d) => acc + d.securityEvents, 0)}
                </p>
              </div>
              <div
                className={`flex items-center gap-1 text-sm ${
                  trends.securityEventsChange > 0 ? "text-red-400" : "text-green-400"
                }`}
              >
                {trends.securityEventsChange > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(trends.securityEventsChange)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">عناوين IP محظورة</p>
                <p className="text-2xl font-bold">
                  {dailyStats.reduce((acc, d) => acc + d.blockedIPs, 0)}
                </p>
              </div>
              <div
                className={`flex items-center gap-1 text-sm ${
                  trends.blockedIPsChange > 0 ? "text-red-400" : "text-green-400"
                }`}
              >
                {trends.blockedIPsChange > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(trends.blockedIPsChange)}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Over Time */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-primary" />
              نشاط التهديدات (7 أيام)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyStats}>
                  <defs>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSecurity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f1f1f",
                      border: "1px solid #333",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="failedLogins"
                    name="محاولات فاشلة"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorFailed)"
                  />
                  <Area
                    type="monotone"
                    dataKey="securityEvents"
                    name="أحداث أمنية"
                    stroke="#f97316"
                    fillOpacity={1}
                    fill="url(#colorSecurity)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Threat Distribution */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              توزيع أنواع التهديدات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {threatDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={threatDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {threatDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f1f1f",
                        border: "1px solid #333",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  لا توجد بيانات كافية
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown Bar Chart */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">التحليل اليومي</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f1f1f",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="failedLogins"
                  name="محاولات فاشلة"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="passwordRejections"
                  name="رفض كلمات مرور"
                  fill="#f97316"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="blockedIPs"
                  name="IP محظور"
                  fill="#eab308"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityChartsPanel;
