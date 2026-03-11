import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ShieldAlert, Eye, RefreshCw, Clock, Database, AlertTriangle, 
  ShieldCheck, Ban, Filter 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ViolationLog {
  id: string;
  user_id: string | null;
  attempted_table: string;
  attempted_action: string;
  violation_type: string;
  severity: string;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  blocked: boolean | null;
  created_at: string;
}

interface AccessStats {
  total: number;
  critical: number;
  high: number;
  blocked: number;
  tables: Record<string, number>;
}

const AccessMonitorPanel = () => {
  const [violations, setViolations] = useState<ViolationLog[]>([]);
  const [auditAccess, setAuditAccess] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [stats, setStats] = useState<AccessStats>({ total: 0, critical: 0, high: 0, blocked: 0, tables: {} });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch policy violation logs
      const { data: violationData, error: vErr } = await supabase
        .from('policy_violation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (vErr) throw vErr;

      // Fetch security audit log entries related to data access
      const { data: auditData, error: aErr } = await supabase
        .from('security_audit_log')
        .select('*')
        .in('action', ['admin_data_access', 'select_denied', 'rls_violation', 'unauthorized_access'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (aErr) throw aErr;

      const allViolations = violationData || [];
      setViolations(allViolations);
      setAuditAccess(auditData || []);

      // Calculate stats
      const tableCounts: Record<string, number> = {};
      allViolations.forEach(v => {
        tableCounts[v.attempted_table] = (tableCounts[v.attempted_table] || 0) + 1;
      });

      setStats({
        total: allViolations.length + (auditData?.length || 0),
        critical: allViolations.filter(v => v.severity === 'critical').length,
        high: allViolations.filter(v => v.severity === 'high').length,
        blocked: allViolations.filter(v => v.blocked).length,
        tables: tableCounts,
      });
    } catch (error) {
      console.error('Error fetching access monitor data:', error);
      toast({ title: 'خطأ', description: 'فشل في تحميل بيانات مراقبة الوصول', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Subscribe to realtime violations
    const channel = supabase
      .channel('policy-violations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'policy_violation_logs' }, (payload) => {
        const newViolation = payload.new as ViolationLog;
        setViolations(prev => [newViolation, ...prev]);
        
        if (newViolation.severity === 'critical' || newViolation.severity === 'high') {
          toast({
            title: '🚨 تنبيه انتهاك سياسة',
            description: `محاولة وصول غير مصرح على ${newViolation.attempted_table}: ${newViolation.description || newViolation.violation_type}`,
            variant: 'destructive',
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const getSeverityBadge = (severity: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      critical: { variant: 'destructive', label: 'حرج' },
      high: { variant: 'default', label: 'مرتفع' },
      medium: { variant: 'outline', label: 'متوسط' },
      low: { variant: 'secondary', label: 'منخفض' },
    };
    const config = map[severity] || map.low;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getViolationTypeBadge = (type: string) => {
    const map: Record<string, { className: string; label: string }> = {
      rls_denied: { className: 'bg-red-500/20 text-red-400', label: 'رفض RLS' },
      unauthorized_access: { className: 'bg-orange-500/20 text-orange-400', label: 'وصول غير مصرح' },
      suspicious_query: { className: 'bg-yellow-500/20 text-yellow-400', label: 'استعلام مشبوه' },
      data_masking_bypass: { className: 'bg-purple-500/20 text-purple-400', label: 'تجاوز إخفاء' },
    };
    const config = map[type] || { className: 'bg-muted text-muted-foreground', label: type };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const uniqueTables = [...new Set(violations.map(v => v.attempted_table))];

  const filteredViolations = violations.filter(v => {
    if (severityFilter !== 'all' && v.severity !== severityFilter) return false;
    if (tableFilter !== 'all' && v.attempted_table !== tableFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-destructive" />
          <div>
            <h2 className="text-xl font-bold">مراقبة الوصول وانتهاكات السياسات</h2>
            <p className="text-sm text-muted-foreground">رصد محاولات SELECT غير المصرح بها والتنبيه عند انتهاك السياسة</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Eye className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">إجمالي الأحداث</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-destructive/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
              <p className="text-xs text-muted-foreground">انتهاكات حرجة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-orange-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-orange-400" />
            <div>
              <p className="text-2xl font-bold text-orange-400">{stats.high}</p>
              <p className="text-xs text-muted-foreground">مرتفعة الخطورة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-green-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Ban className="h-8 w-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-green-400">{stats.blocked}</p>
              <p className="text-xs text-muted-foreground">تم حظرها</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most targeted tables */}
      {Object.keys(stats.tables).length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              الجداول الأكثر استهدافاً
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.tables)
                .sort(([,a], [,b]) => b - a)
                .map(([table, count]) => (
                  <Badge key={table} variant="outline" className="gap-1.5 py-1">
                    <Database className="h-3 w-3" />
                    {table}
                    <span className="bg-destructive/20 text-destructive px-1.5 rounded text-xs">{count}</span>
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center">
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
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="الجدول" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الجداول</SelectItem>
            {uniqueTables.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Violations Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            سجل انتهاكات السياسة ({filteredViolations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الجدول</TableHead>
                  <TableHead className="text-right">الإجراء</TableHead>
                  <TableHead className="text-right">نوع الانتهاك</TableHead>
                  <TableHead className="text-right">الخطورة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">IP</TableHead>
                  <TableHead className="text-right">التفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : filteredViolations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-40" />
                      <p className="font-medium">لا توجد انتهاكات مسجلة</p>
                      <p className="text-sm mt-1">النظام آمن — لم يُكتشف أي وصول غير مصرح</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredViolations.map(v => (
                    <TableRow key={v.id} className={v.severity === 'critical' ? 'bg-destructive/5' : ''}>
                      <TableCell className="whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(v.created_at), 'MM/dd HH:mm', { locale: ar })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 font-mono text-xs">
                          <Database className="h-3 w-3" />
                          {v.attempted_table}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{v.attempted_action}</TableCell>
                      <TableCell>{getViolationTypeBadge(v.violation_type)}</TableCell>
                      <TableCell>{getSeverityBadge(v.severity)}</TableCell>
                      <TableCell>
                        <Badge variant={v.blocked ? 'destructive' : 'secondary'}>
                          {v.blocked ? 'محظور' : 'مرّ'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{v.ip_address || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{v.description || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Security Audit Access Logs */}
      {auditAccess.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              سجل الوصول الإداري للبيانات ({auditAccess.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {auditAccess.map(log => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Eye className="h-4 w-4 text-blue-400" />
                      <div>
                        <p className="text-sm font-medium">{log.action}</p>
                        <p className="text-xs text-muted-foreground">{log.resource_type} • {log.resource_id?.slice(0, 8) || '-'}</p>
                      </div>
                    </div>
                    <div className="text-left flex items-center gap-2">
                      <Badge variant={log.success ? 'secondary' : 'destructive'}>
                        {log.success ? 'ناجح' : 'فشل'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {log.created_at ? format(new Date(log.created_at), 'MM/dd HH:mm') : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AccessMonitorPanel;
