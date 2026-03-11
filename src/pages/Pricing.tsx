import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { isIOSApp } from "@/utils/isIOSApp";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2, AlertCircle, CreditCard, Building2, User, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PaymentSheetV2 } from "@/components/checkout/PaymentSheetV2";

const PaymentMethodBadges = () => (
  <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M17.0498 3.14001C15.7298 3.14001 14.5698 3.76001 13.8298 4.74001C13.1898 5.57001 12.7698 6.68001 12.8698 7.82001C14.3198 7.87001 15.6998 7.12001 16.4298 6.06001C17.0798 5.10001 17.4498 3.97001 17.0498 3.14001Z"/>
        <path d="M21.8298 17.0799C21.2998 18.3099 20.9398 18.8199 20.3098 19.9499C19.4498 21.4699 18.2298 23.3499 16.5898 23.3699C15.1298 23.3899 14.7498 22.4499 12.7798 22.4599C10.8098 22.4799 10.3898 23.3999 8.92977 23.3799C7.28977 23.3499 6.12977 21.6499 5.26977 20.1199C2.72977 15.8899 2.45977 10.8699 4.21977 8.17991C5.45977 6.27991 7.41977 5.17991 9.26977 5.17991C10.9898 5.17991 12.1098 6.10991 13.5098 6.10991C14.8698 6.10991 15.7398 5.17991 17.7298 5.17991C19.3698 5.17991 21.1098 6.08991 22.3498 7.68991C18.0398 10.0099 18.7098 15.9999 21.8298 17.0799Z"/>
      </svg>
      <span className="text-xs font-medium">Apple Pay</span>
    </div>
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
      <CreditCard className="w-5 h-5 text-green-500" />
      <span className="text-xs font-medium">مدى</span>
    </div>
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
      <CreditCard className="w-5 h-5 text-primary" />
      <span className="text-xs font-medium">Visa / Mastercard</span>
    </div>
  </div>
);

type BillingCycle = "monthly" | "yearly";

interface DBPlan {
  id: string;
  code: string;
  name: string;
  period: string;
  duration_days: number;
  price_halala: number;
  currency: string;
  is_active: boolean;
}

// Feature lists per plan category
const planFeatures: Record<string, string[]> = {
  personal: [
    "استشارات بالذكاء الاصطناعي",
    "نماذج عقود وتحليلها",
    "تنبؤ بالأحكام بالذكاء الاصطناعي",
    "شكاوى بالنظام الذكي",
    "استشارة خاصة من محامي مرخص",
    "محرك البحث القانوني",
    "دعم بريد إلكتروني",
  ],
  company: [
    "جميع مميزات الباقة الشخصية",
    "استشارات غير محدودة بالذكاء الاصطناعي",
    "نماذج عقود وتحليل غير محدود",
    "تنبؤات بالأحكام غير محدودة",
    "شكاوى غير محدودة بالنظام الذكي",
    "استشارات خاصة متعددة من محامين مرخصين",
    "استخدام محرك البحث غير محدود",
    "دعم مخصص 24/7",
    "تواصل مباشر مع محامين",
    "مستخدمين متعددين",
  ],
};

