import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Briefcase, 
  Upload, 
  CheckCircle, 
  FileText, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Award,
  Loader2,
  Scale,
  Gavel
} from "lucide-react";
import { z } from "zod";

const specialtyOptions = [
  { id: "labor", label: "القضايا العمالية", icon: "👷" },
  { id: "commercial", label: "القضايا التجارية", icon: "💼" },
  { id: "criminal", label: "القضايا الجنائية", icon: "⚖️" },
  { id: "family", label: "قضايا الأحوال الشخصية", icon: "👨‍👩‍👧" },
  { id: "real_estate", label: "القضايا العقارية", icon: "🏠" },
  { id: "intellectual", label: "الملكية الفكرية", icon: "💡" },
  { id: "administrative", label: "القضايا الإدارية", icon: "🏛️" },
  { id: "banking", label: "القضايا المصرفية", icon: "🏦" },
  { id: "insurance", label: "قضايا التأمين", icon: "🛡️" },
  { id: "traffic", label: "القضايا المرورية", icon: "🚗" },
];

const locations = ["الرياض", "جدة", "الدمام", "مكة", "المدينة", "الخبر", "الطائف", "تبوك", "أبها", "نجران"];

const applicationSchema = z.object({
  fullName: z.string().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل").max(100),
  email: z.string().email("البريد الإلكتروني غير صحيح").max(255),
  phone: z.string().min(10, "رقم الهاتف غير صحيح").max(15),
  licenseNumber: z.string().min(5, "رقم الرخصة غير صحيح").max(50),
  specialties: z.array(z.string()).min(1, "يجب اختيار تخصص واحد على الأقل"),
  location: z.string().min(1, "المدينة مطلوبة"),
  experience: z.number().min(1).max(50),
  bio: z.string().max(500).optional(),
  providesLitigation: z.boolean(),
});

