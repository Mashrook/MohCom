import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Printer, 
  FileText, 
  RefreshCw,
  Edit3,
  Download,
  Loader2,
  Save,
  PenTool,
  Share2,
  Library
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { loadCairoFont } from "@/utils/arabicFont";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ElectronicSignature, { SignatureData } from "./ElectronicSignature";
import SavedSignaturesManager from "./SavedSignaturesManager";
import ShareContractDialog from "./ShareContractDialog";

interface ContractTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  content: string;
}

interface ContractFillFormProps {
  template: ContractTemplate | null;
  isOpen: boolean;
  onClose: () => void;
}

interface FormField {
  key: string;
  label: string;
  value: string;
  placeholder: string;
}

// Extract placeholders from contract template (format: [placeholder_name] or {{placeholder_name}})
const extractPlaceholders = (content: string): FormField[] => {
  const placeholderRegex = /\[([^\]]+)\]|\{\{([^}]+)\}\}/g;
  const matches = new Set<string>();
  let match;
  
  while ((match = placeholderRegex.exec(content)) !== null) {
    const placeholder = match[1] || match[2];
    if (placeholder) {
      matches.add(placeholder.trim());
    }
  }
  
  // Common Arabic contract placeholders with labels
  const labelMap: Record<string, string> = {
    'اسم_الطرف_الأول': 'اسم الطرف الأول',
    'اسم_الطرف_الثاني': 'اسم الطرف الثاني',
    'رقم_الهوية_الأول': 'رقم هوية الطرف الأول',
    'رقم_الهوية_الثاني': 'رقم هوية الطرف الثاني',
    'العنوان_الأول': 'عنوان الطرف الأول',
    'العنوان_الثاني': 'عنوان الطرف الثاني',
    'تاريخ_العقد': 'تاريخ العقد',
    'مدة_العقد': 'مدة العقد',
    'قيمة_العقد': 'قيمة العقد',
    'المبلغ': 'المبلغ',
    'الراتب': 'الراتب الشهري',
    'المسمى_الوظيفي': 'المسمى الوظيفي',
    'تاريخ_البداية': 'تاريخ بداية العقد',
    'تاريخ_النهاية': 'تاريخ نهاية العقد',
    'العنوان': 'العنوان',
    'رقم_الجوال': 'رقم الجوال',
    'البريد_الإلكتروني': 'البريد الإلكتروني',
    'اسم_الشركة': 'اسم الشركة',
    'رقم_السجل_التجاري': 'رقم السجل التجاري',
    'المدينة': 'المدينة',
    'الحي': 'الحي',
    'رقم_العقار': 'رقم العقار',
    'مساحة_العقار': 'مساحة العقار',
    'قيمة_الإيجار': 'قيمة الإيجار',
    'طريقة_الدفع': 'طريقة الدفع',
    'نوع_العمل': 'نوع العمل',
    'ساعات_العمل': 'ساعات العمل',
    'الإجازات': 'الإجازات',
    'اسم_المالك': 'اسم المالك',
    'اسم_المستأجر': 'اسم المستأجر',
    'اسم_البائع': 'اسم البائع',
    'اسم_المشتري': 'اسم المشتري',
    'اسم_صاحب_العمل': 'اسم صاحب العمل',
    'اسم_الموظف': 'اسم الموظف',
    'نسبة_الشراكة': 'نسبة الشراكة',
    'رأس_المال': 'رأس المال',
    'وصف_الخدمة': 'وصف الخدمة',
  };

  return Array.from(matches).map(key => ({
    key,
    label: labelMap[key] || key.replace(/_/g, ' '),
    value: '',
    placeholder: `أدخل ${labelMap[key] || key.replace(/_/g, ' ')}`
  }));
};

