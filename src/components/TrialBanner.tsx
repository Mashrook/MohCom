import { Gift, Crown, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface TrialBannerProps {
  hasUsedTrial: boolean;
  isSubscribed: boolean;
  onUseTrial?: () => void;
}

export function TrialBanner({ hasUsedTrial, isSubscribed, onUseTrial }: TrialBannerProps) {
  const navigate = useNavigate();
  const { isAdmin, isLawyer } = useAuth();

  // Show unlimited access banner for admins
  if (isAdmin) {
    return (
      <div className="bg-gradient-to-r from-purple-500/20 to-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">وصول مدير النظام</h3>
            <p className="text-sm text-muted-foreground">
              لديك وصول غير محدود لجميع الخدمات كمدير للنظام
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show unlimited access banner for lawyers
  if (isLawyer) {
    return (
      <div className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Star className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">وصول المحامي</h3>
            <p className="text-sm text-muted-foreground">
              لديك وصول غير محدود لجميع الخدمات كمحامي مسجل في المنصة
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Don't show banner for subscribed users
  if (isSubscribed) {
    return (
      <div className="bg-gradient-to-r from-golden/20 to-golden/10 border border-golden/30 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-golden/20 flex items-center justify-center">
            <Crown className="w-5 h-5 text-golden" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">المشترك المتميز</h3>
            <p className="text-sm text-muted-foreground">
              لديك وصول غير محدود لجميع الخدمات كمشترك متميز
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User hasn't used trial yet - show trial available banner
  if (!hasUsedTrial) {
    return (
      <div className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">تجربة مجانية متاحة!</h3>
              <p className="text-sm text-muted-foreground">
                يمكنك تجربة هذه الخدمة مرة واحدة مجاناً
              </p>
            </div>
          </div>
          {onUseTrial && (
            <Button onClick={onUseTrial} className="bg-primary hover:bg-primary/90">
              <Gift className="w-4 h-4 ml-2" />
              استخدم التجربة المجانية
            </Button>
          )}
        </div>
      </div>
    );
  }

  // User has used trial - show upgrade banner
  return (
    <div className="bg-gradient-to-r from-destructive/20 to-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
            <Crown className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">انتهت التجربة المجانية</h3>
            <p className="text-sm text-muted-foreground">
              قمت باستخدام التجربة المجانية. اشترك الآن للوصول الكامل
            </p>
          </div>
        </div>
        <Button 
          onClick={() => navigate("/pricing")} 
          className="bg-primary hover:bg-primary/90"
        >
          <Crown className="w-4 h-4 ml-2" />
          اشترك الآن
        </Button>
      </div>
    </div>
  );
}
