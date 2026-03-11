import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PenTool, Trash2, Star, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ElectronicSignature, { SignatureData } from "./ElectronicSignature";

interface SavedSignature {
  id: string;
  name: string;
  signature_type: 'draw' | 'type' | 'upload';
  signature_data: string;
  font_family: string | null;
  is_default: boolean;
  created_at: string;
}

interface SavedSignaturesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSignature: (signature: SignatureData) => void;
}

export const SavedSignaturesManager = ({ 
  isOpen, 
  onClose, 
  onSelectSignature 
}: SavedSignaturesManagerProps) => {
  const { user } = useAuth();
  const [signatures, setSignatures] = useState<SavedSignature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewSignature, setShowNewSignature] = useState(false);
  const [newSignatureName, setNewSignatureName] = useState("");
  const [pendingSignature, setPendingSignature] = useState<SignatureData | null>(null);

  const fetchSignatures = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_signatures')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSignatures((data || []) as SavedSignature[]);
    } catch (error) {
      console.error('Error fetching signatures:', error);
      toast.error('حدث خطأ في جلب التوقيعات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchSignatures();
    }
  }, [isOpen, user]);

  const handleSaveNewSignature = async (signatureData: SignatureData) => {
    setPendingSignature(signatureData);
    setNewSignatureName(signatureData.name || "توقيعي");
  };

  const confirmSaveSignature = async () => {
    if (!user || !pendingSignature) return;

    try {
      const { error } = await supabase.from('saved_signatures').insert({
        user_id: user.id,
        name: newSignatureName || "توقيعي",
        signature_type: pendingSignature.type,
        signature_data: pendingSignature.data,
        is_default: signatures.length === 0
      });

      if (error) throw error;
      
      toast.success('تم حفظ التوقيع بنجاح');
      fetchSignatures();
      setPendingSignature(null);
      setNewSignatureName("");
      setShowNewSignature(false);
    } catch (error) {
      console.error('Error saving signature:', error);
      toast.error('حدث خطأ في حفظ التوقيع');
    }
  };

  const handleDeleteSignature = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_signatures')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSignatures(prev => prev.filter(s => s.id !== id));
      toast.success('تم حذف التوقيع');
    } catch (error) {
      console.error('Error deleting signature:', error);
      toast.error('حدث خطأ في حذف التوقيع');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      // Remove default from all
      await supabase
        .from('saved_signatures')
        .update({ is_default: false })
        .eq('user_id', user?.id);

      // Set new default
      const { error } = await supabase
        .from('saved_signatures')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      
      fetchSignatures();
      toast.success('تم تعيين التوقيع الافتراضي');
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('حدث خطأ');
    }
  };

  const handleSelectSignature = (sig: SavedSignature) => {
    onSelectSignature({
      type: sig.signature_type,
      data: sig.signature_data,
      name: sig.name,
      date: new Date().toLocaleDateString('ar-SA')
    });
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="w-5 h-5 text-golden" />
              التوقيعات المحفوظة
            </DialogTitle>
            <DialogDescription>
              اختر من توقيعاتك المحفوظة أو أضف توقيعاً جديداً
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={() => setShowNewSignature(true)}
              className="w-full border-dashed border-golden/30"
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة توقيع جديد
            </Button>

            {pendingSignature && (
              <div className="p-4 border border-golden/30 rounded-lg space-y-3">
                <Label>اسم التوقيع</Label>
                <Input
                  value={newSignatureName}
                  onChange={(e) => setNewSignatureName(e.target.value)}
                  placeholder="أدخل اسم التوقيع"
                />
                <div className="flex items-center justify-center p-4 bg-white rounded">
                  {pendingSignature.type === 'type' ? (
                    <span className="text-xl" style={{ fontFamily: 'cursive' }}>
                      {pendingSignature.data}
                    </span>
                  ) : (
                    <img src={pendingSignature.data} alt="توقيع" className="max-h-16" />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={confirmSaveSignature} variant="golden" className="flex-1">
                    <Check className="w-4 h-4 ml-1" />
                    حفظ
                  </Button>
                  <Button onClick={() => setPendingSignature(null)} variant="outline">
                    إلغاء
                  </Button>
                </div>
              </div>
            )}

            <ScrollArea className="h-64">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
              ) : signatures.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد توقيعات محفوظة
                </div>
              ) : (
                <div className="space-y-3">
                  {signatures.map((sig) => (
                    <div
                      key={sig.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:border-golden/50 transition-colors"
                    >
                      <div 
                        className="flex-1 cursor-pointer flex items-center gap-3"
                        onClick={() => handleSelectSignature(sig)}
                      >
                        <div className="w-20 h-12 bg-white rounded flex items-center justify-center overflow-hidden">
                          {sig.signature_type === 'type' ? (
                            <span className="text-sm" style={{ fontFamily: 'cursive' }}>
                              {sig.signature_data}
                            </span>
                          ) : (
                            <img 
                              src={sig.signature_data} 
                              alt={sig.name} 
                              className="max-h-10 max-w-full object-contain"
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{sig.name}</span>
                            {sig.is_default && (
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {sig.signature_type === 'draw' ? 'مرسوم' : 
                             sig.signature_type === 'type' ? 'مكتوب' : 'مرفوع'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!sig.is_default && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetDefault(sig.id);
                            }}
                            title="تعيين كافتراضي"
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSignature(sig.id);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <ElectronicSignature
        isOpen={showNewSignature}
        onClose={() => setShowNewSignature(false)}
        onSignatureComplete={handleSaveNewSignature}
        partyLabel="توقيع جديد"
      />
    </>
  );
};

export default SavedSignaturesManager;
