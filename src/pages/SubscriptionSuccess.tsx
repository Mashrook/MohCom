import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home, Loader2, XCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const { checkSubscription, subscription, user } = useAuth();

  const paymentId = searchParams.get("payment_id");
  const plan = searchParams.get("plan");
  const canceled = searchParams.get("canceled");
  const status = searchParams.get("status");

  // التحقق من نجاح الدفع من Moyasar
  const isPaid = !canceled && (paymentId || plan || status === "paid");
  const [isVerifying, setIsVerifying] = useState(!!isPaid);
  const [verificationAttempts, setVerificationAttempts] = useState(0);

  const planName = useMemo(() => {
    switch (plan) {
      case "personal_monthly":
      case "personal_yearly":
        return "الباقة الشخصية";
      case "company_monthly":
      case "company_yearly":
        return "باقة الشركات";
      case "basic":
        return "الأساسية";
      case "professional":
        return "الاحترافية";
      case "enterprise":
        return "المؤسسات";
      default:
        return "";
    }
  }, [plan]);

  // التحقق من الاشتراك بعد الرجوع من Moyasar
  useEffect(() => {
    if (!isPaid || !user) {
      setIsVerifying(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 ثانية كحد أقصى

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      setVerificationAttempts(attempts);

      try {
        // استدعاء Edge Function للتحقق من حالة الاشتراك
        const { data, error } = await supabase.functions.invoke("check-subscription");
        
        if (!error && data?.subscribed) {
          await checkSubscription();
          setIsVerifying(false);
          return;
        }

        // كخيار بديل، تحقق من قاعدة البيانات
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("status, current_period_end")
          .eq("user_id", user.id)
          .maybeSingle();

        if (subData) {
          const now = new Date();
          const end = subData.current_period_end ? new Date(subData.current_period_end) : null;
          const isActive = subData.status === "active" && (!end || end > now);

          if (isActive) {
            await checkSubscription();
            setIsVerifying(false);
            return;
          }
        }
      } catch (err) {
        console.error("[SubscriptionSuccess] Verification error:", err);
      }

      if (attempts >= maxAttempts) {
        setIsVerifying(false);
        return;
      }

      setTimeout(poll, 1000);
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [checkSubscription, isPaid, user?.id]);

  const handleManualRefresh = async () => {
    setIsVerifying(true);
    try {
      await supabase.functions.invoke("check-subscription");
      await checkSubscription();
    } catch (err) {
      console.error("[SubscriptionSuccess] Manual refresh error:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  if (canceled) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-destructive/10">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">تم إلغاء العملية</h1>
              <p className="text-muted-foreground mb-8">
                لم يتم إتمام عملية الاشتراك. يمكنك المحاولة مرة أخرى في أي وقت.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/pricing">
                  <Button variant="default" size="lg">
                    العودة للأسعار
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="outline" size="lg">
                    <Home className="w-4 h-4 ml-2" />
                    الصفحة الرئيسية
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-green-500/20">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-4">
              {subscription.subscribed ? "تم تفعيل اشتراكك!" : "تم استلام الدفع"}
            </h1>

            {planName && (
              <p className="text-muted-foreground mb-4">الباقة: {planName}</p>
            )}

            {isVerifying ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground mb-8">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري تفعيل الاشتراك...</span>
                </div>
                <span className="text-xs">المحاولة {verificationAttempts} من 30</span>
              </div>
            ) : subscription.subscribed ? (
              <p className="text-muted-foreground mb-8">
                تم تفعيل اشتراكك بنجاح. يمكنك الآن الوصول إلى جميع الخدمات.
              </p>
            ) : (
              <div className="space-y-4 mb-8">
                <p className="text-muted-foreground">
                  إذا لم يتفعّل الاشتراك تلقائياً، اضغط على الزر أدناه:
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleManualRefresh} 
                  className="w-full"
                  disabled={isVerifying}
                >
                  <RefreshCw className={`w-4 h-4 ml-2 ${isVerifying ? 'animate-spin' : ''}`} />
                  تحديث حالة الاشتراك
                </Button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/">
                <Button variant="golden" size="lg">
                  <Home className="w-4 h-4 ml-2" />
                  الصفحة الرئيسية
                </Button>
              </Link>
              <Link to="/consultation">
                <Button variant="outline" size="lg" className="border-golden/30 text-golden hover:bg-golden/10">
                  بدء استشارة
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SubscriptionSuccess;
