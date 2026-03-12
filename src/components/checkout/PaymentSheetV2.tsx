import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, Lock, AlertCircle, CreditCard, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useMoyasarConfig } from "@/hooks/useMoyasarConfig";
import { useMoyasarSdk } from "@/hooks/useMoyasarSdk";
import { supabase } from "@/integrations/supabase/client";

interface PlanInfo {
  id: string;
  code: string;
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
  }
}

  type PaymentMethod = "card" | "stcpay";

function getHashRouteUrl(pathWithQuery: string) {
  const origin = window.location.origin;
  const cleaned = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  return `${origin}/#${cleaned}`;
}

export function PaymentSheetV2({ isOpen, onClose, plan }: PaymentSheetV2Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: cfg, error: cfgError, loading: cfgLoading } = useMoyasarConfig(isOpen);
  const { ready: sdkReady, error: sdkError } = useMoyasarSdk(isOpen && !!cfg?.publishableKey);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("card");
  const [stcMobile, setStcMobile] = useState("");
  const [stcLoading, setStcLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [initError, setInitError] = useState<string>("");
  const [initialized, setInitialized] = useState(false);

  const containerId = useRef(`moyasar-${Math.random().toString(36).slice(2)}`);
  const lastInitKey = useRef<string | null>(null);

  const stcPayEnabled = useMemo(() => {
    return cfg?.supportedMethods?.includes("stcpay") ?? false;
  }, [cfg?.supportedMethods]);

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
    if (!isOpen || selectedMethod !== "card" || !plan || !sdkReady || !cfg?.publishableKey || !window.Moyasar) return;

    // IMPORTANT: include price in the init key so a price change forces a full re-init
    const initKey = `${cfg.publishableKey}:${plan.id}:${plan.code}:${plan.price}:${user?.id ?? "anon"}`;
    if (lastInitKey.current === initKey && initialized) return;

    const initMoyasar = () => {
      const el = document.getElementById(containerId.current);
      if (!el) return;

      // IMPORTANT: Full clear before re-init (Safari)
      el.innerHTML = "";

      const amountInHalala = Math.round(plan.price * 100);
      const callbackUrl = getHashRouteUrl(`/subscription-success?plan=${encodeURIComponent(plan.code)}`);

      try {
        window.Moyasar.init({
          element: `#${containerId.current}`,
          amount: amountInHalala,
          currency: "SAR",
          description: `اشتراك ${plan.name} - محامي كوم`,
          publishable_api_key: cfg.publishableKey,
          callback_url: callbackUrl,
          methods: ["creditcard"],
          metadata: {
            user_id: user?.id || "",
            plan_id: plan.id,
            plan_code: plan.code,
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
                `/subscription-success?plan=${encodeURIComponent(plan.code)}&payment_id=${encodeURIComponent(
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
    };

    // Use requestAnimationFrame to ensure the container element is fully
    // mounted in the DOM before calling Moyasar.init()
    const rafId = requestAnimationFrame(() => {
      initMoyasar();
    });

    return () => cancelAnimationFrame(rafId);
  }, [isOpen, selectedMethod, plan, sdkReady, cfg?.publishableKey, user, toast, onClose, initialized]);

  const handleStcPayCheckout = async () => {
    if (!plan || !user) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "يجب تسجيل الدخول قبل إتمام الدفع.",
        variant: "destructive",
      });
      return;
    }

    const normalizedMobile = stcMobile.replace(/\s+/g, "");
    if (!normalizedMobile) {
      toast({
        title: "رقم الجوال مطلوب",
        description: "أدخل رقم الجوال المرتبط بمحفظة STC Pay.",
        variant: "destructive",
      });
      return;
    }

    setStcLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("جلسة المستخدم غير متاحة");
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-moyasar-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          planCode: plan.code,
          paymentMethod: "stcpay",
          mobile: normalizedMobile,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }

      if (payload?.status === "paid") {
        const successUrl = getHashRouteUrl(
          `/subscription-success?plan=${encodeURIComponent(plan.code)}&payment_id=${encodeURIComponent(
            payload.paymentId || ""
          )}&status=paid`
        );
        window.location.href = successUrl;
        return;
      }

      if (!payload?.url) {
        throw new Error("لم يتم استلام رابط الدفع من STC Pay");
      }

      window.location.href = payload.url;
    } catch (error) {
      toast({
        title: "فشل تهيئة STC Pay",
        description: error instanceof Error ? error.message : "تعذر بدء عملية الدفع.",
        variant: "destructive",
      });
    } finally {
      setStcLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      lastInitKey.current = null;
      setInitialized(false);
      setIsProcessing(false);
      setInitError("");
      setSelectedMethod("card");
      setStcMobile("");
      setStcLoading(false);
    }
  }, [isOpen]);

  if (!plan) return null;

  const priceWithVat = plan.price;
  const vatAmount = Math.round(plan.price * 0.15 * 100) / 100;
  const priceBeforeVat = Math.round((plan.price - vatAmount) * 100) / 100;
  const isYearly = plan.code.includes("yearly");



  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-y-auto" dir="rtl">
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

          <Tabs value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as PaymentMethod)} className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-2 border border-border/60 bg-muted/50 p-1">
              <TabsTrigger value="card" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground">
                <CreditCard className="h-4 w-4" />
                البطاقة
              </TabsTrigger>
              <TabsTrigger
                value="stcpay"
                disabled={!stcPayEnabled}
                className="gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                <Smartphone className="h-4 w-4" />
                STC Pay
              </TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="mt-0">
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
                    <p className="mb-3 text-xs text-muted-foreground text-center">
                      أدخل بيانات بطاقتك (مدى، Visa، MasterCard) لإتمام الدفع
                    </p>

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
            </TabsContent>

            <TabsContent value="stcpay" className="mt-0">
              <div className="space-y-4 rounded-xl border border-border/60 bg-card/70 p-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    سيتم تحويلك إلى صفحة STC Pay لإكمال السداد ثم العودة تلقائياً إلى المنصة.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">رقم جوال STC Pay</label>
                  <Input
                    dir="ltr"
                    inputMode="tel"
                    placeholder="05XXXXXXXX أو 9665XXXXXXXX"
                    value={stcMobile}
                    onChange={(event) => setStcMobile(event.target.value)}
                  />
                </div>

                <Button className="w-full bg-golden text-black hover:bg-golden/90" onClick={handleStcPayCheckout} disabled={stcLoading}>
                  {stcLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "المتابعة إلى STC Pay"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

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
