import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Briefcase,
  Crown,
  User,
  Loader2,
  Search,
  Shield,
  Check,
  X,
  Edit,
  Calendar,
  Mail,
  CreditCard,
  Star,
  Activity,
  RefreshCw,
  FileText,
  MessageSquare,
  Scale,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { Database } from "@/integrations/supabase/types";
import { logAdminAction } from "@/hooks/useAdminAudit";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithDetails {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: AppRole;
  role_id: string;
  subscription_status: string | null;
  plan_type: string | null;
  subscription_end: string | null;
  trial_usage: {
    consultation: boolean;
    predictions: boolean;
    complaints: boolean;
    legal_search: boolean;
  };
}

interface ServiceUsageStats {
  service: string;
  total_trials: number;
  label: string;
  icon: React.ReactNode;
}

const AdminUserManagement = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<"all" | "active" | "inactive">("all");
  
  // Edit dialog state
  const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [editForm, setEditForm] = useState({
    role: "client" as AppRole,
    subscriptionActive: false,
    subscriptionDays: 30,
  });

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithDetails | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Service usage stats
  const [serviceStats, setServiceStats] = useState<ServiceUsageStats[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles - admins can view all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw profilesError;
      }

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
        throw rolesError;
      }

      // Fetch subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("*");

      if (subsError) {
        console.error("Error fetching subscriptions:", subsError);
        // Continue without subscriptions
      }

      // Fetch all service trials
      const { data: trials, error: trialsError } = await supabase
        .from("service_trials")
        .select("*");

      if (trialsError) {
        console.error("Error fetching trials:", trialsError);
        // Continue without trials
      }

      // Fetch emails for admins using secure function
      const emailPromises = (profiles || []).map(async (profile) => {
        try {
          const { data: email } = await supabase.rpc('get_user_email_for_admin', { 
            target_user_id: profile.id 
          });
          return { id: profile.id, email: email || null };
        } catch {
          return { id: profile.id, email: null };
        }
      });
      
      const emailResults = await Promise.all(emailPromises);
      const emailMap = new Map(emailResults.map(e => [e.id, e.email]));

      // Combine data
      const usersWithDetails: UserWithDetails[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        const userSub = subscriptions?.find(s => s.user_id === profile.id);
        const userTrials = trials?.filter(t => t.user_id === profile.id) || [];

        return {
          id: profile.id,
          email: emailMap.get(profile.id) || null,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          role: userRole?.role || 'client',
          role_id: userRole?.id || '',
          subscription_status: userSub?.status || null,
          plan_type: userSub?.plan_type || null,
          subscription_end: userSub?.current_period_end || null,
          trial_usage: {
            consultation: userTrials.some(t => t.service_key === 'consultation'),
            predictions: userTrials.some(t => t.service_key === 'predictions'),
            complaints: userTrials.some(t => t.service_key === 'complaints'),
            legal_search: userTrials.some(t => t.service_key === 'legal-search'),
          },
        };
      });

      setUsers(usersWithDetails);

      // Calculate service stats
      const stats: ServiceUsageStats[] = [
        {
          service: 'consultation',
          total_trials: trials?.filter(t => t.service_key === 'consultation').length || 0,
          label: 'الاستشارات',
          icon: <MessageSquare className="w-5 h-5 text-primary" />,
        },
        {
          service: 'predictions',
          total_trials: trials?.filter(t => t.service_key === 'predictions').length || 0,
          label: 'التنبؤات',
          icon: <Scale className="w-5 h-5 text-blue-400" />,
        },
        {
          service: 'complaints',
          total_trials: trials?.filter(t => t.service_key === 'complaints').length || 0,
          label: 'الشكاوى',
          icon: <AlertTriangle className="w-5 h-5 text-orange-400" />,
        },
        {
          service: 'legal-search',
          total_trials: trials?.filter(t => t.service_key === 'legal-search').length || 0,
          label: 'البحث القانوني',
          icon: <FileText className="w-5 h-5 text-green-400" />,
        },
      ];
      setServiceStats(stats);

    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "خطأ",
        description: "فشل في جلب بيانات المستخدمين",
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
      fetchUsers();
    }
  }, [isAdmin, authLoading, navigate]);

  // Filter users
  const filteredUsers = users.filter(userItem => {
    const matchesSearch =
      (userItem.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        userItem.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === "all" || userItem.role === roleFilter;
    const matchesSubscription =
      subscriptionFilter === "all" ||
      (subscriptionFilter === "active" && userItem.subscription_status === "active") ||
      (subscriptionFilter === "inactive" && userItem.subscription_status !== "active");
    return matchesSearch && matchesRole && matchesSubscription;
  });

  const openEditDialog = (userItem: UserWithDetails) => {
    setEditingUser(userItem);
    setEditForm({
      role: userItem.role,
      subscriptionActive: userItem.subscription_status === "active",
      subscriptionDays: 30,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!editingUser) return;

    if (editingUser.id === user?.id && editForm.role !== editingUser.role) {
      toast({
        title: "تحذير",
        description: "لا يمكنك تغيير دورك الخاص",
        variant: "destructive",
      });
      return;
    }

    setSavingChanges(true);
    try {
      // Update role if changed
      if (editForm.role !== editingUser.role) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: editForm.role })
          .eq("user_id", editingUser.id);

        if (roleError) throw roleError;

        // Log role change
        await logAdminAction('role_changed', 'user_roles', {
          targetUserId: editingUser.id,
          targetId: editingUser.role_id,
          oldValues: { role: editingUser.role },
          newValues: { role: editForm.role },
          description: `تغيير الدور من ${editingUser.role} إلى ${editForm.role} للمستخدم ${editingUser.full_name || editingUser.email}`
        });
      }

      // Update subscription
      const currentlyActive = editingUser.subscription_status === "active";
      if (editForm.subscriptionActive !== currentlyActive) {
        const now = new Date();
        const endDate = new Date(now.getTime() + editForm.subscriptionDays * 24 * 60 * 60 * 1000);

        const newSubscriptionData = {
          status: editForm.subscriptionActive ? "active" : "inactive",
          plan_type: editForm.subscriptionActive ? "professional" : "free",
          current_period_start: editForm.subscriptionActive ? now.toISOString() : null,
          current_period_end: editForm.subscriptionActive ? endDate.toISOString() : null,
        };

        const { error: subError } = await supabase
          .from("subscriptions")
          .update(newSubscriptionData)
          .eq("user_id", editingUser.id);

        if (subError) throw subError;

        // Log subscription change
        await logAdminAction('subscription_modified', 'subscriptions', {
          targetUserId: editingUser.id,
          oldValues: { 
            status: editingUser.subscription_status,
            plan_type: editingUser.plan_type 
          },
          newValues: newSubscriptionData,
          description: editForm.subscriptionActive 
            ? `تفعيل اشتراك للمستخدم ${editingUser.full_name || editingUser.email} لمدة ${editForm.subscriptionDays} يوم`
            : `إلغاء اشتراك المستخدم ${editingUser.full_name || editingUser.email}`
        });
      }

      toast({
        title: "تم الحفظ",
        description: "تم تحديث بيانات المستخدم بنجاح",
      });

      setIsEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error saving changes:", error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ التغييرات",
        variant: "destructive",
      });
    } finally {
      setSavingChanges(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || userToDelete.id === user?.id) return;
    
    setDeletingUser(true);
    try {
      // Delete user's subscription
      await supabase
        .from("subscriptions")
        .delete()
        .eq("user_id", userToDelete.id);

      // Delete user's role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userToDelete.id);

      // Delete user's service trials
      await supabase
        .from("service_trials")
        .delete()
        .eq("user_id", userToDelete.id);

      // Delete user profile
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userToDelete.id);

      if (error) throw error;

      await logAdminAction('user_deleted', 'profiles', {
        targetUserId: userToDelete.id,
        oldValues: { 
          full_name: userToDelete.full_name, 
          email: userToDelete.email,
          role: userToDelete.role 
        },
        description: `حذف المستخدم: ${userToDelete.full_name || userToDelete.email}`
      });

      toast({
        title: "تم الحذف",
        description: "تم حذف المستخدم بنجاح",
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "خطأ",
        description: "فشل في حذف المستخدم",
        variant: "destructive",
      });
    } finally {
      setDeletingUser(false);
    }
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4 text-golden" />;
      case 'lawyer':
        return <Briefcase className="w-4 h-4 text-blue-400" />;
      case 'client':
        return <User className="w-4 h-4 text-green-400" />;
    }
  };

  const getRoleBadge = (role: AppRole) => {
    const config = {
      admin: { label: "مدير", className: "bg-golden/20 text-golden" },
      lawyer: { label: "محامي", className: "bg-blue-500/20 text-blue-400" },
      client: { label: "عميل", className: "bg-green-500/20 text-green-400" },
    };
    const { label, className } = config[role];
    return (
      <Badge className={className}>
        {getRoleIcon(role)}
        <span className="mr-1">{label}</span>
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const stats = [
    { title: "إجمالي المستخدمين", value: users.length, icon: Users, color: "text-primary" },
    { title: "المشتركين", value: users.filter(u => u.subscription_status === 'active').length, icon: Crown, color: "text-golden" },
    { title: "المحامين", value: users.filter(u => u.role === 'lawyer').length, icon: Briefcase, color: "text-blue-400" },
    { title: "المدراء", value: users.filter(u => u.role === 'admin').length, icon: Shield, color: "text-purple-400" },
  ];

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-golden" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                إدارة <span className="text-gradient-golden">المستخدمين</span>
              </h1>
              <p className="text-muted-foreground">عرض وتعديل صلاحيات واشتراكات المستخدمين</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchUsers} className="border-golden/30">
                <RefreshCw className="w-4 h-4 ml-2" />
                تحديث
              </Button>
              <Link to="/admin">
                <Button variant="golden">
                  <Shield className="w-4 h-4 ml-2" />
                  لوحة التحكم
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <Card key={stat.title} className="glass-card border-golden/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-background ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Service Usage Stats */}
          <Card className="glass-card border-golden/20 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-golden" />
                إحصائيات استخدام التجارب المجانية
              </CardTitle>
              <CardDescription>عدد مرات استخدام التجربة المجانية لكل خدمة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {serviceStats.map((stat) => (
                  <div key={stat.service} className="p-4 rounded-xl bg-background border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      {stat.icon}
                      <span className="text-sm font-medium text-foreground">{stat.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-golden">{stat.total_trials}</p>
                    <p className="text-xs text-muted-foreground">تجربة مستخدمة</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="glass-card border-golden/20">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-golden" />
                  قائمة المستخدمين ({filteredUsers.length})
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10 w-48 bg-background border-border"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as AppRole | "all")}>
                    <SelectTrigger className="w-32 bg-background border-border">
                      <SelectValue placeholder="الدور" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="admin">مدير</SelectItem>
                      <SelectItem value="lawyer">محامي</SelectItem>
                      <SelectItem value="client">عميل</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={subscriptionFilter} onValueChange={(v) => setSubscriptionFilter(v as "all" | "active" | "inactive")}>
                    <SelectTrigger className="w-32 bg-background border-border">
                      <SelectValue placeholder="الاشتراك" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="active">مشترك</SelectItem>
                      <SelectItem value="inactive">غير مشترك</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-golden/20">
                      <TableHead className="text-right">المستخدم</TableHead>
                      <TableHead className="text-right">الدور</TableHead>
                      <TableHead className="text-right">الاشتراك</TableHead>
                      <TableHead className="text-right">التجارب المستخدمة</TableHead>
                      <TableHead className="text-right">تاريخ التسجيل</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userItem) => (
                      <TableRow key={userItem.id} className="border-golden/10 hover:bg-golden/5">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-golden flex items-center justify-center">
                              <span className="text-sm font-bold text-primary-foreground">
                                {userItem.full_name?.[0] || userItem.email?.[0] || "U"}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {userItem.full_name || "بدون اسم"}
                              </p>
                              <p className="text-xs text-muted-foreground">{userItem.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(userItem.role)}</TableCell>
                        <TableCell>
                          {userItem.subscription_status === "active" ? (
                            <div>
                              <Badge className="bg-green-500/20 text-green-400">
                                <Check className="w-3 h-3 ml-1" />
                                {userItem.plan_type || "مشترك"}
                              </Badge>
                              {userItem.subscription_end && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  ينتهي: {formatDate(userItem.subscription_end)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400">
                              <X className="w-3 h-3 ml-1" />
                              غير مشترك
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {userItem.trial_usage.consultation && (
                              <Badge variant="outline" className="text-xs border-primary/30">استشارة</Badge>
                            )}
                            {userItem.trial_usage.predictions && (
                              <Badge variant="outline" className="text-xs border-blue-400/30">تنبؤ</Badge>
                            )}
                            {userItem.trial_usage.complaints && (
                              <Badge variant="outline" className="text-xs border-orange-400/30">شكوى</Badge>
                            )}
                            {userItem.trial_usage.legal_search && (
                              <Badge variant="outline" className="text-xs border-green-400/30">بحث</Badge>
                            )}
                            {!Object.values(userItem.trial_usage).some(v => v) && (
                              <span className="text-xs text-muted-foreground">لم يستخدم</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(userItem.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-golden/30 hover:bg-golden/10"
                              onClick={() => openEditDialog(userItem)}
                            >
                              <Edit className="w-4 h-4 ml-1" />
                              تعديل
                            </Button>
                            {userItem.id !== user?.id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-destructive/30 hover:bg-destructive/10 text-destructive"
                                onClick={() => {
                                  setUserToDelete(userItem);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-golden/30">
          <DialogHeader>
            <DialogTitle className="text-golden">تعديل بيانات المستخدم</DialogTitle>
            <DialogDescription>
              {editingUser?.full_name || editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* User Info */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-background">
              <div className="w-12 h-12 rounded-full bg-gradient-golden flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">
                  {editingUser?.full_name?.[0] || editingUser?.email?.[0] || "U"}
                </span>
              </div>
              <div>
                <p className="font-medium text-foreground">{editingUser?.full_name || "بدون اسم"}</p>
                <p className="text-sm text-muted-foreground">{editingUser?.email}</p>
              </div>
            </div>

            {/* Role Selection */}
            <div className="grid gap-2">
              <Label>الدور</Label>
              <Select
                value={editForm.role}
                onValueChange={(v: AppRole) => setEditForm({ ...editForm, role: v })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-green-400" />
                      <span>عميل</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="lawyer">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-400" />
                      <span>محامي (وصول مفتوح)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-golden" />
                      <span>مدير (وصول مفتوح)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {(editForm.role === 'lawyer' || editForm.role === 'admin') && (
                <p className="text-xs text-green-400">
                  ✓ هذا الدور يمنح وصولاً غير محدود لجميع الخدمات
                </p>
              )}
            </div>

            {/* Subscription Toggle */}
            <div className="grid gap-4 p-4 rounded-xl bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-golden" />
                  <div>
                    <Label>الاشتراك المتميز</Label>
                    <p className="text-xs text-muted-foreground">تفعيل الوصول المفتوح للخدمات</p>
                  </div>
                </div>
                <Switch
                  checked={editForm.subscriptionActive}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, subscriptionActive: checked })}
                />
              </div>
              
              {editForm.subscriptionActive && (
                <div className="grid gap-2">
                  <Label>مدة الاشتراك (بالأيام)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={editForm.subscriptionDays}
                    onChange={(e) => setEditForm({ ...editForm, subscriptionDays: parseInt(e.target.value) || 30 })}
                    className="bg-card border-border"
                  />
                </div>
              )}
            </div>

            {/* Trial Usage Info */}
            {editingUser && (
              <div className="p-4 rounded-xl bg-background">
                <Label className="mb-2 block">التجارب المستخدمة</Label>
                <div className="flex flex-wrap gap-2">
                  {editingUser.trial_usage.consultation && (
                    <Badge variant="outline">الاستشارات ✓</Badge>
                  )}
                  {editingUser.trial_usage.predictions && (
                    <Badge variant="outline">التنبؤات ✓</Badge>
                  )}
                  {editingUser.trial_usage.complaints && (
                    <Badge variant="outline">الشكاوى ✓</Badge>
                  )}
                  {editingUser.trial_usage.legal_search && (
                    <Badge variant="outline">البحث القانوني ✓</Badge>
                  )}
                  {!Object.values(editingUser.trial_usage).some(v => v) && (
                    <span className="text-muted-foreground text-sm">لم يستخدم أي تجربة بعد</span>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button variant="golden" onClick={handleSaveChanges} disabled={savingChanges}>
              {savingChanges ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-card border-destructive/30">
          <DialogHeader>
            <DialogTitle className="text-destructive">تأكيد حذف المستخدم</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف المستخدم "{userToDelete?.full_name || userToDelete?.email}"؟
              <br />
              سيتم حذف جميع بياناته بما في ذلك الاشتراكات والملفات. لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser} 
              disabled={deletingUser}
            >
              {deletingUser ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              حذف نهائي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminUserManagement;