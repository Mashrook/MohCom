import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Download,
  Star,
  Crown,
  Loader2,
  ArrowRight,
  Search,
  Tag,
  Variable,
  Copy,
  Check,
  Upload
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import WordImport from "@/components/contracts/WordImport";

interface ContractTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content: string;
  is_premium: boolean | null;
  downloads_count: number | null;
  average_rating: number | null;
  ratings_count: number | null;
  created_at: string;
  updated_at: string;
}

interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea';
  required: boolean;
  placeholder?: string;
}

const contractCategories = [
  "عقود العمل",
  "عقود الإيجار",
  "عقود البيع",
  "عقود الشراكة",
  "عقود الخدمات",
  "عقود الوكالات",
  "عقود التوريد",
  "عقود أخرى",
];

const predefinedFields: TemplateField[] = [
  { name: "اسم_الطرف_الأول", label: "اسم الطرف الأول", type: "text", required: true },
  { name: "اسم_الطرف_الثاني", label: "اسم الطرف الثاني", type: "text", required: true },
  { name: "رقم_الهوية_الطرف_الأول", label: "رقم هوية الطرف الأول", type: "text", required: true },
  { name: "رقم_الهوية_الطرف_الثاني", label: "رقم هوية الطرف الثاني", type: "text", required: true },
  { name: "عنوان_الطرف_الأول", label: "عنوان الطرف الأول", type: "textarea", required: false },
  { name: "عنوان_الطرف_الثاني", label: "عنوان الطرف الثاني", type: "textarea", required: false },
  { name: "تاريخ_العقد", label: "تاريخ العقد", type: "date", required: true },
  { name: "تاريخ_البداية", label: "تاريخ بداية العقد", type: "date", required: false },
  { name: "تاريخ_النهاية", label: "تاريخ نهاية العقد", type: "date", required: false },
  { name: "المبلغ", label: "المبلغ", type: "number", required: false },
  { name: "المبلغ_بالحروف", label: "المبلغ بالحروف", type: "text", required: false },
  { name: "مدة_العقد", label: "مدة العقد", type: "text", required: false },
  { name: "المدينة", label: "المدينة", type: "text", required: false },
  { name: "رقم_السجل_التجاري", label: "رقم السجل التجاري", type: "text", required: false },
  { name: "الراتب", label: "الراتب الشهري", type: "number", required: false },
  { name: "المسمى_الوظيفي", label: "المسمى الوظيفي", type: "text", required: false },
  { name: "موقع_العمل", label: "موقع العمل", type: "text", required: false },
  { name: "وصف_العقار", label: "وصف العقار", type: "textarea", required: false },
  { name: "رقم_العقار", label: "رقم العقار", type: "text", required: false },
  { name: "القيمة_الإيجارية", label: "القيمة الإيجارية", type: "number", required: false },
];

