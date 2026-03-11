import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, Home, Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { loadCairoFont } from "@/utils/arabicFont";

interface SharedContract {
  id: string;
  title: string;
  content: string;
  expires_at: string | null;
  created_at: string;
  view_count: number;
}

const SharedContract = () => {
  const { token } = useParams<{ token: string }>();
  const [contract, setContract] = useState<SharedContract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchContract = async () => {
      if (!token) {
        setError('رابط غير صالح');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('shared_contracts')
          .select('*')
          .eq('share_token', token)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('العقد غير موجود');
          return;
        }

        // Check expiration
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError('انتهت صلاحية هذا الرابط');
          return;
        }

        setContract(data);

        // Increment view count
        await supabase
          .from('shared_contracts')
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq('id', data.id);

      } catch (err) {
        console.error('Error fetching contract:', err);
        setError('حدث خطأ في جلب العقد');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContract();
  }, [token]);

  const handlePrint = () => {
    if (!contract) return;

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
        <title>${contract.title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          body {
            font-family: 'Cairo', sans-serif;
            padding: 40px;
            line-height: 1.8;
          }
          h1 {
            text-align: center;
            border-bottom: 2px solid #D4AF37;
            padding-bottom: 15px;
          }
          .content {
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>
        <h1>${contract.title}</h1>
        <div class="content">${contract.content}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleExportPDF = async () => {
    if (!contract) return;

    setIsExporting(true);
    try {
      const fontBase64 = await loadCairoFont();
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.addFileToVFS('Cairo-Regular.ttf', fontBase64);
      doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
      doc.setFont('Cairo');

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;

      doc.setFontSize(18);
      doc.text(contract.title, pageWidth / 2, 25, { align: 'center' });

      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.line(margin, 32, pageWidth - margin, 32);

      doc.setFontSize(12);
      const lines = contract.content.split('\n');
      let yPosition = 45;

      for (const line of lines) {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 25;
        }
        const wrappedLines = doc.splitTextToSize(line, pageWidth - margin * 2);
        for (const wrapped of wrappedLines) {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 25;
          }
          doc.text(wrapped, pageWidth - margin, yPosition, { align: 'right' });
          yPosition += 7;
        }
      }

      doc.save(`${contract.title}.pdf`);
      toast.success('تم تصدير العقد بنجاح');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('حدث خطأ في التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-golden mx-auto mb-4" />
          <p className="text-muted-foreground">جاري تحميل العقد...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{error}</h2>
            <p className="text-muted-foreground mb-6">
              قد يكون الرابط منتهي الصلاحية أو غير صحيح
            </p>
            <Button asChild variant="golden">
              <Link to="/">
                <Home className="w-4 h-4 ml-2" />
                العودة للرئيسية
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2 text-golden">
                <FileText className="w-6 h-6" />
                {contract?.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 ml-1" />
                  طباعة
                </Button>
                <Button 
                  variant="golden" 
                  size="sm" 
                  onClick={handleExportPDF}
                  disabled={isExporting}
                >
                  <Download className="w-4 h-4 ml-1" />
                  {isExporting ? 'جاري...' : 'تحميل PDF'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {contract?.content}
            </pre>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Button asChild variant="outline">
            <Link to="/">
              <Home className="w-4 h-4 ml-2" />
              زيارة محامي كوم
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SharedContract;