// Add common placeholders if template has no specific ones
const getDefaultFields = (category: string): FormField[] => {
  const commonFields: FormField[] = [
    { key: 'تاريخ_العقد', label: 'تاريخ العقد', value: new Date().toLocaleDateString('ar-SA'), placeholder: 'تاريخ العقد' },
  ];

  const categoryFields: Record<string, FormField[]> = {
    'عقود العمل': [
      { key: 'اسم_صاحب_العمل', label: 'اسم صاحب العمل / الشركة', value: '', placeholder: 'أدخل اسم صاحب العمل' },
      { key: 'رقم_السجل_التجاري', label: 'رقم السجل التجاري', value: '', placeholder: 'أدخل رقم السجل التجاري' },
      { key: 'اسم_الموظف', label: 'اسم الموظف', value: '', placeholder: 'أدخل اسم الموظف' },
      { key: 'رقم_الهوية', label: 'رقم الهوية', value: '', placeholder: 'أدخل رقم الهوية' },
      { key: 'المسمى_الوظيفي', label: 'المسمى الوظيفي', value: '', placeholder: 'أدخل المسمى الوظيفي' },
      { key: 'الراتب', label: 'الراتب الشهري (ريال)', value: '', placeholder: 'أدخل الراتب' },
      { key: 'تاريخ_البداية', label: 'تاريخ بداية العمل', value: '', placeholder: 'تاريخ البداية' },
      { key: 'مدة_العقد', label: 'مدة العقد', value: '', placeholder: 'مثال: سنة واحدة' },
    ],
    'عقود الإيجار': [
      { key: 'اسم_المالك', label: 'اسم المالك (المؤجر)', value: '', placeholder: 'أدخل اسم المالك' },
      { key: 'رقم_هوية_المالك', label: 'رقم هوية المالك', value: '', placeholder: 'أدخل رقم الهوية' },
      { key: 'اسم_المستأجر', label: 'اسم المستأجر', value: '', placeholder: 'أدخل اسم المستأجر' },
      { key: 'رقم_هوية_المستأجر', label: 'رقم هوية المستأجر', value: '', placeholder: 'أدخل رقم الهوية' },
      { key: 'عنوان_العقار', label: 'عنوان العقار', value: '', placeholder: 'أدخل عنوان العقار' },
      { key: 'قيمة_الإيجار', label: 'قيمة الإيجار السنوي (ريال)', value: '', placeholder: 'أدخل قيمة الإيجار' },
      { key: 'مدة_العقد', label: 'مدة العقد', value: '', placeholder: 'مثال: سنة واحدة' },
    ],
    'عقود البيع': [
      { key: 'اسم_البائع', label: 'اسم البائع', value: '', placeholder: 'أدخل اسم البائع' },
      { key: 'رقم_هوية_البائع', label: 'رقم هوية البائع', value: '', placeholder: 'أدخل رقم الهوية' },
      { key: 'اسم_المشتري', label: 'اسم المشتري', value: '', placeholder: 'أدخل اسم المشتري' },
      { key: 'رقم_هوية_المشتري', label: 'رقم هوية المشتري', value: '', placeholder: 'أدخل رقم الهوية' },
      { key: 'وصف_المبيع', label: 'وصف المبيع', value: '', placeholder: 'أدخل وصف المبيع' },
      { key: 'قيمة_البيع', label: 'قيمة البيع (ريال)', value: '', placeholder: 'أدخل قيمة البيع' },
    ],
    'عقود الشراكة': [
      { key: 'اسم_الشريك_الأول', label: 'اسم الشريك الأول', value: '', placeholder: 'أدخل اسم الشريك الأول' },
      { key: 'رقم_هوية_الأول', label: 'رقم هوية الشريك الأول', value: '', placeholder: 'أدخل رقم الهوية' },
      { key: 'نسبة_الشريك_الأول', label: 'نسبة الشريك الأول (%)', value: '', placeholder: 'مثال: 50%' },
      { key: 'اسم_الشريك_الثاني', label: 'اسم الشريك الثاني', value: '', placeholder: 'أدخل اسم الشريك الثاني' },
      { key: 'رقم_هوية_الثاني', label: 'رقم هوية الشريك الثاني', value: '', placeholder: 'أدخل رقم الهوية' },
      { key: 'نسبة_الشريك_الثاني', label: 'نسبة الشريك الثاني (%)', value: '', placeholder: 'مثال: 50%' },
      { key: 'رأس_المال', label: 'رأس المال (ريال)', value: '', placeholder: 'أدخل رأس المال' },
      { key: 'نوع_النشاط', label: 'نوع النشاط', value: '', placeholder: 'أدخل نوع النشاط' },
    ],
    'عقود الخدمات': [
      { key: 'اسم_مقدم_الخدمة', label: 'اسم مقدم الخدمة', value: '', placeholder: 'أدخل اسم مقدم الخدمة' },
      { key: 'رقم_السجل', label: 'رقم السجل التجاري', value: '', placeholder: 'أدخل رقم السجل' },
      { key: 'اسم_العميل', label: 'اسم العميل', value: '', placeholder: 'أدخل اسم العميل' },
      { key: 'وصف_الخدمة', label: 'وصف الخدمة', value: '', placeholder: 'أدخل وصف الخدمة' },
      { key: 'قيمة_الخدمة', label: 'قيمة الخدمة (ريال)', value: '', placeholder: 'أدخل قيمة الخدمة' },
      { key: 'مدة_التنفيذ', label: 'مدة التنفيذ', value: '', placeholder: 'أدخل مدة التنفيذ' },
    ],
  };

  return [...commonFields, ...(categoryFields[category] || categoryFields['عقود الخدمات'])];
};

