import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shield, 
  Search, 
  Eye, 
  UserCog, 
  CreditCard, 
  FileText, 
  Settings,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { fetchAdminAuditLogs, AdminAuditLog } from "@/hooks/useAdminAudit";
import { supabase } from "@/integrations/supabase/client";

const AdminAuditLogPage = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});
  const [targetUserNames, setTargetUserNames] = useState<Record<string, string>>({});
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    loadLogs();
  }, [actionFilter, dateFrom, dateTo, page]);

  const loadLogs = async () => {
    setLoading(true);
    const data = await fetchAdminAuditLogs({
      limit: pageSize,
      offset: page * pageSize,
      actionType: actionFilter !== "all" ? actionFilter : undefined,
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined
    });
    setLogs(data);
    
    // Fetch admin names
    const adminIds = [...new Set(data.map(l => l.admin_id))];
    const targetUserIds = [...new Set(data.map(l => l.target_user_id).filter(Boolean))] as string[];
    
    if (adminIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', adminIds);
      
      if (profiles) {
        const names: Record<string, string> = {};
        profiles.forEach(p => { names[p.id] = p.full_name || 'مدير'; });
        setAdminNames(names);
      }
    }

    if (targetUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', targetUserIds);
      
      if (profiles) {
        const names: Record<string, string> = {};
        profiles.forEach(p => { names[p.id] = p.full_name || 'مستخدم'; });
        setTargetUserNames(names);
      }
    }
    
    setLoading(false);
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'role_assigned':
      case 'role_changed':
      case 'role_removed':
        return <UserCog className="h-4 w-4" />;
      case 'subscription_modified':
        return <CreditCard className="h-4 w-4" />;
      case 'content_updated':
        return <FileText className="h-4 w-4" />;
      case 'settings_changed':
        return <Settings className="h-4 w-4" />;
      case 'data_access':
        return <Eye className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getActionBadge = (actionType: string) => {
    const colors: Record<string, string> = {
      'role_assigned': 'bg-green-500/20 text-green-400',
      'role_changed': 'bg-yellow-500/20 text-yellow-400',
      'role_removed': 'bg-red-500/20 text-red-400',
      'subscription_modified': 'bg-blue-500/20 text-blue-400',
      'user_created': 'bg-green-500/20 text-green-400',
      'user_deleted': 'bg-red-500/20 text-red-400',
      'content_updated': 'bg-purple-500/20 text-purple-400',
      'settings_changed': 'bg-orange-500/20 text-orange-400',
      'data_access': 'bg-gray-500/20 text-gray-400'
    };

    const labels: Record<string, string> = {
      'role_assigned': 'تعيين دور',
      'role_changed': 'تغيير دور',
      'role_removed': 'إزالة دور',
      'subscription_modified': 'تعديل اشتراك',
      'user_created': 'إنشاء مستخدم',
      'user_deleted': 'حذف مستخدم',
      'content_updated': 'تحديث محتوى',
      'settings_changed': 'تغيير إعدادات',
      'data_access': 'الوصول للبيانات'
    };

    return (
      <Badge className={`${colors[actionType] || 'bg-gray-500/20 text-gray-400'}`}>
        {labels[actionType] || actionType}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      log.action_description?.toLowerCase().includes(searchLower) ||
      log.target_table.toLowerCase().includes(searchLower) ||
      adminNames[log.admin_id]?.toLowerCase().includes(searchLower) ||
      (log.target_user_id && targetUserNames[log.target_user_id]?.toLowerCase().includes(searchLower))
    );
  });

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">سجل تدقيق المدير</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              // Export to CSV
              const headers = ['التاريخ', 'المدير', 'الإجراء', 'الجدول', 'المستخدم المستهدف', 'الوصف'];
              const csvContent = [
                headers.join(','),
                ...filteredLogs.map(log => [
                  formatDate(log.created_at),
                  adminNames[log.admin_id] || 'مدير',
                  log.action_type,
                  log.target_table,
                  log.target_user_id ? (targetUserNames[log.target_user_id] || 'مستخدم') : '-',
                  log.action_description || '-'
                ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
              ].join('\n');

              const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            تصدير CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">تصفية السجلات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="نوع الإجراء" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الإجراءات</SelectItem>
                  <SelectItem value="role_assigned">تعيين دور</SelectItem>
                  <SelectItem value="role_changed">تغيير دور</SelectItem>
                  <SelectItem value="role_removed">إزالة دور</SelectItem>
                  <SelectItem value="subscription_modified">تعديل اشتراك</SelectItem>
                  <SelectItem value="user_created">إنشاء مستخدم</SelectItem>
                  <SelectItem value="content_updated">تحديث محتوى</SelectItem>
                  <SelectItem value="settings_changed">تغيير إعدادات</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="من تاريخ"
                />
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="إلى تاريخ"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">المدير</TableHead>
                  <TableHead className="text-right">الإجراء</TableHead>
                  <TableHead className="text-right">الجدول</TableHead>
                  <TableHead className="text-right">المستخدم المستهدف</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-right">التفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد سجلات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>{adminNames[log.admin_id] || 'مدير'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action_type)}
                          {getActionBadge(log.action_type)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.target_table}
                        </code>
                      </TableCell>
                      <TableCell>
                        {log.target_user_id ? targetUserNames[log.target_user_id] || 'مستخدم' : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.action_description || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronRight className="h-4 w-4 ml-2" />
            السابق
          </Button>
          <span className="text-muted-foreground">
            صفحة {page + 1}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => p + 1)}
            disabled={filteredLogs.length < pageSize}
          >
            التالي
            <ChevronLeft className="h-4 w-4 mr-2" />
          </Button>
        </div>

        {/* Details Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                تفاصيل السجل
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">التاريخ</label>
                      <p className="font-medium">{formatDate(selectedLog.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">المدير</label>
                      <p className="font-medium">{adminNames[selectedLog.admin_id] || selectedLog.admin_id}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">نوع الإجراء</label>
                      <div className="mt-1">{getActionBadge(selectedLog.action_type)}</div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">الجدول</label>
                      <p className="font-medium">{selectedLog.target_table}</p>
                    </div>
                  </div>

                  {selectedLog.action_description && (
                    <div>
                      <label className="text-sm text-muted-foreground">الوصف</label>
                      <p className="font-medium">{selectedLog.action_description}</p>
                    </div>
                  )}

                  {selectedLog.old_values && (
                    <div>
                      <label className="text-sm text-muted-foreground">القيم السابقة</label>
                      <pre className="mt-1 p-3 bg-muted rounded-lg text-sm overflow-auto" dir="ltr">
                        {JSON.stringify(selectedLog.old_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.new_values && (
                    <div>
                      <label className="text-sm text-muted-foreground">القيم الجديدة</label>
                      <pre className="mt-1 p-3 bg-muted rounded-lg text-sm overflow-auto" dir="ltr">
                        {JSON.stringify(selectedLog.new_values, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AdminAuditLogPage;
