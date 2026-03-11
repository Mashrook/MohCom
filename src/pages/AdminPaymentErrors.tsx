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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  Search, 
  Eye, 
  CreditCard,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  XCircle,
  Bell,
  Download,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import SecurityAlertsPanel from "@/components/admin/SecurityAlertsPanel";

interface PaymentError {
  id: string;
  user_id: string | null;
  error_code: string | null;
  error_message: string;
  payment_method: string | null;
  amount: number | null;
  currency: string;
  tap_charge_id: string | null;
  request_payload: Json | null;
  response_payload: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ======= Payment Transactions Tab =======
const PaymentTransactionsTab = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txPage, setTxPage] = useState(0);
  const [txStatusFilter, setTxStatusFilter] = useState("all");
  const [txSearch, setTxSearch] = useState("");
  const txPageSize = 20;
  const [txUserNames, setTxUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTransactions();
  }, [txPage, txStatusFilter]);

  const loadTransactions = async () => {
    setTxLoading(true);
    let query = supabase
      .from("payment_history")
      .select("*")
      .order("created_at", { ascending: false })
      .range(txPage * txPageSize, (txPage + 1) * txPageSize - 1);

    if (txStatusFilter !== "all") {
      query = query.eq("status", txStatusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error loading transactions:", error);
      setTxLoading(false);
      return;
    }

    setTransactions(data || []);

    const userIds = [...new Set((data || []).map((t: any) => t.user_id).filter(Boolean))] as string[];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      if (profiles) {
        const names: Record<string, string> = {};
        profiles.forEach((p: any) => { names[p.id] = p.full_name || "مستخدم"; });
        setTxUserNames(names);
      }
    }
    setTxLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      completed: { cls: "bg-green-500/20 text-green-400", label: "مكتمل" },
      paid: { cls: "bg-green-500/20 text-green-400", label: "مدفوع" },
      initiated: { cls: "bg-yellow-500/20 text-yellow-400", label: "قيد المعالجة" },
      failed: { cls: "bg-red-500/20 text-red-400", label: "فشل" },
      refunded: { cls: "bg-blue-500/20 text-blue-400", label: "مسترد" },
    };
    const m = map[status] || { cls: "bg-muted text-muted-foreground", label: status };
    return <Badge className={m.cls}>{m.label}</Badge>;
  };

  const filteredTx = transactions.filter((tx) => {
    if (!txSearch) return true;
    const s = txSearch.toLowerCase();
    return (
      tx.description?.toLowerCase().includes(s) ||
      tx.plan_type?.toLowerCase().includes(s) ||
      (tx.user_id && txUserNames[tx.user_id]?.toLowerCase().includes(s))
    );
  });

  const totalAmount = filteredTx.reduce((sum: number, tx: any) => sum + (tx.status === "completed" || tx.status === "paid" ? tx.amount : 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المعاملات</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold">{totalAmount.toFixed(2)} ر.س</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">الصفحة</p>
                <p className="text-2xl font-bold">{txPage + 1}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث..." value={txSearch} onChange={(e) => setTxSearch(e.target.value)} className="pr-10" />
            </div>
            <Select value={txStatusFilter} onValueChange={setTxStatusFilter}>
              <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="paid">مدفوع</SelectItem>
                <SelectItem value="failed">فشل</SelectItem>
                <SelectItem value="refunded">مسترد</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadTransactions} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" /> تحديث
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {txLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">الباقة</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">العملة</TableHead>
                  <TableHead className="text-right">طريقة الدفع</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTx.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد معاملات مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTx.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell>{tx.user_id ? txUserNames[tx.user_id] || "مستخدم" : "زائر"}</TableCell>
                      <TableCell>{tx.plan_type || "-"}</TableCell>
                      <TableCell className="font-medium">{tx.amount?.toFixed(2) || "-"}</TableCell>
                      <TableCell>{tx.currency}</TableCell>
                      <TableCell>{tx.payment_method || "-"}</TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setTxPage((p) => Math.max(0, p - 1))} disabled={txPage === 0}>
          <ChevronRight className="h-4 w-4 ml-2" /> السابق
        </Button>
        <span className="text-muted-foreground">صفحة {txPage + 1}</span>
        <Button variant="outline" onClick={() => setTxPage((p) => p + 1)} disabled={filteredTx.length < txPageSize}>
          التالي <ChevronLeft className="h-4 w-4 mr-2" />
        </Button>
      </div>
    </div>
  );
};

