import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTermsConsent, TermsVersion } from '@/hooks/useTermsConsent';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, FileText, Shield, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const TermsUpdateBanner = () => {
  const { needsReConsent, updatedDocuments, recordConsent, isLoading } = useTermsConsent();
  const [showDialog, setShowDialog] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  if (isLoading || !needsReConsent) return null;

  const handleAcceptUpdates = async () => {
    if (!accepted) {
      toast({
        title: "يرجى الموافقة",
        description: "يجب الموافقة على الشروط المحدثة للمتابعة",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const success = await recordConsent('terms_update');
    setIsSubmitting(false);

    if (success) {
      setShowDialog(false);
      toast({
        title: "تم تسجيل موافقتك",
        description: "شكراً لك على الموافقة على الشروط المحدثة",
      });
    } else {
      toast({
        title: "حدث خطأ",
        description: "فشل في تسجيل الموافقة، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  };

  const getDocumentIcon = (type: string) => {
    return type === 'terms' ? <FileText className="w-4 h-4" /> : <Shield className="w-4 h-4" />;
  };

  const getDocumentName = (type: string) => {
    return type === 'terms' ? 'شروط الاستخدام' : 'سياسة الخصوصية';
  };

  return (
    <>
      <Alert className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-primary/10 border-primary/30 shadow-lg">
        <Bell className="h-4 w-4 text-primary" />
        <AlertTitle className="text-foreground">تحديث الشروط والأحكام</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          تم تحديث شروط الاستخدام أو سياسة الخصوصية. يرجى مراجعتها والموافقة للمتابعة.
          <Button 
            variant="link" 
            className="p-0 h-auto mr-2 text-primary"
            onClick={() => setShowDialog(true)}
          >
            عرض التحديثات
          </Button>
        </AlertDescription>
      </Alert>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              تحديثات الشروط والأحكام
            </DialogTitle>
            <DialogDescription>
              تم إجراء تحديثات على الوثائق التالية. يرجى مراجعتها والموافقة للمتابعة في استخدام الخدمة.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-64">
            <div className="space-y-4">
              {updatedDocuments.map((doc, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-lg bg-accent/50 border border-border"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getDocumentIcon(doc.document_type)}
                    <span className="font-medium">{getDocumentName(doc.document_type)}</span>
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                      الإصدار {doc.version}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {doc.summary_ar || 'تم إجراء تحديثات على هذه الوثيقة.'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    تاريخ السريان: {format(new Date(doc.effective_date), 'dd MMMM yyyy', { locale: ar })}
                  </p>
                  <Link 
                    to={doc.document_type === 'terms' ? '/terms' : '/privacy'}
                    className="text-sm text-primary hover:underline inline-block mt-2"
                    target="_blank"
                  >
                    قراءة النص الكامل ←
                  </Link>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/30 border border-border">
            <Checkbox
              id="accept-updates"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor="accept-updates" className="text-sm leading-relaxed cursor-pointer">
              لقد قرأت ووافقت على{" "}
              <Link to="/terms" className="text-primary hover:underline" target="_blank">
                شروط الاستخدام
              </Link>
              {" "}و{" "}
              <Link to="/privacy" className="text-primary hover:underline" target="_blank">
                سياسة الخصوصية
              </Link>
              {" "}المحدثة
            </Label>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              لاحقاً
            </Button>
            <Button 
              variant="golden" 
              onClick={handleAcceptUpdates}
              disabled={!accepted || isSubmitting}
            >
              {isSubmitting ? 'جاري التسجيل...' : 'الموافقة والمتابعة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
