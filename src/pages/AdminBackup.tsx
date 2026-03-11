import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Database, 
  Download, 
  RefreshCw, 
  Calendar, 
  HardDrive, 
  FileJson, 
  CheckCircle, 
  XCircle, 
  Clock,
  Loader2
} from 'lucide-react';

interface BackupRecord {
  id: string;
  backup_type: string;
  status: string;
  file_path: string | null;
  file_size: number | null;
  tables_included: string[] | null;
  records_count: Record<string, number> | null;
  created_by: string | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

interface BackupStats {
  totalBackups: number;
  lastBackup: string | null;
  totalSize: number;
  successRate: number;
}

const AdminBackup = () => {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [stats, setStats] = useState<BackupStats>({
    totalBackups: 0,
    lastBackup: null,
    totalSize: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const { data, error } = await supabase
        .from('backup_history')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const backupData = (data || []) as BackupRecord[];
      setBackups(backupData);

      // Calculate stats
      const completed = backupData.filter(b => b.status === 'completed');
      const totalSize = completed.reduce((sum, b) => sum + (b.file_size || 0), 0);
      const successRate = backupData.length > 0 
        ? (completed.length / backupData.length) * 100 
        : 0;

      setStats({
        totalBackups: backupData.length,
        lastBackup: completed[0]?.completed_at || null,
        totalSize,
        successRate,
      });
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast.error('فشل في جلب سجل النسخ الاحتياطي');
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async (backupType: 'manual' | 'scheduled' = 'manual') => {
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('يجب تسجيل الدخول أولاً');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/data-backup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ backupType }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'فشل في إنشاء النسخة الاحتياطية');
      }

      toast.success(`تم إنشاء النسخة الاحتياطية بنجاح (${result.total_records} سجل)`);
      
      // Download the backup
      if (result.download_url) {
        window.open(result.download_url, '_blank');
      }

      fetchBackups();
    } catch (error: any) {
      console.error('Backup error:', error);
      toast.error(error.message || 'فشل في إنشاء النسخة الاحتياطية');
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('backups')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
        toast.success('جاري تحميل النسخة الاحتياطية');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('فشل في تحميل النسخة الاحتياطية');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const sizes = ['بايت', 'ك.ب', 'م.ب', 'ج.ب'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 ml-1" /> مكتمل</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 ml-1" /> فشل</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock className="w-3 h-3 ml-1" /> قيد التنفيذ</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTotalRecords = (recordsCount: Record<string, number> | null) => {
    if (!recordsCount) return 0;
    return Object.values(recordsCount).reduce((a, b) => a + b, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">النسخ الاحتياطي للبيانات</h1>
          <p className="text-muted-foreground">إدارة وتصدير النسخ الاحتياطية للنظام</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchBackups} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
          <Button onClick={() => createBackup('manual')} disabled={creating}>
            {creating ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <Database className="w-4 h-4 ml-2" />
            )}
            إنشاء نسخة احتياطية
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي النسخ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{stats.totalBackups}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">آخر نسخة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">
                {stats.lastBackup ? formatDate(stats.lastBackup) : 'لا يوجد'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">الحجم الإجمالي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">نسبة النجاح</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.successRate.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup History */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="w-5 h-5" />
            سجل النسخ الاحتياطي
          </CardTitle>
          <CardDescription>
            جميع النسخ الاحتياطية المنشأة يدوياً أو تلقائياً
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد نسخ احتياطية بعد
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">عدد السجلات</TableHead>
                  <TableHead className="text-right">الحجم</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-medium">
                      {formatDate(backup.started_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {backup.backup_type === 'manual' ? 'يدوي' : 'مجدول'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(backup.status)}</TableCell>
                    <TableCell>
                      {getTotalRecords(backup.records_count).toLocaleString('ar-SA')}
                    </TableCell>
                    <TableCell>{formatFileSize(backup.file_size)}</TableCell>
                    <TableCell>
                      {backup.status === 'completed' && backup.file_path && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadBackup(backup.file_path!)}
                        >
                          <Download className="w-4 h-4 ml-1" />
                          تحميل
                        </Button>
                      )}
                      {backup.status === 'failed' && backup.error_message && (
                        <span className="text-xs text-red-400" title={backup.error_message}>
                          {backup.error_message.substring(0, 30)}...
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Backup Info */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>معلومات النسخ الاحتياطي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">الجداول المشمولة في النسخ الاحتياطي:</h4>
              <div className="flex flex-wrap gap-1">
                {[
                  'profiles', 'user_roles', 'subscriptions', 'payment_history',
                  'messages', 'contract_analyses', 'saved_contracts', 'lawyer_profiles',
                  'admin_audit_log', 'security_audit_log', 'blog_posts'
                ].map(table => (
                  <Badge key={table} variant="secondary" className="text-xs">
                    {table}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-xs">+16 جدول آخر</Badge>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">ملاحظات:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• يتم تشفير البيانات الحساسة تلقائياً</li>
                <li>• صيغة الملف: JSON</li>
                <li>• الحد الأقصى: 10,000 سجل لكل جدول</li>
                <li>• النسخ الاحتياطية محمية بصلاحيات المدير فقط</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBackup;
