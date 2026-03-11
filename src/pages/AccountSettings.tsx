import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Shield, 
  CreditCard, 
  Camera, 
  Loader2, 
  Save,
  Calendar,
  Crown,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  CheckCircle,
  XCircle,
  Copy,
  Volume2,
  VolumeX,
  Sparkles
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

const AccountSettings = () => {
  const { user, loading: authLoading, subscription, userRole, isAdmin, isLawyer } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { preferences, setSplashSoundEnabled, setPageTransitionsEnabled } = useUserPreferences();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // 2FA state
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<{ qr: string; secret: string; factorId: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      fetchProfile();
      fetchMfaFactors();
    }
  }, [user, authLoading, navigate]);

  const fetchMfaFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const totpFactors = data.totp || [];
      setMfaFactors(totpFactors);
      setMfaEnabled(totpFactors.some((f: any) => f.status === 'verified'));
    } catch (error) {
      console.error("Error fetching MFA factors:", error);
    }
  };

  const handleEnrollMfa = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'محامي كوم - TOTP'
      });

      if (error) throw error;

      setEnrollmentData({
        qr: data.totp.qr_code,
        secret: data.totp.secret,
        factorId: data.id
      });
      setShowEnrollDialog(true);
    } catch (error: any) {
      console.error("Error enrolling MFA:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في تفعيل المصادقة الثنائية",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!enrollmentData || verifyCode.length !== 6) return;

    setVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollmentData.factorId
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollmentData.factorId,
        challengeId: challengeData.id,
        code: verifyCode
      });

      if (verifyError) throw verifyError;

      toast({
        title: "تم التفعيل",
        description: "تم تفعيل المصادقة الثنائية بنجاح",
      });

      setShowEnrollDialog(false);
      setEnrollmentData(null);
      setVerifyCode("");
      fetchMfaFactors();
    } catch (error: any) {
      console.error("Error verifying MFA:", error);
      toast({
        title: "خطأ",
        description: error.message || "رمز التحقق غير صحيح",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleDisableMfa = async () => {
    const verifiedFactor = mfaFactors.find(f => f.status === 'verified');
    if (!verifiedFactor) return;

    setDisabling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: verifiedFactor.id
      });

      if (error) throw error;

      toast({
        title: "تم الإلغاء",
        description: "تم إلغاء المصادقة الثنائية",
      });

      fetchMfaFactors();
    } catch (error: any) {
      console.error("Error disabling MFA:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في إلغاء المصادقة الثنائية",
        variant: "destructive",
      });
    } finally {
      setDisabling(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "تم النسخ",
      description: "تم نسخ الرمز السري",
    });
  };

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;
      
      toast({
        title: "تم الحفظ",
        description: "تم تحديث البيانات بنجاح",
      });
      
      fetchProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في حفظ البيانات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // Validate inputs
    if (!newPassword || !confirmPassword) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمة المرور الجديدة غير متطابقة",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تغيير كلمة المرور بنجاح",
      });

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ في تغيير كلمة المرور",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف صورة صالح",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الصورة يجب أن لا يتجاوز 2 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("platform-files")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("platform-files")
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          avatar_url: urlData.publicUrl, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "تم التحديث",
        description: "تم تحديث الصورة الشخصية بنجاح",
      });

      fetchProfile();
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في رفع الصورة",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getRoleBadge = () => {
    if (isAdmin) return { label: "مسؤول", variant: "destructive" as const };
    if (isLawyer) return { label: "محامي", variant: "default" as const };
    return { label: "عميل", variant: "secondary" as const };
  };

  const getSubscriptionBadge = () => {
    if (!subscription.subscribed) {
      return { label: "مجاني", variant: "outline" as const };
    }
    switch (subscription.planType) {
      case "basic":
        return { label: "أساسي", variant: "secondary" as const };
      case "professional":
        return { label: "احترافي", variant: "default" as const };
      case "enterprise":
        return { label: "مؤسسات", variant: "destructive" as const };
      default:
        return { label: subscription.planType, variant: "secondary" as const };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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

  const roleBadge = getRoleBadge();
  const subscriptionBadge = getSubscriptionBadge();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-2">إعدادات الحساب</h1>
            <p className="text-muted-foreground">إدارة معلوماتك الشخصية وإعدادات حسابك</p>
          </div>

          <div className="space-y-6">
            {/* Profile Card */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-golden" />
                  الملف الشخصي
                </CardTitle>
                <CardDescription>معلوماتك الشخصية الأساسية</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="w-24 h-24 border-2 border-golden/30">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-golden/10 text-golden text-2xl">
                        {fullName?.charAt(0) || user?.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 left-0 p-1.5 bg-golden rounded-full cursor-pointer hover:bg-golden/80 transition-colors"
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-background" />
                      ) : (
                        <Camera className="w-4 h-4 text-background" />
                      )}
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{fullName || "مستخدم جديد"}</h3>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                      <Badge variant={subscriptionBadge.variant}>
                        <Crown className="w-3 h-3 ml-1" />
                        {subscriptionBadge.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Form Fields */}
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">الاسم الكامل</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="أدخل اسمك الكامل"
                      className="text-right"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        value={user?.email || ""}
                        disabled
                        className="text-right bg-muted/50"
                      />
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      لا يمكن تغيير البريد الإلكتروني
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full bg-golden hover:bg-golden/90 text-background"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Save className="w-4 h-4 ml-2" />
                  )}
                  حفظ التغييرات
                </Button>
              </CardContent>
            </Card>

            {/* Account Info Card */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-golden" />
                  معلومات الحساب
                </CardTitle>
                <CardDescription>تفاصيل حسابك ودورك في المنصة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Shield className="w-4 h-4" />
                      الدور
                    </div>
                    <Badge variant={roleBadge.variant} className="text-sm">
                      {roleBadge.label}
                    </Badge>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="w-4 h-4" />
                      تاريخ الانضمام
                    </div>
                    <p className="font-medium">
                      {profile?.created_at ? formatDate(profile.created_at) : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Card - Password Change */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-golden" />
                  الأمان
                </CardTitle>
                <CardDescription>تغيير كلمة المرور وإعدادات الأمان</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الجديدة"
                      className="text-right pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">يجب أن تكون 6 أحرف على الأقل</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور الجديدة"
                      className="text-right pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || !confirmPassword}
                  variant="outline"
                  className="w-full border-golden/30 hover:bg-golden/10"
                >
                  {changingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Lock className="w-4 h-4 ml-2" />
                  )}
                  تغيير كلمة المرور
                </Button>

                <Separator className="my-4" />

                {/* 2FA Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-golden/10">
                        <Smartphone className="w-5 h-5 text-golden" />
                      </div>
                      <div>
                        <h4 className="font-medium">المصادقة الثنائية (2FA)</h4>
                        <p className="text-sm text-muted-foreground">
                          حماية إضافية باستخدام تطبيق المصادقة
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {mfaEnabled ? (
                        <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="w-3 h-3 ml-1" />
                          مفعّل
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          <XCircle className="w-3 h-3 ml-1" />
                          غير مفعّل
                        </Badge>
                      )}
                    </div>
                  </div>

                  {mfaEnabled ? (
                    <Button
                      onClick={handleDisableMfa}
                      disabled={disabling}
                      variant="outline"
                      className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      {disabling ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      ) : (
                        <XCircle className="w-4 h-4 ml-2" />
                      )}
                      إلغاء المصادقة الثنائية
                    </Button>
                  ) : (
                    <Button
                      onClick={handleEnrollMfa}
                      disabled={enrolling}
                      variant="outline"
                      className="w-full border-golden/30 hover:bg-golden/10"
                    >
                      {enrolling ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      ) : (
                        <Smartphone className="w-4 h-4 ml-2" />
                      )}
                      تفعيل المصادقة الثنائية
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Subscription Card */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-golden" />
                  الاشتراك
                </CardTitle>
                <CardDescription>تفاصيل اشتراكك الحالي</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/30">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-5 h-5 text-golden" />
                      <span className="font-semibold">الخطة الحالية</span>
                    </div>
                    <Badge variant={subscriptionBadge.variant} className="text-sm">
                      {subscriptionBadge.label}
                    </Badge>
                    {subscription.subscriptionEnd && (
                      <p className="text-sm text-muted-foreground mt-2">
                        تنتهي في: {formatDate(subscription.subscriptionEnd)}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/pricing")}
                    className="border-golden/30 hover:bg-golden/10"
                  >
                    إدارة الاشتراك
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preferences Card */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-golden" />
                  التفضيلات
                </CardTitle>
                <CardDescription>تخصيص تجربة المستخدم</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Splash Sound Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-golden/10">
                      {preferences.splashSoundEnabled ? (
                        <Volume2 className="w-5 h-5 text-golden" />
                      ) : (
                        <VolumeX className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">صوت شاشة البداية</h4>
                      <p className="text-sm text-muted-foreground">
                        تشغيل صوت عند ظهور شاشة البداية
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.splashSoundEnabled}
                    onCheckedChange={setSplashSoundEnabled}
                  />
                </div>

                <Separator />

                {/* Page Transitions Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-golden/10">
                      <Sparkles className="w-5 h-5 text-golden" />
                    </div>
                    <div>
                      <h4 className="font-medium">تأثيرات الانتقال</h4>
                      <p className="text-sm text-muted-foreground">
                        تأثيرات انتقال سلسة بين الصفحات
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.pageTransitionsEnabled}
                    onCheckedChange={setPageTransitionsEnabled}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* 2FA Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-golden" />
              تفعيل المصادقة الثنائية
            </DialogTitle>
            <DialogDescription>
              امسح رمز QR باستخدام تطبيق المصادقة مثل Google Authenticator أو Authy
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {enrollmentData && (
              <>
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg">
                    <img 
                      src={enrollmentData.qr} 
                      alt="QR Code for 2FA" 
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                {/* Secret Key */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    أو أدخل الرمز السري يدوياً:
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={enrollmentData.secret}
                      readOnly
                      className="font-mono text-sm text-center"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(enrollmentData.secret)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Verification Code */}
                <div className="space-y-2">
                  <Label>أدخل رمز التحقق من التطبيق:</Label>
                  <div className="flex justify-center" dir="ltr">
                    <InputOTP
                      maxLength={6}
                      value={verifyCode}
                      onChange={setVerifyCode}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <Button
                  onClick={handleVerifyMfa}
                  disabled={verifying || verifyCode.length !== 6}
                  className="w-full bg-golden hover:bg-golden/90 text-background"
                >
                  {verifying ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 ml-2" />
                  )}
                  تأكيد وتفعيل
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AccountSettings;
