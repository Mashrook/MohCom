import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Plus, FileText, Users, Calendar, Shield } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface TermsVersion {
  id: string;
  document_type: string;
  version: string;
  effective_date: string;
  summary_ar: string | null;
  created_at: string;
}

interface ConsentLog {
  id: string;
  user_id: string;
  terms_version: string;
  privacy_version: string;
  consent_type: string;
  consented_at: string;
  user_email?: string;
  user_name?: string;
}

const AdminTermsManagement = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [termsVersions, setTermsVersions] = useState<TermsVersion[]>([]);
  const [consentLogs, setConsentLogs] = useState<ConsentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newVersion, setNewVersion] = useState({
    document_type: "terms",
    version: "",
    effective_date: "",
    summary_ar: ""
  });

  useEffect(() => {
    if (userRole !== "admin") {
      navigate("/");
      return;
    }
    fetchData();
  }, [userRole, navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch terms versions
      const { data: versions, error: versionsError } = await supabase
        .from("terms_versions")
        .select("*")
        .order("created_at", { ascending: false });

      if (versionsError) throw versionsError;
      setTermsVersions(versions || []);

      // Fetch consent logs with user info
      const { data: logs, error: logsError } = await supabase
        .from("terms_consent_log")
        .select("*")
        .order("consented_at", { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // Get user profiles for the logs
      if (logs && logs.length > 0) {
        const userIds = [...new Set(logs.map(log => log.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        
        const logsWithUsers = logs.map(log => ({
          ...log,
          user_name: profileMap.get(log.user_id) || "مستخدم"
        }));
        
        setConsentLogs(logsWithUsers);
      } else {
        setConsentLogs([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("حدث خطأ في جلب البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVersion = async () => {
    if (!newVersion.version || !newVersion.effective_date) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      const { error } = await supabase
        .from("terms_versions")
        .insert({
          document_type: newVersion.document_type,
          version: newVersion.version,
          effective_date: newVersion.effective_date,
          summary_ar: newVersion.summary_ar || null
        });

      if (error) throw error;

      toast.success("تم إضافة الإصدار الجديد بنجاح");
      setIsAddDialogOpen(false);
      setNewVersion({
        document_type: "terms",
        version: "",
        effective_date: "",
        summary_ar: ""
      });
      fetchData();
    } catch (error) {
      console.error("Error adding version:", error);
      toast.error("حدث خطأ في إضافة الإصدار");
    }
  };

  const getDocumentTypeName = (type: string) => {
    return type === "terms" ? "شروط الاستخدام" : "سياسة الخصوصية";
  };

  const getConsentTypeBadge = (type: string) => {
    switch (type) {
      case "signup":
        return <Badge variant="default">تسجيل جديد</Badge>;
      case "update":
        return <Badge variant="secondary">تحديث</Badge>;
      case "re-consent":
        return <Badge variant="outline">إعادة موافقة</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const termsStats = {
    totalVersions: termsVersions.length,
    termsVersions: termsVersions.filter(v => v.document_type === "terms").length,
    privacyVersions: termsVersions.filter(v => v.document_type === "privacy").length,
    totalConsents: consentLogs.length
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin")}
              className="gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              العودة للوحة التحكم
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">إدارة الشروط وسياسة الخصوصية</h1>
              <p className="text-muted-foreground">إدارة إصدارات الشروط وعرض سجل الموافقات</p>
            </div>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة إصدار جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة إصدار جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>نوع المستند</Label>
                  <Select
                    value={newVersion.document_type}
                    onValueChange={(value) => setNewVersion({ ...newVersion, document_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="terms">شروط الاستخدام</SelectItem>
                      <SelectItem value="privacy">سياسة الخصوصية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>رقم الإصدار</Label>
                  <Input
                    placeholder="مثال: 2.0"
                    value={newVersion.version}
                    onChange={(e) => setNewVersion({ ...newVersion, version: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ السريان</Label>
                  <Input
                    type="date"
                    value={newVersion.effective_date}
                    onChange={(e) => setNewVersion({ ...newVersion, effective_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ملخص التحديثات (اختياري)</Label>
                  <Textarea
                    placeholder="اكتب ملخصاً للتغييرات في هذا الإصدار..."
                    value={newVersion.summary_ar}
                    onChange={(e) => setNewVersion({ ...newVersion, summary_ar: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button onClick={handleAddVersion} className="w-full">
                  إضافة الإصدار
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{termsStats.totalVersions}</p>
                <p className="text-sm text-muted-foreground">إجمالي الإصدارات</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{termsStats.termsVersions}</p>
                <p className="text-sm text-muted-foreground">شروط الاستخدام</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <FileText className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{termsStats.privacyVersions}</p>
                <p className="text-sm text-muted-foreground">سياسة الخصوصية</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Users className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{termsStats.totalConsents}</p>
                <p className="text-sm text-muted-foreground">سجلات الموافقة</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="versions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="versions">إصدارات الشروط</TabsTrigger>
            <TabsTrigger value="consents">سجل الموافقات</TabsTrigger>
          </TabsList>

          <TabsContent value="versions">
            <Card>
              <CardHeader>
                <CardTitle>إصدارات الشروط وسياسة الخصوصية</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
                ) : termsVersions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">لا توجد إصدارات</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>نوع المستند</TableHead>
                        <TableHead>الإصدار</TableHead>
                        <TableHead>تاريخ السريان</TableHead>
                        <TableHead>ملخص التحديثات</TableHead>
                        <TableHead>تاريخ الإنشاء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {termsVersions.map((version) => (
                        <TableRow key={version.id}>
                          <TableCell>
                            <Badge variant={version.document_type === "terms" ? "default" : "secondary"}>
                              {getDocumentTypeName(version.document_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{version.version}</TableCell>
                          <TableCell>
                            {format(new Date(version.effective_date), "dd MMMM yyyy", { locale: ar })}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {version.summary_ar || "-"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(version.created_at), "dd/MM/yyyy HH:mm", { locale: ar })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consents">
            <Card>
              <CardHeader>
                <CardTitle>سجل موافقات المستخدمين</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
                ) : consentLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">لا توجد سجلات موافقة</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المستخدم</TableHead>
                        <TableHead>نوع الموافقة</TableHead>
                        <TableHead>إصدار الشروط</TableHead>
                        <TableHead>إصدار الخصوصية</TableHead>
                        <TableHead>تاريخ الموافقة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consentLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{log.user_name}</TableCell>
                          <TableCell>{getConsentTypeBadge(log.consent_type)}</TableCell>
                          <TableCell className="font-mono">{log.terms_version}</TableCell>
                          <TableCell className="font-mono">{log.privacy_version}</TableCell>
                          <TableCell>
                            {format(new Date(log.consented_at), "dd/MM/yyyy HH:mm", { locale: ar })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminTermsManagement;
