import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Download,
  UserX,
  Lock,
  Globe,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Layout } from '@/components/layout/Layout';

interface PasswordSecurityLog {
  id: string;
  email: string;
  rejection_reason: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface FailedLoginAttempt {
  id: string;
  email: string;
  ip_address: string | null;
  user_agent: string | null;
  attempt_time: string;
  created_at: string;
}

interface SecurityStats {
  totalRejections: number;
  weakPasswordRejections: number;
  leakedPasswordRejections: number;
  commonPasswordRejections: number;
  recentRejections: number;
}

interface LoginAttemptsStats {
  totalAttempts: number;
  uniqueEmails: number;
  uniqueIPs: number;
  recentAttempts: number;
  suspiciousPatterns: number;
}

export default function AdminPasswordSecurity() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<PasswordSecurityLog[]>([]);
  const [failedLogins, setFailedLogins] = useState<FailedLoginAttempt[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    totalRejections: 0,
    weakPasswordRejections: 0,
    leakedPasswordRejections: 0,
    commonPasswordRejections: 0,
    recentRejections: 0,
  });
  const [loginStats, setLoginStats] = useState<LoginAttemptsStats>({
    totalAttempts: 0,
    uniqueEmails: 0,
    uniqueIPs: 0,
    recentAttempts: 0,
    suspiciousPatterns: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('failed-logins');

  useEffect(() => {
    if (userRole !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [userRole, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch password security logs
      const { data: logsData, error: logsError } = await supabase
        .from('password_security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;
      setLogs(logsData || []);

      // Fetch failed login attempts
      const { data: failedLoginsData, error: failedLoginsError } = await supabase
        .from('failed_login_attempts')
        .select('*')
        .order('attempt_time', { ascending: false })
        .limit(200);

      if (failedLoginsError) throw failedLoginsError;
      setFailedLogins(failedLoginsData || []);

      // Calculate password security stats
      const allLogs = logsData || [];
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      setStats({
        totalRejections: allLogs.length,
        weakPasswordRejections: allLogs.filter(l => 
          l.rejection_reason.includes('ضعيفة') || l.rejection_reason.includes('weak')
        ).length,
        leakedPasswordRejections: allLogs.filter(l => 
          l.rejection_reason.includes('مسربة') || l.rejection_reason.includes('leaked') || l.rejection_reason.includes('HIBP')
        ).length,
        commonPasswordRejections: allLogs.filter(l => 
          l.rejection_reason.includes('شائعة') || l.rejection_reason.includes('common')
        ).length,
        recentRejections: allLogs.filter(l => 
          new Date(l.created_at) > last24Hours
        ).length,
      });

      // Calculate failed login stats
      const allFailedLogins = failedLoginsData || [];
      const uniqueEmails = new Set(allFailedLogins.map(l => l.email.toLowerCase()));
      const uniqueIPs = new Set(allFailedLogins.filter(l => l.ip_address).map(l => l.ip_address));
      
      // Detect suspicious patterns (more than 5 attempts from same email or IP)
      const emailCounts: Record<string, number> = {};
      const ipCounts: Record<string, number> = {};
      
      allFailedLogins.forEach(l => {
        const email = l.email.toLowerCase();
        emailCounts[email] = (emailCounts[email] || 0) + 1;
        if (l.ip_address) {
          ipCounts[l.ip_address] = (ipCounts[l.ip_address] || 0) + 1;
        }
      });

      const suspiciousEmails = Object.values(emailCounts).filter(count => count >= 5).length;
      const suspiciousIPs = Object.values(ipCounts).filter(count => count >= 5).length;

      setLoginStats({
        totalAttempts: allFailedLogins.length,
        uniqueEmails: uniqueEmails.size,
        uniqueIPs: uniqueIPs.size,
        recentAttempts: allFailedLogins.filter(l => 
          new Date(l.attempt_time) > last24Hours
        ).length,
        suspiciousPatterns: suspiciousEmails + suspiciousIPs,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportPasswordLogsToCSV = () => {
    if (logs.length === 0) return;
    
    const headers = ['البريد الإلكتروني', 'سبب الرفض', 'عنوان IP', 'المتصفح', 'التاريخ'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        `"${log.email}"`,
        `"${log.rejection_reason}"`,
        `"${log.ip_address || '-'}"`,
        `"${log.user_agent || '-'}"`,
        `"${format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `password-security-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportFailedLoginsToCSV = () => {
    if (failedLogins.length === 0) return;
    
    const headers = ['البريد الإلكتروني', 'عنوان IP', 'المتصفح', 'وقت المحاولة'];
    const csvContent = [
      headers.join(','),
      ...failedLogins.map(login => [
        `"${login.email}"`,
        `"${login.ip_address || '-'}"`,
        `"${login.user_agent || '-'}"`,
        `"${format(new Date(login.attempt_time), 'yyyy-MM-dd HH:mm:ss')}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `failed-logins-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getAttemptCountByEmail = (email: string) => {
    return failedLogins.filter(l => l.email.toLowerCase() === email.toLowerCase()).length;
  };

  const getReasonBadge = (reason: string) => {
    if (reason.includes('مسربة') || reason.includes('leaked') || reason.includes('HIBP')) {
      return <Badge variant="destructive">كلمة مرور مسربة</Badge>;
    }
    if (reason.includes('شائعة') || reason.includes('common')) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">كلمة مرور شائعة</Badge>;
    }
    if (reason.includes('ضعيفة') || reason.includes('weak')) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">كلمة مرور ضعيفة</Badge>;
    }
    return <Badge variant="outline">{reason}</Badge>;
  };

  const securityFeatures = [
    {
      name: 'فحص قوة كلمة المرور',
      description: 'التحقق من طول كلمة المرور وتعقيدها (12+ حرف، أحرف كبيرة/صغيرة، أرقام، رموز)',
      status: 'active',
      icon: ShieldCheck,
    },
    {
      name: 'فحص كلمات المرور المسربة (HIBP)',
      description: 'التحقق من قاعدة بيانات HaveIBeenPwned للكشف عن كلمات المرور المسربة',
      status: 'active',
      icon: ShieldAlert,
    },
    {
      name: 'رفض كلمات المرور الشائعة',
      description: 'حظر كلمات المرور الشائعة مثل password123, qwerty, etc.',
      status: 'active',
      icon: ShieldX,
    },
    {
      name: 'حماية كلمات المرور المسربة (Supabase)',
      description: 'ميزة حماية إضافية على مستوى الخادم - تتطلب خطة Supabase Pro',
      status: 'requires_pro',
      icon: Shield,
    },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>لوحة الإدارة</span>
            <ArrowRight className="h-4 w-4" />
            <span>مراقبة الأمان</span>
          </div>
          <h1 className="text-3xl font-bold">مراقبة أمان الحسابات</h1>
          <p className="text-muted-foreground mt-2">
            مراقبة محاولات تسجيل الدخول الفاشلة وسياسات أمان كلمات المرور
          </p>
        </div>

        {/* Security Features Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {securityFeatures.map((feature) => (
            <Card key={feature.name}>
              <CardContent className="flex items-start gap-4 pt-6">
                <div className={`p-2 rounded-lg ${
                  feature.status === 'active' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-yellow-100 text-yellow-600'
                }`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{feature.name}</h3>
                    {feature.status === 'active' ? (
                      <Badge className="bg-green-100 text-green-800">مفعّل</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">يتطلب Pro</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="failed-logins" className="gap-2">
              <UserX className="h-4 w-4" />
              محاولات الدخول الفاشلة
              {loginStats.recentAttempts > 0 && (
                <Badge variant="destructive" className="mr-2">{loginStats.recentAttempts}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="password-security" className="gap-2">
              <Lock className="h-4 w-4" />
              كلمات المرور المرفوضة
              {stats.recentRejections > 0 && (
                <Badge variant="secondary" className="mr-2">{stats.recentRejections}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Failed Login Attempts Tab */}
          <TabsContent value="failed-logins" className="space-y-6">
            {/* Failed Login Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-primary">{loginStats.totalAttempts}</div>
                  <div className="text-sm text-muted-foreground">إجمالي المحاولات</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-blue-600">{loginStats.uniqueEmails}</div>
                  <div className="text-sm text-muted-foreground">بريد إلكتروني فريد</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-purple-600">{loginStats.uniqueIPs}</div>
                  <div className="text-sm text-muted-foreground">عناوين IP فريدة</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-orange-600">{loginStats.recentAttempts}</div>
                  <div className="text-sm text-muted-foreground">آخر 24 ساعة</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-red-600">{loginStats.suspiciousPatterns}</div>
                  <div className="text-sm text-muted-foreground">أنماط مشبوهة</div>
                </CardContent>
              </Card>
            </div>

            {/* Failed Login Attempts Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserX className="h-5 w-5 text-red-500" />
                      سجل محاولات تسجيل الدخول الفاشلة
                    </CardTitle>
                    <CardDescription>
                      محاولات تسجيل الدخول الفاشلة بسبب بيانات خاطئة أو حسابات غير موجودة
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportFailedLoginsToCSV} disabled={loading || failedLogins.length === 0}>
                      <Download className="h-4 w-4 ml-2" />
                      تصدير CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
                      تحديث
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {failedLogins.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>لا توجد محاولات دخول فاشلة</p>
                    <p className="text-sm">هذا يعني أن جميع محاولات الدخول كانت ناجحة</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>البريد الإلكتروني</TableHead>
                          <TableHead>عدد المحاولات</TableHead>
                          <TableHead>عنوان IP</TableHead>
                          <TableHead>المتصفح</TableHead>
                          <TableHead>وقت المحاولة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {failedLogins.map((login) => {
                          const attemptCount = getAttemptCountByEmail(login.email);
                          return (
                            <TableRow key={login.id}>
                              <TableCell className="font-mono text-sm" dir="ltr">
                                {login.email}
                              </TableCell>
                              <TableCell>
                                {attemptCount >= 5 ? (
                                  <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                    <AlertCircle className="h-3 w-3" />
                                    {attemptCount} محاولات
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">{attemptCount}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-sm" dir="ltr">
                                {login.ip_address || '-'}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" dir="ltr">
                                {login.user_agent?.substring(0, 50) || '-'}
                              </TableCell>
                              <TableCell>
                                {format(new Date(login.attempt_time), 'dd MMM yyyy - HH:mm', { locale: ar })}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Password Security Tab */}
          <TabsContent value="password-security" className="space-y-6">
            {/* Password Security Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-primary">{stats.totalRejections}</div>
                  <div className="text-sm text-muted-foreground">إجمالي المرفوضات</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-yellow-600">{stats.weakPasswordRejections}</div>
                  <div className="text-sm text-muted-foreground">كلمات ضعيفة</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-red-600">{stats.leakedPasswordRejections}</div>
                  <div className="text-sm text-muted-foreground">كلمات مسربة</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-orange-600">{stats.commonPasswordRejections}</div>
                  <div className="text-sm text-muted-foreground">كلمات شائعة</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.recentRejections}</div>
                  <div className="text-sm text-muted-foreground">آخر 24 ساعة</div>
                </CardContent>
              </Card>
            </div>

            {/* Password Rejection Logs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      سجل محاولات التسجيل المرفوضة
                    </CardTitle>
                    <CardDescription>
                      محاولات التسجيل التي تم رفضها بسبب سياسات أمان كلمات المرور
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportPasswordLogsToCSV} disabled={loading || logs.length === 0}>
                      <Download className="h-4 w-4 ml-2" />
                      تصدير CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
                      تحديث
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>لا توجد محاولات مرفوضة حتى الآن</p>
                    <p className="text-sm">هذا يعني أن جميع المستخدمين اختاروا كلمات مرور قوية</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>البريد الإلكتروني</TableHead>
                          <TableHead>سبب الرفض</TableHead>
                          <TableHead>عنوان IP</TableHead>
                          <TableHead>التاريخ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm" dir="ltr">
                              {log.email}
                            </TableCell>
                            <TableCell>{getReasonBadge(log.rejection_reason)}</TableCell>
                            <TableCell className="font-mono text-sm" dir="ltr">
                              {log.ip_address || '-'}
                            </TableCell>
                            <TableCell>
                              {format(new Date(log.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
