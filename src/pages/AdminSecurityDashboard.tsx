import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, AlertTriangle, Lock, Eye, RefreshCw, Search, Filter, Download, UserX, Activity, Clock, Globe, Radar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import SuspiciousActivityMonitor from '@/components/admin/SuspiciousActivityMonitor';
import BlockedIPsPanel from '@/components/admin/BlockedIPsPanel';
import IPWhitelistPanel from '@/components/admin/IPWhitelistPanel';
import SecurityChartsPanel from '@/components/admin/SecurityChartsPanel';
import AccessMonitorPanel from '@/components/admin/AccessMonitorPanel';

interface SecurityEvent {
  id: string;
  type: 'failed_login' | 'password_rejection' | 'security_audit' | 'admin_action' | 'blocked_user';
  timestamp: string;
  email?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  action?: string;
  details?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  success?: boolean;
}

interface SecurityStats {
  totalEvents: number;
  failedLogins24h: number;
  blockedUsers: number;
  criticalEvents: number;
  uniqueIPs: number;
}

const AdminSecurityDashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    totalEvents: 0,
    failedLogins24h: 0,
    blockedUsers: 0,
    criticalEvents: 0,
    uniqueIPs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!isAdmin) {
      navigate('/');
      toast({
        title: 'غير مصرح',
        description: 'هذه الصفحة للمديرين فقط',
        variant: 'destructive',
      });
      return;
    }
    fetchSecurityData();
  }, [user, isAdmin, navigate]);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const allEvents: SecurityEvent[] = [];
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Fetch failed login attempts
      const { data: failedLogins } = await supabase
        .from('failed_login_attempts')
        .select('*')
        .order('attempt_time', { ascending: false })
        .limit(100);

      if (failedLogins) {
        failedLogins.forEach((login) => {
          allEvents.push({
            id: login.id,
            type: 'failed_login',
            timestamp: login.attempt_time,
            email: login.email,
            ip_address: login.ip_address,
            user_agent: login.user_agent,
            action: 'محاولة تسجيل دخول فاشلة',
            severity: 'medium',
            success: false,
          });
        });
      }

      // Fetch password security logs
      const { data: passwordLogs } = await supabase
        .from('password_security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (passwordLogs) {
        passwordLogs.forEach((log) => {
          allEvents.push({
            id: log.id,
            type: 'password_rejection',
            timestamp: log.created_at,
            email: log.email,
            ip_address: log.ip_address,
            user_agent: log.user_agent,
            action: 'رفض كلمة المرور',
            details: log.rejection_reason,
            severity: log.rejection_reason === 'leaked' ? 'critical' : 'high',
            success: false,
          });
        });
      }

      // Fetch security audit logs
      const { data: securityLogs } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (securityLogs) {
        securityLogs.forEach((log) => {
          allEvents.push({
            id: log.id,
            type: 'security_audit',
            timestamp: log.created_at || '',
            user_id: log.user_id || undefined,
            ip_address: log.ip_address || undefined,
            user_agent: log.user_agent || undefined,
            action: log.action,
            details: log.error_message || undefined,
            severity: log.success ? 'low' : 'high',
            success: log.success || false,
          });
        });
      }

      // Fetch admin audit logs
      const { data: adminLogs } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (adminLogs) {
        adminLogs.forEach((log) => {
          allEvents.push({
            id: log.id,
            type: 'admin_action',
            timestamp: log.created_at,
            user_id: log.admin_id,
            ip_address: log.ip_address || undefined,
            user_agent: log.user_agent || undefined,
            action: log.action_type,
            details: log.action_description || undefined,
            severity: getSeverityForAdminAction(log.action_type),
            success: true,
          });
        });
      }

      // Fetch blocked users
      const { data: blockedUsers } = await supabase
        .from('blocked_payment_users')
        .select('*')
        .is('unblocked_at', null);

      if (blockedUsers) {
        blockedUsers.forEach((blocked) => {
          allEvents.push({
            id: blocked.id,
            type: 'blocked_user',
            timestamp: blocked.blocked_at,
            user_id: blocked.user_id,
            action: 'حظر مستخدم',
            details: blocked.reason || undefined,
            severity: 'critical',
            success: true,
          });
        });
      }

      // Sort all events by timestamp
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Calculate stats
      const failedLogins24h = allEvents.filter(
        (e) => e.type === 'failed_login' && new Date(e.timestamp) > yesterday
      ).length;

      const uniqueIPs = new Set(allEvents.filter((e) => e.ip_address).map((e) => e.ip_address)).size;

      setEvents(allEvents);
      setStats({
        totalEvents: allEvents.length,
        failedLogins24h,
        blockedUsers: blockedUsers?.length || 0,
        criticalEvents: allEvents.filter((e) => e.severity === 'critical').length,
        uniqueIPs,
      });
    } catch (error) {
      console.error('Error fetching security data:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل بيانات الأمان',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityForAdminAction = (actionType: string): 'low' | 'medium' | 'high' | 'critical' => {
    const criticalActions = ['role_changed', 'role_removed', 'user_deleted', 'subscription_cancelled'];
    const highActions = ['role_assigned', 'subscription_modified', 'user_blocked'];
    const mediumActions = ['user_created', 'settings_changed'];

    if (criticalActions.includes(actionType)) return 'critical';
    if (highActions.includes(actionType)) return 'high';
    if (mediumActions.includes(actionType)) return 'medium';
    return 'low';
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      low: { variant: 'secondary', label: 'منخفض' },
      medium: { variant: 'outline', label: 'متوسط' },
      high: { variant: 'default', label: 'مرتفع' },
      critical: { variant: 'destructive', label: 'حرج' },
    };
    const config = variants[severity] || variants.low;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const types: Record<string, { color: string; label: string }> = {
      failed_login: { color: 'bg-red-500/20 text-red-400', label: 'تسجيل دخول فاشل' },
      password_rejection: { color: 'bg-orange-500/20 text-orange-400', label: 'رفض كلمة مرور' },
      security_audit: { color: 'bg-blue-500/20 text-blue-400', label: 'تدقيق أمني' },
      admin_action: { color: 'bg-purple-500/20 text-purple-400', label: 'إجراء إداري' },
      blocked_user: { color: 'bg-yellow-500/20 text-yellow-400', label: 'حظر مستخدم' },
    };
    const config = types[type] || { color: 'bg-gray-500/20 text-gray-400', label: type };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      !searchQuery ||
      event.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.ip_address?.includes(searchQuery) ||
      event.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.details?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = severityFilter === 'all' || event.severity === severityFilter;
    const matchesType = typeFilter === 'all' || event.type === typeFilter;

    return matchesSearch && matchesSeverity && matchesType;
  });

  const exportToCSV = () => {
    const headers = ['التاريخ', 'النوع', 'الخطورة', 'الإجراء', 'البريد الإلكتروني', 'IP', 'التفاصيل'];
    const rows = filteredEvents.map((event) => [
      format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      event.type,
      event.severity,
      event.action || '',
      event.email || '',
      event.ip_address || '',
      event.details || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `security-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8" dir="rtl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">سجل الأمان الشامل</h1>
              <p className="text-muted-foreground">مراقبة جميع الأحداث الأمنية في مكان واحد</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchSecurityData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 ml-2" />
              تصدير
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalEvents}</p>
                  <p className="text-sm text-muted-foreground">إجمالي الأحداث</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Lock className="h-8 w-8 text-red-400" />
                <div>
                  <p className="text-2xl font-bold">{stats.failedLogins24h}</p>
                  <p className="text-sm text-muted-foreground">محاولات فاشلة (24 ساعة)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <UserX className="h-8 w-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold">{stats.blockedUsers}</p>
                  <p className="text-sm text-muted-foreground">مستخدمون محظورون</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-orange-400" />
                <div>
                  <p className="text-2xl font-bold">{stats.criticalEvents}</p>
                  <p className="text-sm text-muted-foreground">أحداث حرجة</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Globe className="h-8 w-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold">{stats.uniqueIPs}</p>
                  <p className="text-sm text-muted-foreground">عناوين IP فريدة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Access Monitor Panel - Policy Violations */}
        <div className="mb-8">
          <AccessMonitorPanel />
        </div>

        {/* Security Charts Panel */}
        <div className="mb-8">
          <SecurityChartsPanel />
        </div>

        {/* Suspicious Activity Monitor */}
        <div className="mb-8">
          <SuspiciousActivityMonitor />
        </div>

        {/* IP Whitelist Panel */}
        <div className="mb-8">
          <IPWhitelistPanel />
        </div>

        {/* Blocked IPs Panel */}
        <div className="mb-8">
          <BlockedIPsPanel />
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالبريد أو IP أو الإجراء..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="الخطورة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المستويات</SelectItem>
                    <SelectItem value="critical">حرج</SelectItem>
                    <SelectItem value="high">مرتفع</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="low">منخفض</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="نوع الحدث" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="failed_login">تسجيل دخول فاشل</SelectItem>
                    <SelectItem value="password_rejection">رفض كلمة مرور</SelectItem>
                    <SelectItem value="security_audit">تدقيق أمني</SelectItem>
                    <SelectItem value="admin_action">إجراء إداري</SelectItem>
                    <SelectItem value="blocked_user">حظر مستخدم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              سجل الأحداث ({filteredEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">الخطورة</TableHead>
                    <TableHead className="text-right">الإجراء</TableHead>
                    <TableHead className="text-right">البريد/المستخدم</TableHead>
                    <TableHead className="text-right">IP</TableHead>
                    <TableHead className="text-right">التفاصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        لا توجد أحداث مطابقة للفلتر
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents.slice(0, 100).map((event) => (
                      <TableRow key={`${event.type}-${event.id}`}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(event.timestamp), 'yyyy/MM/dd HH:mm', { locale: ar })}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(event.type)}</TableCell>
                        <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                        <TableCell>{event.action}</TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {event.email || event.user_id?.slice(0, 8) || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{event.ip_address || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{event.details || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminSecurityDashboard;
