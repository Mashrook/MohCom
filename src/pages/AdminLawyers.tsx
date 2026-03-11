import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Briefcase, 
  Loader2, 
  Search, 
  Trash2, 
  MapPin, 
  Star,
  Clock,
  UserX,
  Users,
  UserPlus,
  ToggleLeft,
  ToggleRight,
  Pencil,
  ImagePlus,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const specialties = [
  "قانون عام",
  "القانون التجاري",
  "قانون الأسرة",
  "القانون الجنائي",
  "قانون العمل",
  "القانون العقاري",
  "الملكية الفكرية",
];

const locations = ["الرياض", "جدة", "الدمام", "مكة", "المدينة"];

interface Lawyer {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  specialty: string;
  experience: number;
  rating: number;
  location: string;
  available: boolean;
  createdAt: string;
  avatarUrl: string | null;
}

interface NewLawyerForm {
  fullName: string;
  email: string;
  password: string;
  specialty: string;
  location: string;
  experience: number;
  hourlyRate: number;
  bio: string;
}

interface EditLawyerForm {
  specialty: string;
  location: string;
  experience: number;
  hourlyRate: number;
}

const AdminLawyers = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [removingLawyer, setRemovingLawyer] = useState<string | null>(null);
  const [togglingAvailability, setTogglingAvailability] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [creatingLawyer, setCreatingLawyer] = useState(false);
  const [newLawyerForm, setNewLawyerForm] = useState<NewLawyerForm>({
    fullName: "",
    email: "",
    password: "",
    specialty: "قانون عام",
    location: "الرياض",
    experience: 1,
    hourlyRate: 300,
    bio: "",
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLawyer, setEditingLawyer] = useState<Lawyer | null>(null);
  const [updatingLawyer, setUpdatingLawyer] = useState(false);
  const [editLawyerForm, setEditLawyerForm] = useState<EditLawyerForm>({
    specialty: "قانون عام",
    location: "الرياض",
    experience: 1,
    hourlyRate: 300,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const filteredLawyers = lawyers.filter(lawyer =>
    lawyer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lawyer.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lawyer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchLawyers = async () => {
    try {
      // Fetch lawyers with their profiles
      const { data: lawyerRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "lawyer");

      if (rolesError) throw rolesError;

      if (!lawyerRoles || lawyerRoles.length === 0) {
        setLawyers([]);
        setLoading(false);
        return;
      }

      const lawyerIds = lawyerRoles.map(r => r.user_id);

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", lawyerIds);

      if (profilesError) throw profilesError;

      // Fetch lawyer profiles
      const { data: lawyerProfiles, error: lpError } = await supabase
        .from("lawyer_profiles")
        .select("*")
        .in("user_id", lawyerIds);

      if (lpError) throw lpError;

      // Fetch emails for admins
      const emailPromises = lawyerIds.map(async (userId) => {
        try {
          const { data: email } = await supabase.rpc('get_user_email_for_admin', { 
            target_user_id: userId 
          });
          return { id: userId, email: email || null };
        } catch {
          return { id: userId, email: null };
        }
      });
      
      const emailResults = await Promise.all(emailPromises);
      const emailMap = new Map(emailResults.map(e => [e.id, e.email]));

      // Combine data
      const lawyersData: Lawyer[] = lawyerRoles.map(role => {
        const profile = profiles?.find(p => p.id === role.user_id);
        const lawyerProfile = lawyerProfiles?.find(lp => lp.user_id === role.user_id);
        
        return {
          id: lawyerProfile?.id || role.user_id,
          userId: role.user_id,
          name: profile?.full_name || "بدون اسم",
          email: emailMap.get(role.user_id) || null,
          specialty: lawyerProfile?.specialty || "قانون عام",
          experience: lawyerProfile?.experience_years || 0,
          rating: lawyerProfile?.rating || 0,
          location: lawyerProfile?.location || "غير محدد",
          available: lawyerProfile?.is_available || false,
          createdAt: role.created_at,
          avatarUrl: profile?.avatar_url || null,
        };
      });

      setLawyers(lawyersData);
    } catch (error) {
      console.error("Error fetching lawyers:", error);
      toast({
        title: "خطأ",
        description: "فشل في جلب بيانات المحامين",
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
      fetchLawyers();
    }
  }, [isAdmin, authLoading, navigate]);

  const handleRemoveLawyer = async (userId: string) => {
    setRemovingLawyer(userId);
    try {
      // Change role from lawyer to client
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: "client" })
        .eq("user_id", userId);

      if (roleError) throw roleError;

      // Remove lawyer profile
      const { error: profileError } = await supabase
        .from("lawyer_profiles")
        .delete()
        .eq("user_id", userId);

      if (profileError) {
        console.error("Error removing lawyer profile:", profileError);
      }

      setLawyers(lawyers.filter(l => l.userId !== userId));

      toast({
        title: "تم بنجاح",
        description: "تم إزالة المحامي من المنصة",
      });
    } catch (error) {
      console.error("Error removing lawyer:", error);
      toast({
        title: "خطأ",
        description: "فشل في إزالة المحامي",
        variant: "destructive",
      });
    } finally {
      setRemovingLawyer(null);
    }
  };

  const handleToggleAvailability = async (userId: string, currentStatus: boolean) => {
    setTogglingAvailability(userId);
    try {
      const { error } = await supabase
        .from("lawyer_profiles")
        .update({ is_available: !currentStatus })
        .eq("user_id", userId);

      if (error) throw error;

      setLawyers(lawyers.map(l => 
        l.userId === userId ? { ...l, available: !currentStatus } : l
      ));

      toast({
        title: "تم التحديث",
        description: !currentStatus ? "تم تفعيل توفر المحامي" : "تم إيقاف توفر المحامي",
      });
    } catch (error) {
      console.error("Error toggling availability:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة التوفر",
        variant: "destructive",
      });
    } finally {
      setTogglingAvailability(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCreateLawyer = async () => {
    // Validation
    if (!newLawyerForm.fullName.trim() || newLawyerForm.fullName.length > 100) {
      toast({
        title: "خطأ",
        description: "الاسم مطلوب ويجب أن يكون أقل من 100 حرف",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newLawyerForm.email) || newLawyerForm.email.length > 255) {
      toast({
        title: "خطأ",
        description: "البريد الإلكتروني غير صحيح",
        variant: "destructive",
      });
      return;
    }

    if (newLawyerForm.password.length < 8) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }

    setCreatingLawyer(true);
    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newLawyerForm.email.trim(),
        password: newLawyerForm.password,
        options: {
          data: {
            full_name: newLawyerForm.fullName.trim(),
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("فشل في إنشاء المستخدم");

      const newUserId = authData.user.id;

      // Update role to lawyer
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: "lawyer" })
        .eq("user_id", newUserId);

      if (roleError) throw roleError;

      // Update lawyer profile with additional info
      const { error: profileError } = await supabase
        .from("lawyer_profiles")
        .update({
          specialty: newLawyerForm.specialty,
          location: newLawyerForm.location,
          experience_years: newLawyerForm.experience,
          hourly_rate: newLawyerForm.hourlyRate,
          bio: newLawyerForm.bio.trim().substring(0, 500),
          is_available: true,
        })
        .eq("user_id", newUserId);

      if (profileError) {
        console.error("Error updating lawyer profile:", profileError);
      }

      toast({
        title: "تم بنجاح",
        description: "تم إضافة المحامي الجديد",
      });

      // Reset form and close dialog
      setNewLawyerForm({
        fullName: "",
        email: "",
        password: "",
        specialty: "قانون عام",
        location: "الرياض",
        experience: 1,
        hourlyRate: 300,
        bio: "",
      });
      setIsAddDialogOpen(false);

      // Refresh lawyers list
      fetchLawyers();
    } catch (error: any) {
      console.error("Error creating lawyer:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في إنشاء المحامي",
        variant: "destructive",
      });
    } finally {
      setCreatingLawyer(false);
    }
  };

  const openEditDialog = (lawyer: Lawyer) => {
    setEditingLawyer(lawyer);
    setEditLawyerForm({
      specialty: lawyer.specialty,
      location: lawyer.location,
      experience: lawyer.experience,
      hourlyRate: 300,
    });
    setAvatarPreview(lawyer.avatarUrl);
    setAvatarFile(null);
    setIsEditDialogOpen(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "خطأ",
          description: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت",
          variant: "destructive",
        });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const handleUpdateLawyer = async () => {
    if (!editingLawyer) return;

    setUpdatingLawyer(true);
    try {
      let newAvatarUrl = editingLawyer.avatarUrl;

      // Upload avatar if there's a new file
      if (avatarFile) {
        setUploadingAvatar(true);
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${editingLawyer.userId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        newAvatarUrl = publicUrl;
        setUploadingAvatar(false);
      } else if (avatarPreview === null && editingLawyer.avatarUrl) {
        // Avatar was removed
        newAvatarUrl = null;
      }

      // Update lawyer profile
      const { error: profileError } = await supabase
        .from("lawyer_profiles")
        .update({
          specialty: editLawyerForm.specialty,
          location: editLawyerForm.location,
          experience_years: editLawyerForm.experience,
          hourly_rate: editLawyerForm.hourlyRate,
        })
        .eq("user_id", editingLawyer.userId);

      if (profileError) throw profileError;

      // Update user profile avatar
      if (newAvatarUrl !== editingLawyer.avatarUrl) {
        const { error: avatarError } = await supabase
          .from("profiles")
          .update({ avatar_url: newAvatarUrl })
          .eq("id", editingLawyer.userId);

        if (avatarError) throw avatarError;
      }

      setLawyers(lawyers.map(l => 
        l.userId === editingLawyer.userId 
          ? { 
              ...l, 
              specialty: editLawyerForm.specialty,
              location: editLawyerForm.location,
              experience: editLawyerForm.experience,
              avatarUrl: newAvatarUrl,
            } 
          : l
      ));

      toast({
        title: "تم بنجاح",
        description: "تم تحديث بيانات المحامي",
      });

      setIsEditDialogOpen(false);
      setEditingLawyer(null);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      console.error("Error updating lawyer:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث بيانات المحامي",
        variant: "destructive",
      });
    } finally {
      setUpdatingLawyer(false);
      setUploadingAvatar(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                إدارة <span className="text-gradient-golden">المحامين</span>
              </h1>
              <p className="text-muted-foreground">عرض وإدارة المحامين المسجلين في المنصة</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <UserPlus className="w-4 h-4 ml-2" />
                  إضافة محامي
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-primary">إضافة محامي جديد</DialogTitle>
                  <DialogDescription>
                    أدخل بيانات المحامي الجديد
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="lawyerName">الاسم الكامل *</Label>
                    <Input
                      id="lawyerName"
                      value={newLawyerForm.fullName}
                      onChange={(e) => setNewLawyerForm({ ...newLawyerForm, fullName: e.target.value })}
                      placeholder="أدخل اسم المحامي"
                      className="bg-background border-border text-foreground"
                      maxLength={100}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lawyerEmail">البريد الإلكتروني *</Label>
                    <Input
                      id="lawyerEmail"
                      type="email"
                      value={newLawyerForm.email}
                      onChange={(e) => setNewLawyerForm({ ...newLawyerForm, email: e.target.value })}
                      placeholder="example@email.com"
                      className="bg-background border-border text-foreground"
                      dir="ltr"
                      maxLength={255}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lawyerPassword">كلمة المرور *</Label>
                    <Input
                      id="lawyerPassword"
                      type="password"
                      value={newLawyerForm.password}
                      onChange={(e) => setNewLawyerForm({ ...newLawyerForm, password: e.target.value })}
                      placeholder="8 أحرف على الأقل"
                      className="bg-background border-border text-foreground"
                      dir="ltr"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>التخصص</Label>
                      <Select
                        value={newLawyerForm.specialty}
                        onValueChange={(value) => setNewLawyerForm({ ...newLawyerForm, specialty: value })}
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {specialties.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>الموقع</Label>
                      <Select
                        value={newLawyerForm.location}
                        onValueChange={(value) => setNewLawyerForm({ ...newLawyerForm, location: value })}
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {locations.map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="lawyerExperience">سنوات الخبرة</Label>
                      <Input
                        id="lawyerExperience"
                        type="number"
                        min="0"
                        max="50"
                        value={newLawyerForm.experience}
                        onChange={(e) => setNewLawyerForm({ ...newLawyerForm, experience: parseInt(e.target.value) || 0 })}
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lawyerRate">السعر/ساعة (ر.س)</Label>
                      <Input
                        id="lawyerRate"
                        type="number"
                        min="0"
                        max="10000"
                        value={newLawyerForm.hourlyRate}
                        onChange={(e) => setNewLawyerForm({ ...newLawyerForm, hourlyRate: parseInt(e.target.value) || 0 })}
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lawyerBio">نبذة عن المحامي</Label>
                    <Input
                      id="lawyerBio"
                      value={newLawyerForm.bio}
                      onChange={(e) => setNewLawyerForm({ ...newLawyerForm, bio: e.target.value })}
                      placeholder="نبذة مختصرة..."
                      className="bg-background border-border text-foreground"
                      maxLength={500}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    className="border-border"
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleCreateLawyer}
                    disabled={creatingLawyer}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {creatingLawyer ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        جاري الإضافة...
                      </>
                    ) : (
                      "إضافة المحامي"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Lawyer Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="bg-card border-border max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-primary">تعديل بيانات المحامي</DialogTitle>
                  <DialogDescription>
                    تعديل بيانات "{editingLawyer?.name}"
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center gap-3">
                    <Label>الصورة الشخصية</Label>
                    <div className="relative">
                      {avatarPreview ? (
                        <div className="relative">
                          <img
                            src={avatarPreview}
                            alt="صورة المحامي"
                            className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                            onClick={removeAvatar}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors"
                          onClick={() => avatarInputRef.current?.click()}
                        >
                          <ImagePlus className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => avatarInputRef.current?.click()}
                      className="text-xs"
                    >
                      {avatarPreview ? "تغيير الصورة" : "رفع صورة"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>التخصص</Label>
                      <Select
                        value={editLawyerForm.specialty}
                        onValueChange={(value) => setEditLawyerForm({ ...editLawyerForm, specialty: value })}
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {specialties.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>الموقع</Label>
                      <Select
                        value={editLawyerForm.location}
                        onValueChange={(value) => setEditLawyerForm({ ...editLawyerForm, location: value })}
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {locations.map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="editExperience">سنوات الخبرة</Label>
                      <Input
                        id="editExperience"
                        type="number"
                        min="0"
                        max="50"
                        value={editLawyerForm.experience}
                        onChange={(e) => setEditLawyerForm({ ...editLawyerForm, experience: parseInt(e.target.value) || 0 })}
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editRate">السعر/ساعة (ر.س)</Label>
                      <Input
                        id="editRate"
                        type="number"
                        min="0"
                        max="10000"
                        value={editLawyerForm.hourlyRate}
                        onChange={(e) => setEditLawyerForm({ ...editLawyerForm, hourlyRate: parseInt(e.target.value) || 0 })}
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    className="border-border"
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleUpdateLawyer}
                    disabled={updatingLawyer || uploadingAvatar}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {updatingLawyer || uploadingAvatar ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        {uploadingAvatar ? "جاري رفع الصورة..." : "جاري الحفظ..."}
                      </>
                    ) : (
                      "حفظ التغييرات"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المحامين</p>
                  <p className="text-2xl font-bold text-foreground">{lawyers.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">متاح الآن</p>
                  <p className="text-2xl font-bold text-foreground">
                    {lawyers.filter(l => l.available).length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Star className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">متوسط التقييم</p>
                  <p className="text-2xl font-bold text-foreground">
                    {lawyers.length > 0 
                      ? (lawyers.reduce((sum, l) => sum + (l.rating || 0), 0) / lawyers.length).toFixed(1)
                      : "0"
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="bg-card border-border mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="البحث عن محامي بالاسم أو التخصص أو البريد الإلكتروني..."
                  className="pr-10 bg-background border-border"
                />
              </div>
            </CardContent>
          </Card>

          {/* Lawyers Table */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">قائمة المحامين</CardTitle>
            </CardHeader>
            <CardContent>
              {lawyers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <UserX className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">لا يوجد محامين</h3>
                  <p className="text-muted-foreground">لم يتم تسجيل أي محامين في المنصة بعد</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-right text-muted-foreground">المحامي</TableHead>
                        <TableHead className="text-right text-muted-foreground">البريد الإلكتروني</TableHead>
                        <TableHead className="text-right text-muted-foreground">التخصص</TableHead>
                        <TableHead className="text-right text-muted-foreground">الخبرة</TableHead>
                        <TableHead className="text-right text-muted-foreground">الموقع</TableHead>
                        <TableHead className="text-right text-muted-foreground">الحالة</TableHead>
                        <TableHead className="text-right text-muted-foreground">تاريخ التسجيل</TableHead>
                        <TableHead className="text-right text-muted-foreground">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLawyers.map((lawyer) => (
                        <TableRow key={lawyer.userId} className="border-border">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {lawyer.avatarUrl ? (
                                <img
                                  src={lawyer.avatarUrl}
                                  alt={lawyer.name}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gradient-golden flex items-center justify-center text-sm font-bold text-primary-foreground">
                                  {lawyer.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-foreground">{lawyer.name}</p>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Star className="w-3 h-3 text-primary fill-primary" />
                                  {lawyer.rating.toFixed(1)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-foreground" dir="ltr">
                            {lawyer.email || "-"}
                          </TableCell>
                          <TableCell className="text-foreground">{lawyer.specialty}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-foreground">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              {lawyer.experience} سنة
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-foreground">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              {lawyer.location}
                            </div>
                          </TableCell>
                          <TableCell>
                            {lawyer.available ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                متاح
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                                غير متاح
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(lawyer.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleAvailability(lawyer.userId, lawyer.available)}
                                disabled={togglingAvailability === lawyer.userId}
                                className={lawyer.available ? "text-emerald-500 hover:text-emerald-600" : "text-muted-foreground hover:text-foreground"}
                                title={lawyer.available ? "إيقاف التوفر" : "تفعيل التوفر"}
                              >
                                {togglingAvailability === lawyer.userId ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : lawyer.available ? (
                                  <ToggleRight className="w-5 h-5" />
                                ) : (
                                  <ToggleLeft className="w-5 h-5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(lawyer)}
                                className="text-primary hover:text-primary hover:bg-primary/10"
                                title="تعديل البيانات"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  disabled={removingLawyer === lawyer.userId}
                                >
                                  {removingLawyer === lawyer.userId ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-card border-border">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-foreground">
                                    إزالة المحامي
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من إزالة "{lawyer.name}" من قائمة المحامين؟
                                    سيتم تحويله إلى مستخدم عادي.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="gap-2">
                                  <AlertDialogCancel className="border-border">إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveLawyer(lawyer.userId)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    إزالة
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            </div>
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
      </div>
    </Layout>
  );
};

export default AdminLawyers;
