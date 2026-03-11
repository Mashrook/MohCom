import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";

interface Application {
  id: string;
  full_name: string;
  email_masked: string | null;
  phone_masked: string | null;
  specialty: string;
  experience_years: number;
  location: string;
  bio: string | null;
  license_number: string;
  license_file_url: string | null;
  id_file_url: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
}

const AdminLawyerApplications = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const filteredApps = applications.filter(app =>
    app.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (app.email_masked || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (app.license_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = applications.filter(a => a.status === "pending").length;
  const approvedCount = applications.filter(a => a.status === "approved").length;
  const rejectedCount = applications.filter(a => a.status === "rejected").length;

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('lawyer_applications_admin')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications((data || []) as unknown as Application[]);

      // Log admin access to audit trail
      try { await supabase.rpc('audit_lawyer_app_view_access'); } catch (_) {}
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "خطأ",
        description: "فشل في جلب طلبات المحامين",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية الوصول لهذه الصفحة",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    if (isAdmin) {
      fetchApplications();
    }
  }, [isAdmin, authLoading, navigate]);

  const handleApprove = async (app: Application) => {
    setProcessing(true);
    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: app.email_masked || '',
        password: Math.random().toString(36).slice(-12) + "A1!", // Temp password
        options: {
          data: { full_name: app.full_name },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("فشل إنشاء الحساب");

      const userId = authData.user.id;

      // Update role to lawyer
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: "lawyer" })
        .eq("user_id", userId);

      if (roleError) throw roleError;

      // Update lawyer profile
      const { error: profileError } = await supabase
        .from("lawyer_profiles")
        .update({
          specialty: app.specialty,
          location: app.location,
          experience_years: app.experience_years,
          bio: app.bio,
          is_available: true,
        })
        .eq("user_id", userId);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }

      // Update application status
      const { error: updateError } = await supabase
        .from("lawyer_applications")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", app.id);

      if (updateError) throw updateError;

      toast({
        title: "تم القبول",
        description: `تمت الموافقة على طلب ${app.full_name} وإنشاء حسابه`,
      });

      fetchApplications();
      setViewDialogOpen(false);
    } catch (error: any) {
      console.error("Approval error:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في قبول الطلب",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال سبب الرفض",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("lawyer_applications")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason.trim(),
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedApp.id);

      if (error) throw error;

      toast({
        title: "تم الرفض",
        description: "تم رفض الطلب بنجاح",
      });

      fetchApplications();
      setRejectDialogOpen(false);
      setViewDialogOpen(false);
      setRejectionReason("");
    } catch (error: any) {
      console.error("Rejection error:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في رفض الطلب",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500"><Clock className="w-3 h-3 ml-1" />قيد المراجعة</Badge>;
      case "approved":
        return <Badge variant="outline" className="text-emerald-500 border-emerald-500"><CheckCircle className="w-3 h-3 ml-1" />مقبول</Badge>;
      case "rejected":
        return <Badge variant="outline" className="text-red-500 border-red-500"><XCircle className="w-3 h-3 ml-1" />مرفوض</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const downloadFile = async (filePath: string | null, fileName: string) => {
    if (!filePath) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('lawyer-documents')
        .download(filePath);

      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الملف",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-8 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="font-cairo font-bold text-2xl md:text-3xl text-foreground mb-2">
              طلبات انضمام المحامين
            </h1>
            <p className="text-muted-foreground">
              مراجعة وإدارة طلبات المحامين للانضمام للمنصة
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <Users className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{applications.length}</p>
                  <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <Clock className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">قيد المراجعة</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-emerald-500/10">
                  <UserCheck className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{approvedCount}</p>
                  <p className="text-sm text-muted-foreground">مقبول</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-500/10">
                  <UserX className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{rejectedCount}</p>
                  <p className="text-sm text-muted-foreground">مرفوض</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="البحث بالاسم أو البريد أو رقم الرخصة..."
                  className="pr-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>قائمة الطلبات</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredApps.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد طلبات</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الاسم</TableHead>
                        <TableHead>التخصص</TableHead>
                        <TableHead>رقم الرخصة</TableHead>
                        <TableHead>المدينة</TableHead>
                        <TableHead>تاريخ الطلب</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApps.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.full_name}</TableCell>
                          <TableCell>{app.specialty}</TableCell>
                          <TableCell>{app.license_number}</TableCell>
                          <TableCell>{app.location}</TableCell>
                          <TableCell>{formatDate(app.created_at)}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedApp(app);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
            <DialogDescription>
              مراجعة بيانات طلب الانضمام
            </DialogDescription>
          </DialogHeader>
          
          {selectedApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">الاسم</p>
                  <p className="font-medium">{selectedApp.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                  <p className="font-medium">{selectedApp.email_masked || '[مشفر]'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الهاتف</p>
                  <p className="font-medium">{selectedApp.phone_masked || '[مشفر]'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">رقم الرخصة</p>
                  <p className="font-medium">{selectedApp.license_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">التخصص</p>
                  <p className="font-medium">{selectedApp.specialty}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المدينة</p>
                  <p className="font-medium">{selectedApp.location}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">سنوات الخبرة</p>
                  <p className="font-medium">{selectedApp.experience_years}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  {getStatusBadge(selectedApp.status)}
                </div>
              </div>

              {selectedApp.bio && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">نبذة</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedApp.bio}</p>
                </div>
              )}

              {selectedApp.rejection_reason && (
                <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <p className="text-sm text-red-500 font-medium mb-1">سبب الرفض:</p>
                  <p className="text-sm">{selectedApp.rejection_reason}</p>
                </div>
              )}

              {/* Documents */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">المستندات</p>
                <div className="flex gap-2">
                  {selectedApp.license_file_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadFile(selectedApp.license_file_url, `license_${selectedApp.license_number}`)}
                    >
                      <Download className="w-4 h-4 ml-1" />
                      رخصة المحاماة
                    </Button>
                  )}
                  {selectedApp.id_file_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadFile(selectedApp.id_file_url, `id_${selectedApp.full_name}`)}
                    >
                      <Download className="w-4 h-4 ml-1" />
                      الهوية
                    </Button>
                  )}
                </div>
              </div>

              {selectedApp.status === "pending" && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={processing}
                  >
                    <XCircle className="w-4 h-4 ml-1" />
                    رفض
                  </Button>
                  <Button
                    variant="golden"
                    onClick={() => handleApprove(selectedApp)}
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin ml-1" />
                    ) : (
                      <CheckCircle className="w-4 h-4 ml-1" />
                    )}
                    قبول وإنشاء الحساب
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>رفض الطلب</AlertDialogTitle>
            <AlertDialogDescription>
              يرجى إدخال سبب رفض طلب {selectedApp?.full_name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="سبب الرفض..."
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
              className="bg-red-500 hover:bg-red-600"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد الرفض"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default AdminLawyerApplications;