// ======= Main Component =======
const AdminPaymentErrors = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<PaymentError[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<PaymentError | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
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
    loadErrors();
  }, [paymentMethodFilter, dateFrom, dateTo, page]);

  const loadErrors = async () => {
    setLoading(true);
    
    let query = supabase
      .from('payment_errors')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (paymentMethodFilter !== "all") {
      query = query.eq('payment_method', paymentMethodFilter);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59');
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error loading payment errors:', error);
      setLoading(false);
      return;
    }

    setErrors(data || []);
    
    // Fetch user names
    const userIds = [...new Set((data || []).map(e => e.user_id).filter(Boolean))] as string[];
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      if (profiles) {
        const names: Record<string, string> = {};
        profiles.forEach(p => { names[p.id] = p.full_name || 'مستخدم'; });
        setUserNames(names);
      }
    }
    
    setLoading(false);
  };

  const getPaymentMethodBadge = (method: string | null) => {
    const colors: Record<string, string> = {
      'card': 'bg-blue-500/20 text-blue-400',
      'apple_pay': 'bg-gray-500/20 text-gray-300',
      'google_pay': 'bg-green-500/20 text-green-400',
      'stc_pay': 'bg-purple-500/20 text-purple-400',
      'mada': 'bg-emerald-500/20 text-emerald-400'
    };

    const labels: Record<string, string> = {
      'card': 'بطاقة',
      'apple_pay': 'Apple Pay',
      'google_pay': 'Google Pay',
      'stc_pay': 'STC Pay',
      'mada': 'مدى'
    };

    return (
      <Badge className={`${colors[method || ''] || 'bg-gray-500/20 text-gray-400'}`}>
        {labels[method || ''] || method || 'غير محدد'}
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

  const formatAmount = (amount: number | null, currency: string) => {
    if (amount === null) return '-';
    return `${amount.toFixed(2)} ${currency}`;
  };

  const filteredErrors = errors.filter(error => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      error.error_message.toLowerCase().includes(searchLower) ||
      error.error_code?.toLowerCase().includes(searchLower) ||
      error.tap_charge_id?.toLowerCase().includes(searchLower) ||
      (error.user_id && userNames[error.user_id]?.toLowerCase().includes(searchLower))
    );
  });

  const exportToCSV = () => {
    const headers = ['التاريخ', 'المستخدم', 'طريقة الدفع', 'المبلغ', 'العملة', 'رمز الخطأ', 'رسالة الخطأ', 'معرف Tap', 'عنوان IP'];
    
    const rows = filteredErrors.map(error => [
      new Date(error.created_at).toLocaleString('ar-SA'),
      error.user_id ? userNames[error.user_id] || error.user_id : 'زائر',
      error.payment_method || 'غير محدد',
      error.amount?.toString() || '-',
      error.currency,
      error.error_code || '-',
      error.error_message.replace(/,/g, ';'),
      error.tap_charge_id || '-',
      error.ip_address || '-'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payment-errors-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('تم تصدير السجل بنجاح');
  };

  // Stats
  const totalErrors = errors.length;
  const todayErrors = errors.filter(e => {
    const today = new Date().toDateString();
    return new Date(e.created_at).toDateString() === today;
  }).length;

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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <h1 className="text-3xl font-bold">سجل أخطاء الدفع</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              تصدير CSV
            </Button>
            <Button onClick={loadErrors} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              تحديث
            </Button>
          </div>
        </div>

        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="transactions" className="gap-2">
              <CreditCard className="h-4 w-4" />
              المعاملات
            </TabsTrigger>
            <TabsTrigger value="errors" className="gap-2">
              <XCircle className="h-4 w-4" />
              سجل الأخطاء
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="h-4 w-4" />
              التنبيهات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <PaymentTransactionsTab />
          </TabsContent>

          <TabsContent value="alerts">
            <SecurityAlertsPanel showPaymentAlerts={true} />
          </TabsContent>

          <TabsContent value="errors" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">إجمالي الأخطاء</p>
                      <p className="text-2xl font-bold">{totalErrors}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-destructive/50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">أخطاء اليوم</p>
                      <p className="text-2xl font-bold">{todayErrors}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-orange-500/50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">الصفحة الحالية</p>
                      <p className="text-2xl font-bold">{page + 1}</p>
                    </div>
                    <CreditCard className="h-8 w-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">تصفية السجلات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث عن خطأ أو رمز..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  
                  <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="طريقة الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الطرق</SelectItem>
                      <SelectItem value="card">بطاقة</SelectItem>
                      <SelectItem value="apple_pay">Apple Pay</SelectItem>
                      <SelectItem value="google_pay">Google Pay</SelectItem>
                      <SelectItem value="stc_pay">STC Pay</SelectItem>
                      <SelectItem value="mada">مدى</SelectItem>
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

        {/* Errors Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">طريقة الدفع</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">رمز الخطأ</TableHead>
                  <TableHead className="text-right">رسالة الخطأ</TableHead>
                  <TableHead className="text-right">التفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredErrors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد أخطاء مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredErrors.map((error) => (
                    <TableRow key={error.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(error.created_at)}
                      </TableCell>
                      <TableCell>
                        {error.user_id ? userNames[error.user_id] || 'مستخدم' : 'زائر'}
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodBadge(error.payment_method)}
                      </TableCell>
                      <TableCell>
                        {formatAmount(error.amount, error.currency)}
                      </TableCell>
                      <TableCell>
                        {error.error_code ? (
                          <code className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded">
                            {error.error_code}
                          </code>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {error.error_message}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedError(error)}
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
            disabled={filteredErrors.length < pageSize}
          >
            التالي
            <ChevronLeft className="h-4 w-4 mr-2" />
          </Button>
        </div>
          </TabsContent>
        </Tabs>

        {/* Details Dialog */}
        <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                تفاصيل الخطأ
              </DialogTitle>
            </DialogHeader>
            {selectedError && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">التاريخ</label>
                      <p className="font-medium">{formatDate(selectedError.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">المستخدم</label>
                      <p className="font-medium">
                        {selectedError.user_id ? userNames[selectedError.user_id] || selectedError.user_id : 'زائر'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">طريقة الدفع</label>
                      <div className="mt-1">{getPaymentMethodBadge(selectedError.payment_method)}</div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">المبلغ</label>
                      <p className="font-medium">{formatAmount(selectedError.amount, selectedError.currency)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">رمز الخطأ</label>
                      <p className="font-medium">{selectedError.error_code || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">معرف Tap</label>
                      <p className="font-medium text-xs">{selectedError.tap_charge_id || '-'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">رسالة الخطأ</label>
                    <p className="font-medium text-destructive">{selectedError.error_message}</p>
                  </div>

                  {selectedError.ip_address && (
                    <div>
                      <label className="text-sm text-muted-foreground">عنوان IP</label>
                      <p className="font-medium">{selectedError.ip_address}</p>
                    </div>
                  )}

                  {selectedError.user_agent && (
                    <div>
                      <label className="text-sm text-muted-foreground">المتصفح</label>
                      <p className="font-medium text-xs break-all">{selectedError.user_agent}</p>
                    </div>
                  )}

                  {selectedError.request_payload && (
                    <div>
                      <label className="text-sm text-muted-foreground">بيانات الطلب</label>
                      <pre className="mt-1 p-3 bg-muted rounded-lg text-sm overflow-auto" dir="ltr">
                        {JSON.stringify(selectedError.request_payload, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedError.response_payload && (
                    <div>
                      <label className="text-sm text-muted-foreground">استجابة Tap</label>
                      <pre className="mt-1 p-3 bg-muted rounded-lg text-sm overflow-auto" dir="ltr">
                        {JSON.stringify(selectedError.response_payload, null, 2)}
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

export default AdminPaymentErrors;
