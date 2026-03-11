import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Briefcase, 
  Crown,
  User,
  Loader2,
  Search,
  Filter,
  BarChart3,
  Shield,
  CreditCard,
  Check,
  X,
  UserPlus,
  FolderOpen,
  MessageSquare
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Database } from "@/integrations/supabase/types";
import { logAdminAction } from "@/hooks/useAdminAudit";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
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
}

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [updatingSubscription, setUpdatingSubscription] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  
  // New user form state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "client" as AppRole,
    activateSubscription: false,
  });

  // Filter users based on search and role filter
  const filteredUsers = users.filter(userItem => {
    const matchesSearch = 
      (userItem.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       userItem.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === "all" || userItem.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = [
    { title: "إجمالي المستخدمين", value: users.length.toString(), icon: Users },
    { title: "المحامين", value: users.filter(u => u.role === 'lawyer').length.toString(), icon: Briefcase },
    { title: "العملاء", value: users.filter(u => u.role === 'client').length.toString(), icon: User },
    { title: "المسؤولين", value: users.filter(u => u.role === 'admin').length.toString(), icon: Shield },
  ];

  const fetchUsers = async () => {
    try {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Fetch all subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("*");

      if (subsError) throw subsError;

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

      // Combine profiles with roles and subscriptions
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        const userSub = subscriptions?.find(s => s.user_id === profile.id);
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
        };
      });

      setUsers(usersWithRoles);
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

  const handleRoleChange = async (userId: string, newRole: AppRole, roleId: string) => {
    if (userId === user?.id) {
      toast({
        title: "تحذير",
        description: "لا يمكنك تغيير دورك الخاص",
        variant: "destructive",
      });
      return;
    }

    setUpdatingRole(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("id", roleId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));

      toast({
        title: "تم التحديث",
        description: "تم تغيير دور المستخدم بنجاح",
      });
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث الدور",
        variant: "destructive",
      });
    } finally {
      setUpdatingRole(null);
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

  const getRoleBadgeClass = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'bg-golden/20 text-golden';
      case 'lawyer':
        return 'bg-blue-500/20 text-blue-400';
      case 'client':
        return 'bg-green-500/20 text-green-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSubscriptionToggle = async (userId: string, currentStatus: string | null) => {
    setUpdatingSubscription(userId);
    try {
      const isActive = currentStatus === 'active';
      const newStatus = isActive ? 'inactive' : 'active';
      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const { error } = await supabase
        .from("subscriptions")
        .update({ 
          status: newStatus,
          plan_type: isActive ? 'free' : 'professional',
          current_period_start: isActive ? null : now.toISOString(),
          current_period_end: isActive ? null : endDate.toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { 
          ...u, 
          subscription_status: newStatus,
          plan_type: isActive ? 'free' : 'professional',
          subscription_end: isActive ? null : endDate.toISOString(),
        } : u
      ));

      toast({
        title: "تم التحديث",
        description: isActive ? "تم إلغاء الاشتراك" : "تم تفعيل الاشتراك لمدة 30 يوم",
      });
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث الاشتراك",
        variant: "destructive",
      });
    } finally {
      setUpdatingSubscription(null);
    }
  };

  const getSubscriptionBadge = (status: string | null, planType: string | null) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
          <Check className="w-3 h-3" />
          {planType || 'مشترك'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
        <X className="w-3 h-3" />
        غير مشترك
      </span>
    );
  };

  const handleCreateUser = async () => {
    if (!newUserForm.email || !newUserForm.password || !newUserForm.fullName) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    if (newUserForm.password.length < 8) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }

    setCreatingUser(true);
    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserForm.email,
        password: newUserForm.password,
        options: {
          data: {
            full_name: newUserForm.fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("فشل في إنشاء المستخدم");

      const newUserId = authData.user.id;

      // Update role if not client
      if (newUserForm.role !== 'client') {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: newUserForm.role })
          .eq("user_id", newUserId);

        if (roleError) {
          console.error("Error updating role:", roleError);
        }
      }

      // Activate subscription if requested
      if (newUserForm.activateSubscription) {
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const { error: subError } = await supabase
          .from("subscriptions")
          .update({
            status: 'active',
            plan_type: 'professional',
            current_period_start: now.toISOString(),
            current_period_end: endDate.toISOString(),
          })
          .eq("user_id", newUserId);

        if (subError) {
          console.error("Error activating subscription:", subError);
        }
      }

      // Log user creation
      await logAdminAction('user_created', 'profiles', {
        targetUserId: newUserId,
        newValues: {
          email: newUserForm.email,
          full_name: newUserForm.fullName,
          role: newUserForm.role,
          subscription_active: newUserForm.activateSubscription,
        },
        description: `إنشاء مستخدم جديد: ${newUserForm.fullName} (${newUserForm.email}) بدور ${newUserForm.role}${newUserForm.activateSubscription ? ' مع تفعيل الاشتراك' : ''}`
      });

      toast({
        title: "تم بنجاح",
        description: "تم إنشاء المستخدم الجديد",
      });

      // Reset form and close dialog
      setNewUserForm({
        email: "",
        password: "",
        fullName: "",
        role: "client",
        activateSubscription: false,
      });
      setIsAddUserOpen(false);

      // Refresh users list
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في إنشاء المستخدم",
        variant: "destructive",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-golden" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                لوحة تحكم <span className="text-gradient-golden">المدير</span>
              </h1>
              <p className="text-muted-foreground">إدارة المستخدمين والأدوار</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/admin/users">
                <Button variant="outline" className="border-golden/30 hover:bg-golden/10">
                  <Users className="w-4 h-4 ml-2" />
                  إدارة المستخدمين
                </Button>
              </Link>
              <Link to="/admin/lawyers">
                <Button variant="outline" className="border-golden/30 hover:bg-golden/10">
                  <Briefcase className="w-4 h-4 ml-2" />
                  إدارة المحامين
                </Button>
              </Link>
              <Link to="/admin/files">
                <Button variant="outline" className="border-golden/30 hover:bg-golden/10">
                  <FolderOpen className="w-4 h-4 ml-2" />
                  إدارة الملفات
                </Button>
              </Link>
              <Link to="/admin/support-chats">
                <Button variant="outline" className="border-golden/30 hover:bg-golden/10">
                  <MessageSquare className="w-4 h-4 ml-2" />
                  محادثات الدعم
                </Button>
              </Link>
              <Link to="/admin/terms">
                <Button variant="outline" className="border-golden/30 hover:bg-golden/10">
                  <Shield className="w-4 h-4 ml-2" />
                  الشروط والخصوصية
                </Button>
              </Link>
              <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-golden hover:bg-golden/90 text-primary-foreground">
                    <UserPlus className="w-4 h-4 ml-2" />
                    إضافة مستخدم
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-golden/30">
                  <DialogHeader>
                    <DialogTitle className="text-golden">إضافة مستخدم جديد</DialogTitle>
                    <DialogDescription>
                      أدخل بيانات المستخدم الجديد
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="fullName">الاسم الكامل *</Label>
                      <Input
                        id="fullName"
                        value={newUserForm.fullName}
                        onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                        placeholder="أدخل الاسم الكامل"
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">البريد الإلكتروني *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUserForm.email}
                        onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                        placeholder="example@email.com"
                        className="bg-background border-border text-foreground"
                        dir="ltr"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">كلمة المرور *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUserForm.password}
                        onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                        placeholder="8 أحرف على الأقل"
                        className="bg-background border-border text-foreground"
                        dir="ltr"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>الدور</Label>
                      <Select
                        value={newUserForm.role}
                        onValueChange={(value: AppRole) => setNewUserForm({ ...newUserForm, role: value })}
                      >
                        <SelectTrigger className="bg-background border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-golden/30">
                          <SelectItem value="client">
                            <span className="flex items-center gap-2">
                              <User className="w-4 h-4 text-green-400" />
                              عميل
                            </span>
                          </SelectItem>
                          <SelectItem value="lawyer">
                            <span className="flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-blue-400" />
                              محامي
                            </span>
                          </SelectItem>
                          <SelectItem value="admin">
                            <span className="flex items-center gap-2">
                              <Crown className="w-4 h-4 text-golden" />
                              مسؤول
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="activateSubscription"
                        checked={newUserForm.activateSubscription}
                        onChange={(e) => setNewUserForm({ ...newUserForm, activateSubscription: e.target.checked })}
                        className="rounded border-golden/30"
                      />
                      <Label htmlFor="activateSubscription" className="cursor-pointer">
                        تفعيل الاشتراك (30 يوم)
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddUserOpen(false)} className="border-golden/30">
                      إلغاء
                    </Button>
                    <Button 
                      onClick={handleCreateUser} 
                      disabled={creatingUser}
                      className="bg-golden hover:bg-golden/90 text-primary-foreground"
                    >
                      {creatingUser ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      ) : (
                        <UserPlus className="w-4 h-4 ml-2" />
                      )}
                      إنشاء المستخدم
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Link to="/admin/analytics">
                <Button variant="outline" className="border-golden/30 hover:bg-golden/10">
                  <BarChart3 className="w-4 h-4 ml-2" />
                  الإحصائيات
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className="glass-card border-golden/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-golden/20 flex items-center justify-center">
                      <stat.icon className="w-6 h-6 text-golden" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Users Table */}
          <Card className="glass-card border-golden/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-golden">
                <Users className="w-5 h-5" />
                إدارة المستخدمين والأدوار
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Controls */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 bg-navy-800/50 border-golden/30"
                  />
                </div>
                <Select
                  value={roleFilter}
                  onValueChange={(value: AppRole | "all") => setRoleFilter(value)}
                >
                  <SelectTrigger className="w-full md:w-48 bg-navy-800/50 border-golden/30">
                    <Filter className="w-4 h-4 ml-2 text-muted-foreground" />
                    <SelectValue placeholder="فلترة حسب الدور" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-golden/30">
                    <SelectItem value="all">جميع الأدوار</SelectItem>
                    <SelectItem value="client">
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4 text-green-400" />
                        العملاء
                      </span>
                    </SelectItem>
                    <SelectItem value="lawyer">
                      <span className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-blue-400" />
                        المحامين
                      </span>
                    </SelectItem>
                    <SelectItem value="admin">
                      <span className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-golden" />
                        المسؤولين
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results count */}
              <p className="text-sm text-muted-foreground mb-4">
                عرض {filteredUsers.length} من {users.length} مستخدم
              </p>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-golden/20">
                      <TableHead className="text-right">المستخدم</TableHead>
                      <TableHead className="text-right">البريد الإلكتروني</TableHead>
                      <TableHead className="text-right">الدور الحالي</TableHead>
                      <TableHead className="text-right">الاشتراك</TableHead>
                      <TableHead className="text-right">تاريخ التسجيل</TableHead>
                      <TableHead className="text-right">تغيير الدور</TableHead>
                      <TableHead className="text-right">إدارة الاشتراك</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userItem) => (
                      <TableRow key={userItem.id} className="border-golden/10">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-golden/20 flex items-center justify-center">
                              {userItem.avatar_url ? (
                                <img 
                                  src={userItem.avatar_url} 
                                  alt={userItem.full_name || ''} 
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <User className="w-5 h-5 text-golden" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {userItem.full_name || 'بدون اسم'}
                              </p>
                              {userItem.id === user?.id && (
                                <span className="text-xs text-golden">(أنت)</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {userItem.email || 'غير متوفر'}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getRoleBadgeClass(userItem.role)}`}>
                            {getRoleIcon(userItem.role)}
                            {userItem.role === 'admin' && 'مسؤول'}
                            {userItem.role === 'lawyer' && 'محامي'}
                            {userItem.role === 'client' && 'عميل'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getSubscriptionBadge(userItem.subscription_status, userItem.plan_type)}
                          {userItem.subscription_end && userItem.subscription_status === 'active' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              حتى {formatDate(userItem.subscription_end)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(userItem.created_at)}
                        </TableCell>
                        <TableCell>
                          {userItem.id === user?.id ? (
                            <span className="text-xs text-muted-foreground">غير متاح</span>
                          ) : (
                            <Select
                              value={userItem.role}
                              onValueChange={(value: AppRole) => 
                                handleRoleChange(userItem.id, value, userItem.role_id)
                              }
                              disabled={updatingRole === userItem.id}
                            >
                              <SelectTrigger className="w-32 bg-navy-800/50 border-golden/30">
                                {updatingRole === userItem.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent className="bg-card border-golden/30">
                                <SelectItem value="client">
                                  <span className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-green-400" />
                                    عميل
                                  </span>
                                </SelectItem>
                                <SelectItem value="lawyer">
                                  <span className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-blue-400" />
                                    محامي
                                  </span>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <span className="flex items-center gap-2">
                                    <Crown className="w-4 h-4 text-golden" />
                                    مسؤول
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={userItem.subscription_status === 'active' ? 'destructive' : 'default'}
                            onClick={() => handleSubscriptionToggle(userItem.id, userItem.subscription_status)}
                            disabled={updatingSubscription === userItem.id}
                            className={userItem.subscription_status === 'active' ? '' : 'bg-golden hover:bg-golden/90 text-primary-foreground'}
                          >
                            {updatingSubscription === userItem.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : userItem.subscription_status === 'active' ? (
                              <>
                                <X className="w-4 h-4 ml-1" />
                                إلغاء
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4 ml-1" />
                                تفعيل
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {users.length === 0 ? "لا يوجد مستخدمين حالياً" : "لا توجد نتائج مطابقة للبحث"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;