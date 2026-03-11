import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Share2, Link, Mail, Copy, Check, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ShareContractDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contractTitle: string;
  contractContent: string;
  contractId?: string;
}

export const ShareContractDialog = ({ 
  isOpen, 
  onClose,
  contractTitle,
  contractContent,
  contractId
}: ShareContractDialogProps) => {
  const { user } = useAuth();
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(7);

  const generateShareLink = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول للمشاركة');
      return;
    }

    setIsSharing(true);
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { error } = await supabase.from('shared_contracts').insert({
        user_id: user.id,
        contract_id: contractId || null,
        share_token: token,
        title: contractTitle,
        content: contractContent,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      const link = `${window.location.origin}/shared/${token}`;
      setShareLink(link);
      toast.success('تم إنشاء رابط المشاركة');
    } catch (error) {
      console.error('Error generating share link:', error);
      toast.error('حدث خطأ في إنشاء الرابط');
    } finally {
      setIsSharing(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('تم نسخ الرابط');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('فشل في نسخ الرابط');
    }
  };

  const sendByEmail = async () => {
    if (!email.trim()) {
      toast.error('يرجى إدخال البريد الإلكتروني');
      return;
    }

    if (!shareLink) {
      toast.error('يرجى إنشاء رابط المشاركة أولاً');
      return;
    }

    setIsSendingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('يجب تسجيل الدخول لإرسال البريد');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-contract-share`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            recipientEmail: email,
            contractTitle: contractTitle,
            shareLink: shareLink,
            expiresInDays: expiresInDays,
            senderName: user?.email?.split('@')[0] || 'مستخدم'
          })
        }
      );

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      toast.success('تم إرسال البريد الإلكتروني بنجاح');
      setEmail("");
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('حدث خطأ في إرسال البريد');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-golden" />
            مشاركة العقد
          </DialogTitle>
          <DialogDescription>
            شارك العقد عبر رابط أو البريد الإلكتروني
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">{contractTitle}</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              صلاحية الرابط
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={30}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">أيام</span>
            </div>
          </div>

          {!shareLink ? (
            <Button
              variant="golden"
              onClick={generateShareLink}
              disabled={isSharing}
              className="w-full"
            >
              {isSharing ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Link className="w-4 h-4 ml-2" />
              )}
              {isSharing ? 'جاري الإنشاء...' : 'إنشاء رابط المشاركة'}
            </Button>
          ) : (
            <Tabs defaultValue="link" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="link" className="flex items-center gap-1">
                  <Link className="w-4 h-4" />
                  رابط
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  بريد
                </TabsTrigger>
              </TabsList>

              <TabsContent value="link" className="space-y-3 mt-4">
                <div className="flex gap-2">
                  <Input
                    value={shareLink}
                    readOnly
                    className="text-xs"
                    dir="ltr"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyLink}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  الرابط صالح لمدة {expiresInDays} أيام
                </p>
              </TabsContent>

              <TabsContent value="email" className="space-y-3 mt-4">
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    dir="ltr"
                  />
                </div>
                <Button
                  variant="golden"
                  onClick={sendByEmail}
                  disabled={isSendingEmail}
                  className="w-full"
                >
                  {isSendingEmail ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 ml-2" />
                  )}
                  {isSendingEmail ? 'جاري الإرسال...' : 'إرسال بالبريد'}
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareContractDialog;
