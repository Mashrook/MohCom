import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEntitlement, useIsInsideNativeApp } from "@/hooks/useEntitlement";
import { Crown, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { purchase } from "@/native/storekit";
import { toast } from "sonner";

const FEATURES = [
  "استشارات قانونية بالذكاء الاصطناعي غير محدودة",
  "توقعات الأحكام القضائية المتقدمة",
  "إنشاء وتحليل العقود القانونية",
  "البحث القانوني الشامل",
  "مساعد الشكاوى الذكي",
  "دعم فني أولوية",
];

const PLANS = [
  { id: "com.mohamie.ios.month", label: "شهري", price: "٥٩.٩٩", unit: "شهر" },
  { id: "com.mohamie.ios.year", label: "سنوي", price: "٥٩٩", unit: "سنة", badge: "وفّر ١٢٠ ر.س" },
];

export default function Paywall() {
  const { active } = useEntitlement();
  const isNative = useIsInsideNativeApp();
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  if (active) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <SEO title="الاشتراك المميز | محامي كوم" description="أنت مشترك بالفعل" />
        <CheckCircle2 className="h-16 w-16 text-[hsl(45,80%,55%)]" />
        <h1 className="text-2xl font-bold text-foreground">أنت مشترك بالفعل!</h1>
        <p className="text-muted-foreground">استمتع بجميع الميزات المميزة</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة
        </Button>
      </div>
    );
  }

  const handlePurchase = async (productId: string) => {
    setPurchasing(productId);
    try {
      await purchase(productId);
      toast.success("تم الاشتراك بنجاح!");
    } catch (error: any) {
      if (!error?.message?.includes("cancelled")) {
        toast.error(error?.message || "فشل الشراء");
      }
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div dir="rtl" className="mx-auto max-w-lg px-4 py-10">
      <SEO title="الاشتراك المميز | محامي كوم" description="اشترك في محامي كوم واحصل على وصول كامل لجميع الميزات القانونية الذكية" />

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(45,80%,55%)]/10">
          <Crown className="h-8 w-8 text-[hsl(45,80%,55%)]" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">الاشتراك المميز</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          احصل على وصول كامل لجميع خدمات محامي كوم
        </p>
      </div>

      {/* Features */}
      <ul className="mb-8 space-y-3">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(45,80%,55%)]" />
            {f}
          </li>
        ))}
      </ul>

      {/* Plans */}
      {isNative ? (
        <div className="space-y-3">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => handlePurchase(plan.id)}
              disabled={purchasing !== null}
              className="relative w-full rounded-xl border-2 border-[hsl(45,80%,55%)]/40 bg-card p-4 text-right transition hover:border-[hsl(45,80%,55%)] focus:outline-none focus:ring-2 focus:ring-[hsl(45,80%,55%)]/50 disabled:opacity-50"
            >
              {plan.badge && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-[hsl(45,80%,55%)] px-2.5 py-0.5 text-[10px] font-bold text-background">
                  {plan.badge}
                </span>
              )}
              <div className="flex items-center justify-between">
                {purchasing === plan.id ? (
                  <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                ) : (
                  <span className="text-lg font-bold text-foreground">{plan.price} ر.س/{plan.unit}</span>
                )}
                <span className="rounded-lg bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {plan.label}
                </span>
              </div>
            </button>
          ))}

          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full text-xs text-muted-foreground"
            onClick={async () => {
              try {
                const { restore } = await import("@/native/storekit");
                await restore();
                toast.success("تم استعادة المشتريات");
              } catch { toast.error("فشل استعادة المشتريات"); }
            }}
          >
            استعادة المشتريات
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            الاشتراكات متاحة عبر تطبيق محامي كوم على iOS
          </p>
        </div>
      )}
    </div>
  );
}
