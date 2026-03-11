import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, FileText, Loader2, Crown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface WordImportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

const sectorOptions = [
  { value: "عقاري", label: "عقاري" },
  { value: "تجاري", label: "تجاري" },
  { value: "شخصي", label: "شخصي" },
  { value: "عام", label: "عام" },
];

export const WordImport = ({ isOpen, onClose, onSuccess }: WordImportProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [extractedContent, setExtractedContent] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [sector, setSector] = useState("عام");
  const [isPremium, setIsPremium] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.docx') && !file.name.endsWith('.doc') && !file.name.endsWith('.txt')) {
      toast.error('يرجى اختيار ملف Word أو نص (.docx, .doc, .txt)');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);
    
    try {
      // For text files, read directly
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const text = await file.text();
        setExtractedContent(text);
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
        toast.success('تم قراءة الملف بنجاح');
      } else {
        // For Word files, use parse-document edge function
        const formData = new FormData();
        formData.append('file', file);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          toast.error('يجب تسجيل الدخول');
          return;
        }

        // Upload file temporarily and parse
        const fileExt = file.name.split('.').pop();
        const filePath = `temp/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('platform-files')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('platform-files')
          .getPublicUrl(filePath);

        // Call parse-document function
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-document`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileUrl: urlData.publicUrl, fileName: file.name }),
        });

        if (!response.ok) {
          throw new Error('فشل في قراءة الملف');
        }

        const result = await response.json();
        setExtractedContent(result.text || result.content || '');
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
        
        // Clean up temp file
        await supabase.storage.from('platform-files').remove([filePath]);
        
        toast.success('تم استخراج محتوى الملف بنجاح');
      }
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('حدث خطأ في قراءة الملف');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!title || !category || !extractedContent || !sector) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('contract_templates').insert({
        title,
        description: description || null,
        category,
        sector,
        content: extractedContent,
        is_premium: isPremium,
      });

      if (error) throw error;

      toast.success('تم استيراد النموذج بنجاح');
      onSuccess();
      handleReset();
      onClose();
    } catch (error) {
      console.error('Error importing template:', error);
      toast.error('حدث خطأ في استيراد النموذج');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFileName("");
    setExtractedContent("");
    setTitle("");
    setDescription("");
    setCategory("");
    setSector("عام");
    setIsPremium(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-golden" />
            استيراد نموذج من ملف Word
          </DialogTitle>
          <DialogDescription>
            استيراد محتوى نموذج عقد من ملف Word أو نص
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>اختر الملف</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-golden/30 rounded-lg cursor-pointer hover:border-golden/50 transition-colors bg-muted/30"
            >
              {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin text-golden" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-golden mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {fileName || "اختر ملف Word أو نص (.docx, .doc, .txt)"}
                  </span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept=".docx,.doc,.txt"
              />
            </div>
          </div>

          {extractedContent && (
            <>
              {/* Title & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>عنوان النموذج *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="عنوان العقد"
                  />
                </div>
                <div className="space-y-2">
                  <Label>التصنيف *</Label>
                  <Select value={category} onValueChange={setCategory}>
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

              {/* Sector */}
              <div className="space-y-2">
                <Label>القطاع *</Label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القطاع" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectorOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف مختصر للنموذج..."
                  className="resize-none h-20"
                />
              </div>

              {/* Content Preview */}
              <div className="space-y-2">
                <Label>محتوى العقد</Label>
                <Textarea
                  value={extractedContent}
                  onChange={(e) => setExtractedContent(e.target.value)}
                  placeholder="محتوى العقد المستخرج..."
                  className="resize-none h-48 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  استخدم {"{{اسم_الحقل}}"} لإضافة حقول قابلة للتعبئة
                </p>
              </div>

              {/* Premium Toggle */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Switch
                  checked={isPremium}
                  onCheckedChange={setIsPremium}
                />
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Crown className="w-4 h-4 text-golden" />
                  نموذج مميز (للمشتركين فقط)
                </Label>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            onClick={handleImport}
            disabled={isLoading || !extractedContent || !title || !category}
            className="bg-golden hover:bg-golden/90 text-background"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : (
              <FileText className="w-4 h-4 ml-2" />
            )}
            استيراد النموذج
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WordImport;