const AdminContracts = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showWordImport, setShowWordImport] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formIsPremium, setFormIsPremium] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/admin");
      return;
    }
    fetchTemplates();
  }, [isAdmin, navigate]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("حدث خطأ في تحميل النماذج");
    } finally {
      setLoading(false);
    }
  };

  const extractFieldsFromContent = (content: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = content.match(regex) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
  };

  const copyFieldToClipboard = (fieldName: string) => {
    navigator.clipboard.writeText(`{{${fieldName}}}`);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success(`تم نسخ {{${fieldName}}}`);
  };

  const insertFieldAtCursor = (fieldName: string) => {
    const textarea = document.getElementById('contract-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formContent;
      const fieldText = `{{${fieldName}}}`;
      setFormContent(text.substring(0, start) + fieldText + text.substring(end));
      // Focus and set cursor position after field
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + fieldText.length, start + fieldText.length);
      }, 0);
    } else {
      setFormContent(formContent + `{{${fieldName}}}`);
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormCategory("");
    setFormContent("");
    setFormIsPremium(false);
  };

  const handleAdd = async () => {
    if (!formTitle || !formCategory || !formContent) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("contract_templates").insert({
        title: formTitle,
        description: formDescription || null,
        category: formCategory,
        content: formContent,
        is_premium: formIsPremium,
      });

      if (error) throw error;

      toast.success("تم إضافة النموذج بنجاح");
      setShowAddDialog(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error("Error adding template:", error);
      toast.error("حدث خطأ في إضافة النموذج");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedTemplate || !formTitle || !formCategory || !formContent) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("contract_templates")
        .update({
          title: formTitle,
          description: formDescription || null,
          category: formCategory,
          content: formContent,
          is_premium: formIsPremium,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTemplate.id);

      if (error) throw error;

      toast.success("تم تحديث النموذج بنجاح");
      setShowEditDialog(false);
      resetForm();
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("حدث خطأ في تحديث النموذج");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("contract_templates")
        .delete()
        .eq("id", selectedTemplate.id);

      if (error) throw error;

      toast.success("تم حذف النموذج بنجاح");
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("حدث خطأ في حذف النموذج");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setFormTitle(template.title);
    setFormDescription(template.description || "");
    setFormCategory(template.category);
    setFormContent(template.content);
    setFormIsPremium(template.is_premium || false);
    setShowEditDialog(true);
  };

  const openPreviewDialog = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewDialog(true);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const FieldSelector = () => (
    <Card className="border-border/50 bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Variable className="w-4 h-4 text-golden" />
          الحقول الجاهزة
        </CardTitle>
        <CardDescription className="text-xs">
          انقر لإدراج الحقل في محتوى العقد
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {predefinedFields.map((field) => (
            <Button
              key={field.name}
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => insertFieldAtCursor(field.name)}
            >
              <Tag className="w-3 h-3" />
              {field.label}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyFieldToClipboard(field.name);
                }}
                className="mr-1 p-0.5 hover:bg-muted rounded"
              >
                {copiedField === field.name ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3 text-muted-foreground" />
                )}
              </button>
            </Button>
          ))}
        </div>
        <div className="mt-3 p-2 bg-background/50 rounded text-xs text-muted-foreground">
          <strong>ملاحظة:</strong> استخدم الصيغة <code className="bg-muted px-1 rounded">{`{{اسم_الحقل}}`}</code> لإضافة حقول مخصصة
        </div>
      </CardContent>
    </Card>
  );

  const TemplateFormDialog = ({ 
    open, 
    onOpenChange, 
    title, 
    onSubmit, 
    isEdit = false 
  }: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    title: string; 
    onSubmit: () => void; 
    isEdit?: boolean;
  }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-golden" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "تعديل نموذج العقد الحالي" : "إضافة نموذج عقد جديد مع الحقول القابلة للتعبئة"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">عنوان النموذج *</Label>
                <Input
                  id="title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: عقد إيجار سكني"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">التصنيف *</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="وصف مختصر للنموذج..."
                className="text-right resize-none h-20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract-content">محتوى العقد *</Label>
              <Textarea
                id="contract-content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="اكتب نص العقد هنا واستخدم {{اسم_الحقل}} للحقول القابلة للتعبئة..."
                className="text-right resize-none h-64 font-mono text-sm"
                dir="rtl"
              />
              {formContent && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">الحقول المستخدمة:</span>
                  {extractFieldsFromContent(formContent).map((field) => (
                    <Badge key={field} variant="secondary" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                  {extractFieldsFromContent(formContent).length === 0 && (
                    <span className="text-xs text-muted-foreground">لا توجد حقول</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Switch
                id="is-premium"
                checked={formIsPremium}
                onCheckedChange={setFormIsPremium}
              />
              <Label htmlFor="is-premium" className="flex items-center gap-2 cursor-pointer">
                <Crown className="w-4 h-4 text-golden" />
                نموذج مميز (للمشتركين فقط)
              </Label>
            </div>
          </div>

          {/* Field Selector Sidebar */}
          <div className="lg:col-span-1">
            <FieldSelector />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            onClick={onSubmit}
            disabled={saving}
            className="bg-golden hover:bg-golden/90 text-background"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : null}
            {isEdit ? "حفظ التغييرات" : "إضافة النموذج"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-golden" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="gap-1"
                >
                  <ArrowRight className="w-4 h-4" />
                  لوحة التحكم
                </Button>
              </div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <FileText className="w-8 h-8 text-golden" />
                إدارة نماذج العقود
              </h1>
              <p className="text-muted-foreground mt-1">
                إضافة وتعديل نماذج العقود مع الحقول القابلة للتعبئة
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowWordImport(true)}
              >
                <Upload className="w-4 h-4 ml-2" />
                استيراد من Word
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setShowAddDialog(true);
                }}
                className="bg-golden hover:bg-golden/90 text-background"
              >
                <Plus className="w-4 h-4 ml-2" />
                إضافة نموذج جديد
              </Button>
            </div>
          </div>

          {/* Word Import Dialog */}
          <WordImport
            isOpen={showWordImport}
            onClose={() => setShowWordImport(false)}
            onSuccess={fetchTemplates}
          />

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-golden">{templates.length}</div>
                <div className="text-sm text-muted-foreground">إجمالي النماذج</div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-golden">
                  {templates.filter(t => t.is_premium).length}
                </div>
                <div className="text-sm text-muted-foreground">نماذج مميزة</div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-golden">
                  {templates.reduce((acc, t) => acc + (t.downloads_count || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">إجمالي التحميلات</div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-golden">
                  {[...new Set(templates.map(t => t.category))].length}
                </div>
                <div className="text-sm text-muted-foreground">التصنيفات</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="border-border/50 bg-card/50 mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="البحث في النماذج..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 text-right"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="جميع التصنيفات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع التصنيفات</SelectItem>
                    {contractCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Templates Table */}
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">النموذج</TableHead>
                    <TableHead className="text-right">التصنيف</TableHead>
                    <TableHead className="text-right">الحقول</TableHead>
                    <TableHead className="text-right">التحميلات</TableHead>
                    <TableHead className="text-right">التقييم</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">لا توجد نماذج</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTemplates.map((template) => {
                      const fields = extractFieldsFromContent(template.content);
                      return (
                        <TableRow key={template.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{template.title}</div>
                              {template.description && (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {template.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{template.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{fields.length} حقل</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Download className="w-3 h-3 text-muted-foreground" />
                              {template.downloads_count || 0}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-golden fill-golden" />
                              {template.average_rating?.toFixed(1) || "0.0"}
                              <span className="text-xs text-muted-foreground">
                                ({template.ratings_count || 0})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {template.is_premium ? (
                              <Badge className="bg-golden/20 text-golden border-golden/30">
                                <Crown className="w-3 h-3 ml-1" />
                                مميز
                              </Badge>
                            ) : (
                              <Badge variant="secondary">مجاني</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openPreviewDialog(template)}
                                title="معاينة"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(template)}
                                title="تعديل"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setShowDeleteDialog(true);
                                }}
                                className="text-destructive hover:text-destructive"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Dialog */}
      <TemplateFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        title="إضافة نموذج عقد جديد"
        onSubmit={handleAdd}
      />

      {/* Edit Dialog */}
      <TemplateFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        title="تعديل نموذج العقد"
        onSubmit={handleEdit}
        isEdit
      />

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-golden" />
              معاينة النموذج
            </DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{selectedTemplate.category}</Badge>
                {selectedTemplate.is_premium && (
                  <Badge className="bg-golden/20 text-golden border-golden/30">
                    <Crown className="w-3 h-3 ml-1" />
                    مميز
                  </Badge>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-1">الحقول المستخدمة:</h3>
                <div className="flex flex-wrap gap-1">
                  {extractFieldsFromContent(selectedTemplate.content).map((field) => (
                    <Badge key={field} variant="secondary" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed" dir="rtl">
                  {selectedTemplate.content}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف النموذج</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف نموذج "{selectedTemplate?.title}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default AdminContracts;
