import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthIndicator, validatePasswordStrength } from "@/components/auth/PasswordStrengthIndicator";
import { checkPasswordLeaked } from "@/utils/passwordSecurity";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert } from "lucide-react";

interface ForcePasswordChangeProps {
  open: boolean;
  reason: "weak" | "leaked";
  leakCount?: number;
  onSuccess: () => void;
}

export const ForcePasswordChange = ({ open, reason, leakCount, onSuccess }: ForcePasswordChangeProps) => {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمتا المرور غير متطابقتين",
        variant: "destructive",
      });
      return;
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      toast({
        title: "كلمة المرور ضعيفة",
        description: passwordValidation.errors[0],
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Check if new password is leaked
      const leakCheck = await checkPasswordLeaked(newPassword);
      if (leakCheck.isLeaked) {
        toast({
          title: "كلمة المرور غير آمنة",
          description: `كلمة المرور هذه ظهرت في ${leakCheck.count.toLocaleString('ar-SA')} تسريب بيانات. اختر كلمة مرور أخرى.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "تم تغيير كلمة المرور",
        description: "كلمة المرور الجديدة آمنة وتم حفظها بنجاح",
      });
      
      onSuccess();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء تغيير كلمة المرور",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-6 h-6 text-destructive" />
            <DialogTitle className="text-xl">تغيير كلمة المرور مطلوب</DialogTitle>
          </div>
          <DialogDescription className="text-right">
            {reason === "leaked" ? (
              <>
                كلمة المرور الحالية ظهرت في{" "}
                <span className="text-destructive font-bold">
                  {leakCount?.toLocaleString('ar-SA')}
                </span>{" "}
                تسريب بيانات سابق. يجب تغييرها لحماية حسابك.
              </>
            ) : (
              "كلمة المرور الحالية لا تستوفي معايير الأمان. يجب تغييرها لحماية حسابك."
            )}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
            <PasswordStrengthIndicator password={newPassword} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </div>
          
          <Button type="submit" variant="golden" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تغيير كلمة المرور"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