const LawyerApply = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    licenseNumber: "",
    specialties: [] as string[],
    location: "الرياض",
    experience: 1,
    bio: "",
    providesLitigation: false,
  });

  const handleSpecialtyToggle = (specialtyId: string) => {
    setForm(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialtyId)
        ? prev.specialties.filter(s => s !== specialtyId)
        : [...prev.specialties, specialtyId]
    }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "خطأ",
          description: "حجم الملف يجب أن يكون أقل من 10 ميجابايت",
          variant: "destructive",
        });
        return;
      }
      setFile(file);
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('lawyer-documents')
      .upload(fileName, file);
    
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    
    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    try {
      applicationSchema.parse({
        ...form,
        experience: Number(form.experience),
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "خطأ في البيانات",
          description: err.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    if (!licenseFile) {
      toast({
        title: "خطأ",
        description: "يرجى رفع صورة رخصة المحاماة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Upload files
      const licenseUrl = await uploadFile(licenseFile, 'licenses');
      const idUrl = idFile ? await uploadFile(idFile, 'ids') : null;

      if (!licenseUrl) {
        throw new Error("فشل رفع ملف الرخصة");
      }

      // Convert specialty IDs to labels for storage
      const specialtyLabels = form.specialties.map(id => 
        specialtyOptions.find(s => s.id === id)?.label || id
      ).join("، ");

      // Submit application
      const { error } = await supabase
        .from('lawyer_applications')
        .insert({
          full_name: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          license_number: form.licenseNumber.trim(),
          specialty: specialtyLabels + (form.providesLitigation ? " | خدمات الترافع العامة" : ""),
          location: form.location,
          experience_years: Number(form.experience),
          bio: form.bio.trim() || null,
          license_file_url: licenseUrl,
          id_file_url: idUrl,
        });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "تم إرسال الطلب بنجاح",
        description: "سيتم مراجعة طلبك والرد عليك قريباً",
      });
    } catch (error: any) {
      console.error('Submit error:', error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في إرسال الطلب",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Layout>
        <section className="py-12 min-h-screen flex items-center justify-center">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-8 pb-8">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                تم إرسال طلبك بنجاح
              </h2>
              <p className="text-muted-foreground mb-6">
                شكراً لتقديم طلبك للانضمام إلى منصة محامي كوم. سيتم مراجعة طلبك من قبل فريقنا والرد عليك عبر البريد الإلكتروني خلال 3-5 أيام عمل.
              </p>
              <Button variant="golden" onClick={() => window.location.href = "/"}>
                العودة للرئيسية
              </Button>
            </CardContent>
          </Card>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-12 min-h-screen">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              انضم إلينا
            </span>
            <h1 className="font-cairo font-bold text-3xl md:text-4xl text-foreground mb-4">
              تقديم طلب الانضمام كمحامي
            </h1>
            <p className="text-muted-foreground">
              انضم إلى نخبة المحامين المعتمدين على منصة محامي كوم وابدأ في تقديم خدماتك القانونية للعملاء
            </p>
          </div>

          {/* Form */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                بيانات الطلب
              </CardTitle>
              <CardDescription>
                يرجى تعبئة جميع الحقول المطلوبة بدقة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      الاسم الكامل *
                    </Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      placeholder="أدخل اسمك الكامل"
                      required
                      maxLength={100}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      البريد الإلكتروني *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="example@email.com"
                      required
                      maxLength={255}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      رقم الهاتف *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="05xxxxxxxx"
                      required
                      maxLength={15}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber" className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      رقم رخصة المحاماة *
                    </Label>
                    <Input
                      id="licenseNumber"
                      value={form.licenseNumber}
                      onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                      placeholder="أدخل رقم الرخصة"
                      required
                      maxLength={50}
                    />
                  </div>
                </div>

                {/* Specialties Selection */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    التخصصات القانونية * (اختر تخصصاً واحداً أو أكثر)
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/30 border border-border">
                    {specialtyOptions.map((specialty) => (
                      <div
                        key={specialty.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          form.specialties.includes(specialty.id)
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                        onClick={() => handleSpecialtyToggle(specialty.id)}
                      >
                        <Checkbox
                          id={specialty.id}
                          checked={form.specialties.includes(specialty.id)}
                          onCheckedChange={() => handleSpecialtyToggle(specialty.id)}
                        />
                        <span className="text-lg">{specialty.icon}</span>
                        <Label
                          htmlFor={specialty.id}
                          className="cursor-pointer text-sm font-medium flex-1"
                        >
                          {specialty.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {form.specialties.length > 0 && (
                    <p className="text-sm text-primary">
                      التخصصات المختارة: {form.specialties.length}
                    </p>
                  )}
                </div>

                {/* Litigation Services */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setForm({ ...form, providesLitigation: !form.providesLitigation })}
                  >
                    <Checkbox
                      id="providesLitigation"
                      checked={form.providesLitigation}
                      onCheckedChange={(checked) => 
                        setForm({ ...form, providesLitigation: checked as boolean })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="providesLitigation"
                        className="cursor-pointer flex items-center gap-2 text-base font-semibold"
                      >
                        <Gavel className="w-5 h-5 text-primary" />
                        أقدم خدمات الترافع أمام المحاكم
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        حدد هذا الخيار إذا كنت تقدم خدمات التمثيل والترافع أمام المحاكم بجميع درجاتها
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location & Experience */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      المدينة *
                    </Label>
                    <Select
                      value={form.location}
                      onValueChange={(value) => setForm({ ...form, location: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience">سنوات الخبرة *</Label>
                    <Input
                      id="experience"
                      type="number"
                      min={1}
                      max={50}
                      value={form.experience}
                      onChange={(e) => setForm({ ...form, experience: parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">نبذة عنك (اختياري)</Label>
                  <Textarea
                    id="bio"
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="اكتب نبذة قصيرة عن خبرتك وإنجازاتك المهنية..."
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-left">
                    {form.bio.length}/500
                  </p>
                </div>

                {/* File Uploads */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    المستندات المطلوبة
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="licenseFile" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      صورة رخصة المحاماة * (PDF أو صورة)
                    </Label>
                    <Input
                      id="licenseFile"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, setLicenseFile)}
                      className="cursor-pointer"
                    />
                    {licenseFile && (
                      <p className="text-sm text-emerald-500">✓ تم اختيار: {licenseFile.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idFile" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      صورة الهوية (اختياري)
                    </Label>
                    <Input
                      id="idFile"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, setIdFile)}
                      className="cursor-pointer"
                    />
                    {idFile && (
                      <p className="text-sm text-emerald-500">✓ تم اختيار: {idFile.name}</p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="golden"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      جاري الإرسال...
                    </>
                  ) : (
                    "إرسال الطلب"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  بالضغط على "إرسال الطلب" فإنك توافق على شروط الاستخدام وسياسة الخصوصية
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default LawyerApply;