const BillingToggle = ({
  value,
  onChange,
}: {
  value: BillingCycle;
  onChange: (v: BillingCycle) => void;
}) => (
  <div className="inline-flex items-center rounded-full bg-muted p-1 gap-1">
    <button
      onClick={() => onChange("monthly")}
      className={cn(
        "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200",
        value === "monthly"
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      شهري
    </button>
    <button
      onClick={() => onChange("yearly")}
      className={cn(
        "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
        value === "yearly"
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      سنوي
      <span className={cn(
        "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
        value === "yearly"
          ? "bg-primary-foreground/20 text-primary-foreground"
          : "bg-green-500/10 text-green-500"
      )}>
        وفّر أكثر
      </span>
    </button>
  </div>
);

const Pricing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, subscription, checkSubscription } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; name: string; price: number } | null>(null);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [billingCycles, setBillingCycles] = useState<Record<string, BillingCycle>>({
    personal: "monthly",
    company: "monthly",
  });
  const [dbPlans, setDbPlans] = useState<DBPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  const requireSubscription = location.state?.requireSubscription;

  useEffect(() => {
    if (isIOSApp()) {
      navigate("/subscription-disabled", { replace: true });
    }
  }, [navigate]);

  // Fetch plans from DB
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("is_active", true)
          .order("price_halala", { ascending: true });

        if (error) throw error;
        setDbPlans(data || []);
      } catch (err) {
        console.error("Error fetching plans:", err);
        toast({ title: "خطأ في تحميل الباقات", variant: "destructive" });
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // Group plans by category (personal/company)
  const planCategories = ["personal", "company"] as const;
  
  const getPlanForCategory = (category: string, cycle: BillingCycle): DBPlan | undefined => {
    const period = cycle === "yearly" ? "year" : "month";
    return dbPlans.find(p => p.code === `${category}_${cycle === "yearly" ? "yearly" : "monthly"}` && p.period === period);
  };

  const getCategoryIcon = (category: string) => category === "company" ? Building2 : User;
  const getCategoryName = (category: string) => category === "company" ? "باقة الشركات" : "الباقة الشخصية";
  const getCategoryDescription = (category: string) => category === "company" ? "للشركات والمؤسسات" : "للأفراد والاستخدام الشخصي";
  const isCategoryPopular = (category: string) => category === "company";

  const handleSubscribe = (category: string) => {
    if (!user) {
      navigate("/auth", { state: { from: location } });
      return;
    }

    const cycle = billingCycles[category];
    const plan = getPlanForCategory(category, cycle);
    if (!plan) {
      toast({ title: "الباقة غير متاحة", variant: "destructive" });
      return;
    }

    const priceInRiyals = plan.price_halala / 100;
    setSelectedPlan({
      id: plan.code,
      name: `${getCategoryName(category)} (${cycle === "yearly" ? "سنوي" : "شهري"})`,
      price: priceInRiyals,
    });
    setIsPaymentSheetOpen(true);
  };

  const handleClosePaymentSheet = () => {
    setIsPaymentSheetOpen(false);
    setSelectedPlan(null);
  };

  const isCurrentPlan = (category: string) => {
    if (!subscription.subscribed) return false;
    return (subscription.planType || "").startsWith(category);
  };

  if (plansLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (dbPlans.length === 0) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Crown className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">الباقات قيد التحديث</h2>
            <p className="text-muted-foreground">يتم تحديث خطط الاشتراك حالياً. يرجى المحاولة لاحقاً.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title="الاشتراكات والأسعار"
        description="اشترك في محامي كوم واحصل على خدمات قانونية متميزة."
        url="/pricing"
        keywords="أسعار محامي كوم, اشتراك قانوني, باقات محامي"
      />
      <section className="py-24">
        <div className="container mx-auto px-4">
          {requireSubscription && (
            <Alert className="max-w-2xl mx-auto mb-8 border-primary/50 bg-primary/10">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground">
                هذه الخدمة متاحة للمشتركين فقط. اختر الباقة المناسبة.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              خطط الاشتراك
            </span>
            <h1 className="font-cairo font-bold text-3xl md:text-4xl text-foreground mb-6">
              اختر الخطة المناسبة لك
            </h1>
            <p className="text-muted-foreground text-lg mb-4">
              خطط مرنة تناسب احتياجاتك مع إمكانية الترقية في أي وقت
            </p>
            <PaymentMethodBadges />
            {subscription.subscribed && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 mt-6">
                <Check className="w-4 h-4" />
                <span>أنت مشترك حالياً</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {planCategories.map((category) => {
              const cycle = billingCycles[category];
              const monthlyPlan = getPlanForCategory(category, "monthly");
              const yearlyPlan = getPlanForCategory(category, "yearly");
              const currentPlan = cycle === "yearly" ? yearlyPlan : monthlyPlan;
              
              if (!currentPlan) return null;

              const priceInRiyals = currentPlan.price_halala / 100;
              const monthlySavings = (monthlyPlan && yearlyPlan && cycle === "yearly")
                ? Math.round((monthlyPlan.price_halala * 12 - yearlyPlan.price_halala) / 100)
                : 0;
              const PlanIcon = getCategoryIcon(category);
              const isPopular = isCategoryPopular(category);
              const features = planFeatures[category] || [];

              return (
                <div
                  key={category}
                  className={cn(
                    "relative p-8 rounded-2xl border transition-all duration-300",
                    isPopular
                      ? "bg-gradient-to-b from-primary/10 to-card border-primary shadow-lg"
                      : "bg-card border-border hover:border-primary/50",
                    isCurrentPlan(category) && "ring-2 ring-green-500"
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg">
                        <Sparkles className="w-4 h-4" />
                        الأكثر شيوعاً
                      </div>
                    </div>
                  )}

                  {isCurrentPlan(category) && (
                    <div className="absolute -top-4 right-4">
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500 text-white text-xs font-medium">
                        <Check className="w-3 h-3" />
                        خطتك الحالية
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <PlanIcon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-cairo font-bold text-2xl text-foreground mb-1">
                      {getCategoryName(category)}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-5">{getCategoryDescription(category)}</p>

                    <BillingToggle
                      value={cycle}
                      onChange={(v) => setBillingCycles((prev) => ({ ...prev, [category]: v }))}
                    />

                    <div className="mt-5">
                      <span className="font-cairo font-black text-5xl text-foreground">
                        {priceInRiyals}
                      </span>
                      <span className="text-muted-foreground mr-2">
                        ريال / {cycle === "yearly" ? "سنوياً" : "شهرياً"}
                      </span>
                    </div>

                    {cycle === "yearly" && monthlySavings > 0 && (
                      <p className="text-green-500 text-sm font-medium mt-2">
                        توفير {monthlySavings} ريال سنوياً
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-foreground text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan(category) ? (
                    <Button
                      variant="outline"
                      className="w-full border-primary/30 text-primary hover:bg-primary/10"
                      size="lg"
                      onClick={() => navigate("/subscription")}
                    >
                      إدارة الاشتراك
                    </Button>
                  ) : (
                    <Button
                      variant={isPopular ? "default" : "outline"}
                      className={cn("w-full", !isPopular && "border-primary/30 text-primary hover:bg-primary/10")}
                      size="lg"
                      onClick={() => handleSubscribe(category)}
                    >
                      {subscription.subscribed ? "ترقية الباقة" : "اشترك الآن"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {user && (
            <div className="text-center mt-8">
              <Button variant="ghost" onClick={checkSubscription} className="text-muted-foreground hover:text-foreground">
                تحديث حالة الاشتراك
              </Button>
            </div>
          )}

          <PaymentSheetV2
            isOpen={isPaymentSheetOpen}
            onClose={handleClosePaymentSheet}
            plan={selectedPlan}
          />
        </div>
      </section>
    </Layout>
  );
};

export default Pricing;
