import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAdminSessions } from '@/hooks/useAdminSessions';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  RefreshCw, 
  LogOut, 
  Clock, 
  Globe, 
  Chrome,
  Shield,
  Activity,
  Timer,
  Settings
} from 'lucide-react';

const AdminSessions = () => {
  const { user } = useAuth();
  const { 
    activeSessions, 
    inactiveSessions, 
    loading, 
    currentSessionId, 
    fetchSessions, 
    endSession,
    cleanupSessions
  } = useAdminSessions();
  const { settings: timeoutSettings, saving, updateSettings } = useSessionTimeout();
  const [endingSession, setEndingSession] = useState<string | null>(null);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getBrowserIcon = (browser: string) => {
    // Using Chrome icon as generic browser icon
    return <Chrome className="h-4 w-4" />;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `منذ ${days} يوم`;
    if (hours > 0) return `منذ ${hours} ساعة`;
    if (minutes > 0) return `منذ ${minutes} دقيقة`;
    return 'الآن';
  };

  const handleEndSession = async (sessionId: string) => {
    setEndingSession(sessionId);
    await endSession(sessionId, 'admin_terminated');
    setEndingSession(null);
  };

  const SessionRow = ({ session, isActive }: { session: any; isActive: boolean }) => {
    const isCurrentSession = session.id === currentSessionId;
    const deviceInfo = session.device_info || {};

    return (
      <TableRow className={isCurrentSession ? 'bg-primary/5' : ''}>
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              {getDeviceIcon(deviceInfo.device_type)}
            </div>
            <div>
              <div className="font-medium flex items-center gap-2">
                {deviceInfo.os || 'غير معروف'}
                {isCurrentSession && (
                  <Badge variant="default" className="text-xs">
                    الجلسة الحالية
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                {getBrowserIcon(deviceInfo.browser)}
                {deviceInfo.browser || 'متصفح غير معروف'}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm">
            {session.admin_name || 'مدير'}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            {session.ip_address || 'غير معروف'}
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {formatDate(session.created_at)}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm text-muted-foreground">
            {isActive ? (
              <div className="flex items-center gap-1">
                <Activity className="h-4 w-4 text-green-500" />
                {getTimeSince(session.last_activity)}
              </div>
            ) : (
              <div>
                <div>انتهت: {formatDate(session.ended_at)}</div>
                <div className="text-xs">{session.end_reason === 'admin_terminated' ? 'إنهاء يدوي' : session.end_reason}</div>
              </div>
            )}
          </div>
        </TableCell>
        <TableCell>
          {isActive ? (
            <Badge variant="default" className="bg-green-500">
              نشطة
            </Badge>
          ) : (
            <Badge variant="secondary">
              منتهية
            </Badge>
          )}
        </TableCell>
        <TableCell>
          {isActive && !isCurrentSession && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={endingSession === session.id}
                >
                  <LogOut className="h-4 w-4 ml-1" />
                  إنهاء
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>إنهاء الجلسة</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد من إنهاء هذه الجلسة؟ سيتم تسجيل خروج المستخدم من هذا الجهاز.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleEndSession(session.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    إنهاء الجلسة
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {isCurrentSession && (
            <span className="text-xs text-muted-foreground">جلستك الحالية</span>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8" dir="rtl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              إدارة جلسات المدراء
            </h1>
            <p className="text-muted-foreground mt-2">
              عرض وإدارة جلسات تسجيل الدخول للمدراء
            </p>
          </div>
          <Button onClick={fetchSessions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>

        {/* Timeout Settings Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              إعدادات انتهاء الجلسة التلقائي
            </CardTitle>
            <CardDescription>
              تحديد مدة عدم النشاط قبل إنهاء الجلسة تلقائياً
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <Switch
                  id="timeout-enabled"
                  checked={timeoutSettings.enabled}
                  onCheckedChange={(checked) => updateSettings({ enabled: checked })}
                  disabled={saving}
                />
                <Label htmlFor="timeout-enabled">
                  تفعيل الإنهاء التلقائي
                </Label>
              </div>
              
              {timeoutSettings.enabled && (
                <div className="flex items-center gap-3">
                  <Label>مدة عدم النشاط:</Label>
                  <Select
                    value={String(timeoutSettings.timeoutMinutes)}
                    onValueChange={(value) => updateSettings({ timeoutMinutes: Number(value) })}
                    disabled={saving}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 دقيقة</SelectItem>
                      <SelectItem value="30">30 دقيقة</SelectItem>
                      <SelectItem value="60">ساعة</SelectItem>
                      <SelectItem value="120">ساعتان</SelectItem>
                      <SelectItem value="240">4 ساعات</SelectItem>
                      <SelectItem value="480">8 ساعات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  const count = await cleanupSessions();
                  fetchSessions();
                }}
              >
                <RefreshCw className="h-4 w-4 ml-2" />
                تنظيف الآن
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">الجلسات النشطة</p>
                  <p className="text-3xl font-bold text-green-500">{activeSessions.length}</p>
                </div>
                <Activity className="h-10 w-10 text-green-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">الجلسات المنتهية</p>
                  <p className="text-3xl font-bold text-muted-foreground">{inactiveSessions.length}</p>
                </div>
                <LogOut className="h-10 w-10 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الجلسات</p>
                  <p className="text-3xl font-bold">{activeSessions.length + inactiveSessions.length}</p>
                </div>
                <Monitor className="h-10 w-10 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>سجل الجلسات</CardTitle>
            <CardDescription>
              جميع جلسات تسجيل الدخول للمدراء مع إمكانية إنهاء الجلسات النشطة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active" dir="rtl">
              <TabsList className="mb-4">
                <TabsTrigger value="active">
                  النشطة ({activeSessions.length})
                </TabsTrigger>
                <TabsTrigger value="inactive">
                  المنتهية ({inactiveSessions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    جاري التحميل...
                  </div>
                ) : activeSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد جلسات نشطة
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الجهاز</TableHead>
                          <TableHead>المدير</TableHead>
                          <TableHead>عنوان IP</TableHead>
                          <TableHead>وقت البدء</TableHead>
                          <TableHead>آخر نشاط</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead>إجراء</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeSessions.map((session) => (
                          <SessionRow key={session.id} session={session} isActive={true} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="inactive">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    جاري التحميل...
                  </div>
                ) : inactiveSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد جلسات منتهية
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الجهاز</TableHead>
                          <TableHead>المدير</TableHead>
                          <TableHead>عنوان IP</TableHead>
                          <TableHead>وقت البدء</TableHead>
                          <TableHead>وقت الانتهاء</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inactiveSessions.slice(0, 50).map((session) => (
                          <SessionRow key={session.id} session={session} isActive={false} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminSessions;
