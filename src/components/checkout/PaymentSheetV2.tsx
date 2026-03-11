import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Lock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useMoyasarConfig } from "@/hooks/useMoyasarConfig";
import { useMoyasarSdk } from "@/hooks/useMoyasarSdk";

interface PlanInfo {
  id: string;
  name: string;
  price: number;
}

interface PaymentSheetV2Props {
  isOpen: boolean;
  onClose: () => void;
  plan: PlanInfo | null;
}

declare global {
  interface Window {
    Moyasar?: any;
    ApplePaySession?: any;
  }
}

function getHashRouteUrl(pathWithQuery: string) {
  const origin = window.location.origin;
  const cleaned = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  return `${origin}/#${cleaned}`;
}

function canUseApplePay() {
  try {
    const topLevel = window.top === window.self;
    if (!topLevel) return false;
    if (!window.ApplePaySession) return false;
    return !!window.ApplePaySession.canMakePayments?.();
  } catch {
    return false;
  }
}

export function PaymentSheetV2({ isOpen, onClose, plan }: PaymentSheetV2Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: cfg, error: cfgError, loading: cfgLoading } = useMoyasarConfig(isOpen);
  const { ready: sdkReady, error: sdkError } = useMoyasarSdk(isOpen && !!cfg?.publishableKey);

  const [isProcessing, setIsProcessing] = useState(false);
  const [initError, setInitError] = useState<string>("");
  const [initialized, setInitialized] = useState(false);

  const containerId = useRef(`moyasar-${Math.random().toString(36).slice(2)}`);
  const lastInitKey = useRef<string | null>(null);

  const applePayAvailable = useMemo(() => {
    if (typeof window === "undefined") return false;
    return canUseApplePay();
  }, [isOpen]);

  const friendlyError = useMemo(() => {
    const raw = initError || cfgError || sdkError;
    if (!raw) return "";

    if (raw.includes("Moyasar not configured")) return "نظام الدفع غير مُهيأ. يرجى التواصل مع الإدارة.";
    if (raw.includes("HTTP 404")) return "خدمة الدفع الخلفية غير منشورة على Supabase حالياً.";
    if (raw.includes("Failed to fetch")) return "تعذر الوصول إلى خدمة الدفع الخلفية. تحقق من إعدادات Supabase والنطاق المسموح.";
    if (raw.includes("timeout")) return "فشل في تحميل نظام الدفع.";

    return "حدث خطأ في نظام الدفع. حاول مرة أخرى.";
  }, [initError, cfgError, sdkError]);

  useEffect(() => {
    if (!isOpen) return;
    setInitError("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !plan || !sdkReady || !cfg?.publishableKey || !window.Moyasar) return;

    // IMPORTANT: include price in the init key so a price change forces a full re-init
    const initKey = `${cfg.publishableKey}:${plan.id}:${plan.price}:${user?.id ?? "anon"}`;
    if (lastInitKey.current === initKey && initialized) return;

    const el = document.getElementById(containerId.current);
    if (!el) return;

    // IMPORTANT: Full clear before re-init (Safari)
    el.innerHTML = "";

    const amountInHalala = Math.round(plan.price * 100);
    const callbackUrl = getHashRouteUrl(`/subscription-success?plan=${encodeURIComponent(plan.id)}`);

    // NOTE: بعض طرق الدفع (مثل STC Pay / Apple Pay) قد لا تعمل في وضع الاختبار
    const isTestKey = cfg.publishableKey.startsWith("pk_test_");
    const methods = isTestKey ? ["creditcard"] : ["creditcard", "applepay", "stcpay"];

    try {
      window.Moyasar.init({
        element: `#${containerId.current}`,
        amount: amountInHalala,
        currency: "SAR",
        description: `اشتراك ${plan.name} - محامي كوم`,
        publishable_api_key: cfg.publishableKey,
        callback_url: callbackUrl,
        methods,
        ...(methods.includes("applepay")
          ? {
              apple_pay: {
                country: "SA",
                label: "محامي كوم",
                validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate",
              },
            }
          : {}),
        metadata: {
          user_id: user?.id || "",
          plan_id: plan.id,
          user_email: user?.email || "",
        },
        on_initiating: () => {
          setIsProcessing(true);
        },
        on_completed: (payment: any) => {
          setIsProcessing(false);

          if (payment?.status === "paid") {
            toast({ title: "تم الدفع بنجاح!", description: "جاري تفعيل اشتراكك..." });
            onClose();

            const successUrl = getHashRouteUrl(
              `/subscription-success?plan=${encodeURIComponent(plan.id)}&payment_id=${encodeURIComponent(
                payment.id
              )}&status=paid`
            );
            window.location.href = successUrl;
          }
        },
        on_failure: (error: any) => {
          setIsProcessing(false);
          toast({
            title: "فشل الدفع",
            description: error?.message || "حدث خطأ في عملية الدفع. يرجى المحاولة مرة أخرى.",
            variant: "destructive",
          });
        },
      });

      lastInitKey.current = initKey;
      setInitialized(true);
    } catch (e) {
      setInitError(e instanceof Error ? e.message : String(e));
    }
  }, [isOpen, plan, sdkReady, cfg?.publishableKey, user, toast, onClose, initialized]);

  useEffect(() => {
    if (!isOpen) {
      lastInitKey.current = null;
      setInitialized(false);
      setIsProcessing(false);
      setInitError("");
    }
  }, [isOpen]);

  if (!plan) return null;

  const priceWithVat = plan.price;
  const vatAmount = Math.round(plan.price * 0.15 * 100) / 100;
  const priceBeforeVat = Math.round((plan.price - vatAmount) * 100) / 100;
  const isYearly = plan.id.includes("yearly");

  const inPreviewOrIframe =
    typeof window !== "undefined" && (window.top !== window.self || !window.location.hostname.endsWith("mohamie.com"));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-b from-primary/10 to-transparent">
          <DialogTitle className="text-center text-xl">الاشتراك في {plan.name}</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {friendlyError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{friendlyError}</AlertDescription>
            </Alert>
          )}

          {inPreviewOrIframe && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Apple Pay قد لا يظهر داخل المعاينة/الإطار، ويظهر فقط على النطاق الرسمي داخل Safari.
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>سعر الباقة (قبل الضريبة)</span>
              <span>{priceBeforeVat.toFixed(2)} ريال</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>ضريبة القيمة المضافة (15%)</span>
              <span>{vatAmount.toFixed(2)} ريال</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-bold text-lg">
              <span>الإجمالي</span>
              <span className="text-primary">{priceWithVat} ريال{isYearly ? "/سنوياً" : "/شهرياً"}</span>
            </div>
          </div>

          <div className="min-h-[280px] relative">
            {friendlyError ? (
              <div className="flex items-center justify-center h-[280px]">
                <div className="text-center space-y-3 max-w-sm">
                  <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
                  <p className="text-sm text-muted-foreground">{friendlyError}</p>
                </div>
              </div>
            ) : cfgLoading || !cfg?.publishableKey ? (
              <div className="flex items-center justify-center h-[280px]">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">جاري تحميل إعدادات الدفع...</p>
                </div>
              </div>
            ) : !sdkReady ? (
              <div className="flex items-center justify-center h-[280px]">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">جاري تحميل نظام الدفع...</p>
                </div>
              </div>
            ) : (
              <div>
                {/* This only affects expectations; Moyasar itself decides what to show */}
                {!applePayAvailable && (
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    Apple Pay غير متاح على هذا الجهاز/الوضع، سيتم عرض طرق الدفع الأخرى.
                  </p>
                )}

                <div
                  id={containerId.current}
                  className="moyasar-form min-h-[300px]"
                />
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg z-50">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">جاري معالجة الدفع...</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg py-3">
            <Lock className="w-4 h-4 text-green-500" />
            <span>دفع آمن ومشفر بمعايير PCI DSS</span>
            <Shield className="w-4 h-4 text-green-500" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
