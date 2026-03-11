import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { isIOSApp } from "@/utils/isIOSApp";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  CreditCard, Calendar, CheckCircle, XCircle, Crown, Loader2,
  AlertTriangle, Bell, Clock, RefreshCw, Receipt, History, Download
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ar } from "date-fns/locale";
import { Link, Navigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  plan_type: string | null;
  description: string | null;
  created_at: string;
}

interface SubscriptionDetails {
  id: string;
  plan_type: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  ends_at: string | null;
  started_at: string | null;
  created_at: string;
}

interface DBPlan {
  id: string;
  code: string;
  name: string;
  price_halala: number;
  period: string;
}

const SubscriptionManagement = () => {
  const navigate = useNavigate();
  const { user, subscription, loading } = useAuth();
  const { toast } = useToast();
  const [cancelReason, setCancelReason] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("");

  useEffect(() => {
    if (isIOSApp()) {
      navigate("/subscription-disabled", { replace: true });
      return;
    }
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        const { data: subData, error: subError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (subError) throw subError;
        setSubscriptionDetails(subData);

        // Fetch plan name from DB
        if (subData?.plan_type) {
          const { data: dbPlan } = await supabase
            .from("subscription_plans")
            .select("name, price_halala, period")
            .eq("code", subData.plan_type)
            .maybeSingle();

          if (dbPlan) {
            setPlanName(dbPlan.name);
            const priceRiyals = dbPlan.price_halala / 100;
            setPlanPrice(`${priceRiyals} ريال/${dbPlan.period === 'year' ? 'سنوياً' : 'شهرياً'}`);
          } else {
            setPlanName(subData.plan_type);
            setPlanPrice("");
          }
        }

        const { data: payments, error: paymentsError } = await supabase
          .from("payment_history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (paymentsError) throw paymentsError;
        setPaymentHistory(payments || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoadingDetails(false);
        setIsLoadingPayments(false);
      }
    };

    fetchData();
  }, [user]);

  if (!user && !loading) {
    return <Navigate to="/auth" replace />;
  }

  const getDaysRemaining = () => {
    const endDate = subscriptionDetails?.ends_at || subscription.subscriptionEnd;
    if (!endDate) return null;
    return Math.max(0, differenceInDays(new Date(endDate), new Date()));
  };

  const handleCancelRequest = async () => {
    if (!cancelReason.trim()) {
      toast({ title: "يرجى إدخال سبب الإلغاء", variant: "destructive" });
      return;
    }
    setIsCanceling(true);
    try {
      toast({
        title: "تم استلام طلبك",
        description: "سنتواصل معك خلال 24-48 ساعة. يمكنك مراسلتنا على info@mohamie.com",
      });
      setShowCancelDialog(false);
      setCancelReason("");
    } finally {
      setIsCanceling(false);
    }
  };

  const handleSendRenewalReminder = async () => {
    setIsSendingReminder(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No session");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscription-reminder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ userId: user?.id }),
        }
      );
      const result = await response.json();
      if (result.success) {
        toast({ title: "تم إرسال التذكير", description: "تم إرسال تذكير بتجديد الاشتراك" });
      } else {
        throw new Error(result.error);
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في إرسال التذكير", variant: "destructive" });
    } finally {
      setIsSendingReminder(false);
    }
  };

  if (loading || isLoadingDetails) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const daysRemaining = getDaysRemaining();
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = daysRemaining !== null && daysRemaining <= 0;

  return (
    <Layout>
      <SEO title="إدارة الاشتراك" description="إدارة اشتراكك في محامي كوم" url="/subscription" />
      
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-cairo font-bold text-3xl text-foreground mb-8 text-center">إدارة الاشتراك</h1>

            {isExpiringSoon && (
              <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-amber-500/20">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-amber-200">
                        اشتراكك ينتهي خلال {daysRemaining} {daysRemaining === 1 ? 'يوم' : 'أيام'}!
                      </p>
                    </div>
                    <Link to="/pricing">
                      <Button size="sm">تجديد الآن</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-primary/20 mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    باقتك الحالية
                  </CardTitle>
                  <Badge 
                    variant={subscription.subscribed ? "default" : "secondary"}
                    className={
                      isExpired ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : subscription.subscribed ? "bg-green-500/20 text-green-400 border-green-500/30" : ""
                    }
                  >
                    {isExpired ? <><XCircle className="w-3 h-3 ml-1" /> منتهي</>
                      : subscription.subscribed ? <><CheckCircle className="w-3 h-3 ml-1" /> نشط</>
                      : <><XCircle className="w-3 h-3 ml-1" /> غير مشترك</>}
                  </Badge>
                </div>
                <CardDescription>تفاصيل اشتراكك والباقة المختارة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-sm">الباقة</span>
                    </div>
                    <p className="font-semibold text-foreground text-lg">{planName || "مجانية"}</p>
                    {planPrice && <p className="text-sm text-muted-foreground">{planPrice}</p>}
                  </div>

                  {subscription.subscribed && (subscriptionDetails?.ends_at || subscription.subscriptionEnd) && (
                    <>
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">ينتهي في</span>
                        </div>
                        <p className="font-semibold text-foreground text-lg">
                          {format(new Date(subscriptionDetails?.ends_at || subscription.subscriptionEnd!), "d MMMM yyyy", { locale: ar })}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">المتبقي</span>
                        </div>
                        <p className={`font-semibold text-lg ${isExpiringSoon ? 'text-amber-400' : isExpired ? 'text-red-400' : 'text-foreground'}`}>
                          {daysRemaining === 0 ? 'ينتهي اليوم' : `${daysRemaining} ${daysRemaining === 1 ? 'يوم' : 'أيام'}`}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  {!subscription.subscribed ? (
                    <Link to="/pricing" className="flex-1">
                      <Button className="w-full">اشترك الآن</Button>
                    </Link>
                  ) : (
                    <>
                      <Link to="/pricing" className="flex-1">
                        <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10">
                          <RefreshCw className="w-4 h-4 ml-2" />
                          ترقية الباقة
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" className="flex-1 border-border/50"
                        onClick={handleSendRenewalReminder} disabled={isSendingReminder}
                      >
                        {isSendingReminder ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Bell className="w-4 h-4 ml-2" />تذكير بالتجديد</>}
                      </Button>
                      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10">
                            طلب إلغاء الاشتراك
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>طلب إلغاء الاشتراك</DialogTitle>
                            <DialogDescription>نأسف لرؤيتك تغادر. يرجى إخبارنا بسبب الإلغاء.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label htmlFor="cancel-reason">سبب الإلغاء</Label>
                              <Textarea
                                id="cancel-reason"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="أخبرنا عن سبب رغبتك في الإلغاء..."
                                className="mt-2"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>إلغاء</Button>
                            <Button variant="destructive" onClick={handleCancelRequest} disabled={isCanceling}>
                              {isCanceling ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد طلب الإلغاء"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  سجل المدفوعات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPayments ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <Receipt className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">لا توجد مدفوعات سابقة</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">الباقة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentHistory.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{format(new Date(payment.created_at), "d MMM yyyy", { locale: ar })}</TableCell>
                          <TableCell>{payment.amount} {payment.currency}</TableCell>
                          <TableCell>
                            <Badge variant={payment.status === "completed" ? "default" : "secondary"}
                              className={payment.status === "completed" ? "bg-green-500/20 text-green-400" : ""}>
                              {payment.status === "completed" ? "مكتمل" : payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{payment.plan_type || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default SubscriptionManagement;
