import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface EditTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  sector: string | null;
  content: string;
  is_public: boolean;
}

interface UserTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editTemplate?: EditTemplate | null;
}

const categories = [
  "عقود العمل",
  "عقود الإيجار",
  "عقود البيع",
  "عقود الشراكة",
  "عقود الخدمات",
  "عقود الوكالات",
  "عقود التوريد",
  "عقود أخرى",
];

const sectors = [
  { value: "عقاري", label: "عقاري" },
  { value: "تجاري", label: "تجاري" },
  { value: "شخصي", label: "شخصي" },
  { value: "عام", label: "عام" },
];

export const UserTemplateForm = ({ isOpen, onClose, onSuccess, editTemplate }: UserTemplateFormProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    sector: "عام",
    content: "",
    is_public: false,
  });

  const isEditMode = !!editTemplate;

  useEffect(() => {
    if (editTemplate) {
      setFormData({
        title: editTemplate.title,
        description: editTemplate.description || "",
        category: editTemplate.category,
        sector: editTemplate.sector || "عام",
        content: editTemplate.content,
        is_public: editTemplate.is_public,
      });
    } else {
      setFormData({
        title: "",
        description: "",
        category: "",
        sector: "عام",
        content: "",
        is_public: false,
      });
    }
  }, [editTemplate, isOpen]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول');
      return;
    }

    if (!formData.title.trim() || !formData.content.trim() || !formData.category) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && editTemplate) {
        const { error } = await supabase
          .from('user_contract_templates')
          .update({
            title: formData.title.trim(),
            description: formData.description.trim(),
            category: formData.category,
            sector: formData.sector,
            content: formData.content,
            is_public: formData.is_public,
          })
          .eq('id', editTemplate.id);

        if (error) throw error;
        toast.success('تم تحديث القالب بنجاح');
      } else {
        const { error } = await supabase.from('user_contract_templates').insert({
          user_id: user.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          sector: formData.sector,
          content: formData.content,
          is_public: formData.is_public,
        });

        if (error) throw error;
        toast.success('تم إنشاء القالب بنجاح');
      }

      setFormData({
        title: "",
        description: "",
        category: "",
        sector: "عام",
        content: "",
        is_public: false,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(isEditMode ? 'حدث خطأ في تحديث القالب' : 'حدث خطأ في إنشاء القالب');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-golden" />
            {isEditMode ? 'تعديل قالب العقد' : 'إنشاء قالب عقد مخصص'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'قم بتعديل بيانات القالب' : 'أنشئ قالب عقد خاص بك يمكنك إعادة استخدامه'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">عنوان القالب *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="مثال: عقد توظيف مطور"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">وصف القالب</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="وصف مختصر للقالب"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>التصنيف *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>القطاع</Label>
              <Select
                value={formData.sector}
                onValueChange={(value) => setFormData(prev => ({ ...prev, sector: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر القطاع" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((sec) => (
                    <SelectItem key={sec.value} value={sec.value}>{sec.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">محتوى القالب *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="اكتب نص العقد هنا... استخدم {{اسم_الحقل}} للحقول القابلة للتعبئة"
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              نصيحة: استخدم {'{{اسم_الحقل}}'} لإضافة حقول قابلة للتعبئة، مثل: {'{{اسم_الطرف_الأول}}'}, {'{{تاريخ_العقد}}'}
            </p>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="is_public" className="font-medium">مشاركة القالب</Label>
              <p className="text-xs text-muted-foreground">السماح للآخرين باستخدام هذا القالب</p>
            </div>
            <Switch
              id="is_public"
              checked={formData.is_public}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button 
            variant="golden"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 ml-2" />
            )}
            {isSubmitting ? 'جاري الحفظ...' : (isEditMode ? 'حفظ التغييرات' : 'إنشاء القالب')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserTemplateForm;