export const ContractFillForm = ({ template, isOpen, onClose }: ContractFillFormProps) => {
  const { user } = useAuth();
  const [fields, setFields] = useState<FormField[]>([]);
  const [filledContent, setFilledContent] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [currentSigningParty, setCurrentSigningParty] = useState<'first' | 'second'>('first');
  const [firstPartySignature, setFirstPartySignature] = useState<SignatureData | null>(null);
  const [secondPartySignature, setSecondPartySignature] = useState<SignatureData | null>(null);
  const [showSavedSignatures, setShowSavedSignatures] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);
  const printRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (template && isOpen) {
      // Extract placeholders from template content
      let extractedFields = extractPlaceholders(template.content);
      
      // If no placeholders found, use default fields based on category
      if (extractedFields.length === 0) {
        extractedFields = getDefaultFields(template.category);
      }
      
      setFields(extractedFields);
      setFilledContent(template.content);
      setShowPreview(false);
    }
  }, [template, isOpen]);

  const handleFieldChange = (key: string, value: string) => {
    setFields(prev => prev.map(field => 
      field.key === key ? { ...field, value } : field
    ));
  };

  const generateFilledContract = () => {
    if (!template) return '';
    
    let content = template.content;
    
    // Replace placeholders with values
    fields.forEach(field => {
      const value = field.value || `[${field.label}]`;
      // Replace both formats: [placeholder] and {{placeholder}}
      content = content.replace(new RegExp(`\\[${field.key}\\]`, 'g'), value);
      content = content.replace(new RegExp(`\\{\\{${field.key}\\}\\}`, 'g'), value);
    });
    
    return content;
  };

  const handlePreview = () => {
    const emptyFields = fields.filter(f => !f.value.trim());
    if (emptyFields.length > 0) {
      toast.warning(`يوجد ${emptyFields.length} حقول فارغة`);
    }
    setFilledContent(generateFilledContract());
    setShowPreview(true);
  };

  const handlePrint = () => {
    const content = generateFilledContract();
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('لم يتمكن من فتح نافذة الطباعة');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${template?.title || 'عقد'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            font-size: 14px;
            line-height: 1.8;
            padding: 40px;
            background: white;
            color: #1a1a1a;
          }
          
          .contract-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #d4af37;
          }
          
          .contract-header h1 {
            font-size: 24px;
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 10px;
          }
          
          .contract-header .date {
            color: #666;
            font-size: 12px;
          }
          
          .contract-content {
            white-space: pre-wrap;
            text-align: justify;
          }
          
          .signature-section {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
          }
          
          .signature-box {
            text-align: center;
            width: 40%;
          }
          
          .signature-line {
            border-top: 1px solid #333;
            margin-top: 60px;
            padding-top: 10px;
          }
          
          @media print {
            body {
              padding: 20px;
            }
            
            @page {
              margin: 2cm;
            }
          }
        </style>
      </head>
      <body>
        <div class="contract-header">
          <h1>${template?.title || 'عقد'}</h1>
          <p class="date">التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
        </div>
        
        <div class="contract-content">${content}</div>
        
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line">الطرف الأول</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">الطرف الثاني</div>
          </div>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for fonts to load then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
    
    toast.success('جاري الطباعة...');
  };

  const handleExportPDF = async () => {
    if (!template) return;
    
    setIsExporting(true);
    toast.info('جاري تحميل الخط العربي وإنشاء ملف PDF...');
    
    try {
      // Load Arabic font first
      const fontBase64 = await loadCairoFont();
      
      const content = generateFilledContract();
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Add Cairo Arabic font to jsPDF
      doc.addFileToVFS('Cairo-Regular.ttf', fontBase64);
      doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
      doc.setFont('Cairo');
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(33, 33, 33);
      const title = template.title;
      doc.text(title, pageWidth / 2, 25, { align: 'center' });
      
      // Golden line under title
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.line(margin, 32, pageWidth - margin, 32);
      
      // Date
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      const dateText = `التاريخ: ${new Date().toLocaleDateString('ar-SA')}`;
      doc.text(dateText, pageWidth / 2, 40, { align: 'center' });
      
      // Content
      doc.setFontSize(12);
      doc.setTextColor(33, 33, 33);
      
      // Split content into lines
      const lines = content.split('\n');
      let yPosition = 55;
      const lineHeight = 7;
      
      for (const line of lines) {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 25;
        }
        
        // Handle long lines with word wrap
        const wrappedLines = doc.splitTextToSize(line, maxWidth);
        for (const wrappedLine of wrappedLines) {
          if (yPosition > pageHeight - 80) {
            doc.addPage();
            yPosition = 25;
          }
          doc.text(wrappedLine, pageWidth - margin, yPosition, { align: 'right' });
          yPosition += lineHeight;
        }
      }
      
      // Signature section on last page
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = 25;
      }
      
      yPosition = Math.max(yPosition + 20, pageHeight - 80);
      
      // Signature box styling
      doc.setDrawColor(50, 50, 50);
      doc.setLineWidth(0.3);
      
      // First party signature area
      const sig1X = margin;
      const sig2X = pageWidth - margin - 50;
      
      // Add electronic signatures if available
      if (firstPartySignature) {
        if (firstPartySignature.type === 'draw' || firstPartySignature.type === 'upload') {
          try {
            doc.addImage(firstPartySignature.data, 'PNG', sig1X, yPosition - 30, 45, 25);
          } catch (e) {
            console.log('Could not add first signature image');
          }
        } else if (firstPartySignature.type === 'type') {
          doc.setFontSize(14);
          doc.text(firstPartySignature.data, sig1X + 25, yPosition - 15, { align: 'center' });
        }
        doc.setFontSize(9);
        doc.text(`التاريخ: ${firstPartySignature.date}`, sig1X + 25, yPosition + 18, { align: 'center' });
      }
      
      if (secondPartySignature) {
        if (secondPartySignature.type === 'draw' || secondPartySignature.type === 'upload') {
          try {
            doc.addImage(secondPartySignature.data, 'PNG', sig2X, yPosition - 30, 45, 25);
          } catch (e) {
            console.log('Could not add second signature image');
          }
        } else if (secondPartySignature.type === 'type') {
          doc.setFontSize(14);
          doc.text(secondPartySignature.data, sig2X + 25, yPosition - 15, { align: 'center' });
        }
        doc.setFontSize(9);
        doc.text(`التاريخ: ${secondPartySignature.date}`, sig2X + 25, yPosition + 18, { align: 'center' });
      }
      
      // Signature lines
      doc.line(sig1X, yPosition, sig1X + 50, yPosition);
      doc.setFontSize(11);
      doc.text('الطرف الأول', sig1X + 25, yPosition + 8, { align: 'center' });
      
      doc.line(sig2X, yPosition, sig2X + 50, yPosition);
      doc.text('الطرف الثاني', sig2X + 25, yPosition + 8, { align: 'center' });
      
      // Electronic signature notice
      if (firstPartySignature || secondPartySignature) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('هذا المستند موقع إلكترونياً', pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
      
      // Save the PDF
      const fileName = `${template.title.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('ar-SA').replace(/\//g, '-')}.pdf`;
      doc.save(fileName);
      
      toast.success('تم تصدير العقد بنجاح');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('حدث خطأ في تصدير الملف. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenSignature = (party: 'first' | 'second') => {
    setCurrentSigningParty(party);
    setShowSignatureDialog(true);
  };

  const handleSignatureComplete = (signatureData: SignatureData) => {
    if (currentSigningParty === 'first') {
      setFirstPartySignature(signatureData);
      toast.success('تم إضافة توقيع الطرف الأول');
    } else {
      setSecondPartySignature(signatureData);
      toast.success('تم إضافة توقيع الطرف الثاني');
    }
  };

  const handleSaveContract = async () => {
    if (!template || !user) {
      toast.error('يجب تسجيل الدخول لحفظ العقد');
      return;
    }

    const emptyFields = fields.filter(f => !f.value.trim());
    if (emptyFields.length === fields.length) {
      toast.error('يرجى تعبئة بعض الحقول قبل الحفظ');
      return;
    }

    setIsSaving(true);
    
    try {
      const content = generateFilledContract();
      const fieldValues = fields.reduce((acc, field) => {
        acc[field.key] = field.value;
        return acc;
      }, {} as Record<string, string>);

      const { data, error } = await supabase
        .rpc('insert_encrypted_saved_contract', {
          p_title: template.title,
          p_template_id: template.id,
          p_field_values: fieldValues,
          p_filled_content: content
        });

      if (error) throw error;

      setSavedContractId(data as unknown as string);
      toast.success('تم حفظ العقد بنجاح');
    } catch (error) {
      console.error('Error saving contract:', error);
      toast.error('حدث خطأ في حفظ العقد');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectSavedSignature = (signatureData: SignatureData) => {
    if (currentSigningParty === 'first') {
      setFirstPartySignature(signatureData);
      toast.success('تم تحديد التوقيع للطرف الأول');
    } else {
      setSecondPartySignature(signatureData);
      toast.success('تم تحديد التوقيع للطرف الثاني');
    }
  };

  const handleReset = () => {
    setFields(prev => prev.map(field => ({ ...field, value: '' })));
    setShowPreview(false);
    toast.info('تم إعادة تعيين الحقول');
  };

  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-golden flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            تعبئة نموذج العقد
          </DialogTitle>
          <DialogDescription>{template.title} - {template.category}</DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row md:h-[70vh]">
          {/* Form Section */}
          <div className="w-full md:w-1/2 md:border-l md:border-border md:overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="p-6 md:h-full" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">بيانات العقد</h3>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <RefreshCw className="w-4 h-4 ml-1" />
                    إعادة تعيين
                  </Button>
                </div>
                
                {fields.map((field, index) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key} className="text-sm text-foreground">
                      {field.label}
                    </Label>
                    <Input
                      id={field.key}
                      value={field.value}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="text-right text-foreground bg-background border-border text-base"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                ))}
                
                <Separator className="my-6" />

                {/* Electronic Signatures */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <PenTool className="w-4 h-4 text-golden" />
                      التوقيع الإلكتروني
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSavedSignatures(true)}
                      className="text-golden"
                    >
                      <Library className="w-4 h-4 ml-1" />
                      التوقيعات المحفوظة
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenSignature('first')}
                      className={firstPartySignature ? 'border-green-500 text-green-600' : ''}
                    >
                      {firstPartySignature ? '✓ ' : ''}الطرف الأول
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenSignature('second')}
                      className={secondPartySignature ? 'border-green-500 text-green-600' : ''}
                    >
                      {secondPartySignature ? '✓ ' : ''}الطرف الثاني
                    </Button>
                  </div>
                  {(firstPartySignature || secondPartySignature) && (
                    <p className="text-xs text-muted-foreground">
                      التوقيعات ستظهر في ملف PDF المصدّر
                    </p>
                  )}
                </div>

                <Separator className="my-6" />
                
                <div className="flex flex-col gap-2">
                  <Button
                    variant="golden-outline"
                    onClick={handlePreview}
                    className="w-full"
                  >
                    <FileText className="w-4 h-4 ml-2" />
                    معاينة العقد
                  </Button>
                  
                  <Button
                    variant="golden"
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="w-full"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 ml-2" />
                    )}
                    {isExporting ? 'جاري التصدير...' : 'تصدير PDF مع التوقيع'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleSaveContract}
                    disabled={isSaving || !user}
                    className="w-full"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 ml-2" />
                    )}
                    {isSaving ? 'جاري الحفظ...' : 'حفظ العقد'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handlePrint}
                    className="w-full"
                  >
                    <Printer className="w-4 h-4 ml-2" />
                    طباعة العقد
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowShareDialog(true)}
                    className="w-full"
                    disabled={!showPreview}
                  >
                    <Share2 className="w-4 h-4 ml-2" />
                    مشاركة العقد
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Preview Section */}
          <div className="w-full md:w-1/2 bg-muted/30 md:overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="p-6 md:h-full" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">معاينة العقد</h3>
              </div>
              
              <Card className="bg-white text-foreground">
                <CardHeader className="text-center border-b pb-4">
                  <CardTitle className="text-xl text-gray-900">{template.title}</CardTitle>
                  <p className="text-sm text-gray-500">
                    التاريخ: {new Date().toLocaleDateString('ar-SA')}
                  </p>
                </CardHeader>
                <CardContent className="pt-6">
                  <pre 
                    ref={printRef}
                    className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800"
                    dir="rtl"
                  >
                    {showPreview ? filledContent : template.content}
                  </pre>
                  
                  <div className="mt-12 flex justify-between">
                    <div className="text-center w-2/5">
                      {firstPartySignature && (
                        <div className="mb-2 h-16 flex items-center justify-center">
                          {firstPartySignature.type === 'type' ? (
                            <span className="text-lg" style={{ fontFamily: 'cursive' }}>{firstPartySignature.data}</span>
                          ) : (
                            <img src={firstPartySignature.data} alt="توقيع" className="max-h-16 max-w-full object-contain" />
                          )}
                        </div>
                      )}
                      <div className="border-t border-gray-400 pt-2 mt-2">
                        الطرف الأول
                      </div>
                    </div>
                    <div className="text-center w-2/5">
                      {secondPartySignature && (
                        <div className="mb-2 h-16 flex items-center justify-center">
                          {secondPartySignature.type === 'type' ? (
                            <span className="text-lg" style={{ fontFamily: 'cursive' }}>{secondPartySignature.data}</span>
                          ) : (
                            <img src={secondPartySignature.data} alt="توقيع" className="max-h-16 max-w-full object-contain" />
                          )}
                        </div>
                      )}
                      <div className="border-t border-gray-400 pt-2 mt-2">
                        الطرف الثاني
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Electronic Signature Dialog */}
        <ElectronicSignature
          isOpen={showSignatureDialog}
          onClose={() => setShowSignatureDialog(false)}
          onSignatureComplete={handleSignatureComplete}
          partyLabel={currentSigningParty === 'first' ? 'الطرف الأول' : 'الطرف الثاني'}
        />

        {/* Saved Signatures Manager */}
        <SavedSignaturesManager
          isOpen={showSavedSignatures}
          onClose={() => setShowSavedSignatures(false)}
          onSelectSignature={handleSelectSavedSignature}
        />

        {/* Share Contract Dialog */}
        <ShareContractDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          contractTitle={template.title}
          contractContent={showPreview ? filledContent : template.content}
          contractId={savedContractId || undefined}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ContractFillForm;
