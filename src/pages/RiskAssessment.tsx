import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, ShieldAlert, ShieldCheck, Shield, AlertTriangle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ServiceGuard } from "@/components/ServiceGuard";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface RiskAssessment {
  id: string;
  case_title: string;
  case_description: string;
  category: string;
  jurisdiction: string;
  score: number;
  level: RiskLevel;
  signals: any;
  ai_analysis: string;
  ai_confidence: number;
  risk_flags: any;
  recommendations: string[];
  status: string;
  created_at: string;
}

const CATEGORIES = [
  "جنائي",
  "نزاع مالي كبير",
  "إنهاء خدمات",
  "صياغة عقود",
  "أحوال شخصية",
  "عقاري",
  "تجاري",
  "عمالي",
  "عام",
];

const levelConfig: Record<RiskLevel, { color: string; icon: any; label: string; bg: string }> = {
  LOW: { color: "text-green-400", icon: ShieldCheck, label: "منخفض", bg: "bg-green-500/20" },
  MEDIUM: { color: "text-yellow-400", icon: Shield, label: "متوسط", bg: "bg-yellow-500/20" },
  HIGH: { color: "text-orange-400", icon: AlertTriangle, label: "مرتفع", bg: "bg-orange-500/20" },
  CRITICAL: { color: "text-red-400", icon: ShieldAlert, label: "حرج", bg: "bg-red-500/20" },
};

const RiskAssessment = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    case_title: "",
    case_description: "",
    category: "عام",
    jurisdiction: "المملكة العربية السعودية",
  });

  useEffect(() => {
    if (user) fetchAssessments();
  }, [user]);

  const fetchAssessments = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from("risk_assessments")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setAssessments((data as any[]) || []);
    setLoadingHistory(false);
  };

  const handleSubmit = async () => {
    if (!form.case_title.trim() || !form.case_description.trim()) {
      toast.error("يرجى ملء عنوان ووصف القضية");
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("risk-analyze", {
        body: form,
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;
      toast.success("تم تحليل المخاطر بنجاح");
      setForm({ case_title: "", case_description: "", category: "عام", jurisdiction: "المملكة العربية السعودية" });
      fetchAssessments();
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ أثناء التحليل");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("risk_assessments").delete().eq("id", id);
    if (error) toast.error("فشل الحذف");
    else {
      toast.success("تم الحذف");
      setAssessments((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const RiskBadge = ({ level }: { level: RiskLevel }) => {
    const cfg = levelConfig[level] || levelConfig.LOW;
    const Icon = cfg.icon;
    return (
      <Badge className={`${cfg.bg} ${cfg.color} border-0 gap-1`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </Badge>
    );
  };

  return (
    <ServiceGuard sectionKey="risks">
      <Layout>
        <SEO title="تقييم المخاطر القانونية | محامي" description="تحليل وتقييم المخاطر القانونية بالذكاء الاصطناعي" />
        <div className="container mx-auto px-4 py-8 max-w-5xl" dir="rtl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">تقييم المخاطر القانونية</h1>
            <p className="text-muted-foreground">تحليل شامل للمخاطر القانونية باستخدام الذكاء الاصطناعي</p>
          </div>

          {/* Form */}
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                تحليل جديد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>عنوان القضية</Label>
                <Input
                  value={form.case_title}
                  onChange={(e) => setForm({ ...form, case_title: e.target.value })}
                  placeholder="مثال: نزاع عقد إيجار تجاري"
                  maxLength={500}
                />
              </div>
              <div>
                <Label>وصف القضية</Label>
                <Textarea
                  value={form.case_description}
                  onChange={(e) => setForm({ ...form, case_description: e.target.value })}
                  placeholder="اشرح تفاصيل القضية والوقائع الرئيسية..."
                  rows={5}
                  maxLength={5000}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>الفئة</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الاختصاص القضائي</Label>
                  <Input
                    value={form.jurisdiction}
                    onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleSubmit} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <ShieldAlert className="w-4 h-4 ml-2" />}
                {loading ? "جاري التحليل..." : "تحليل المخاطر"}
              </Button>
            </CardContent>
          </Card>

          {/* History */}
          <h2 className="text-xl font-bold text-foreground mb-4">سجل التقييمات</h2>
          {loadingHistory ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : assessments.length === 0 ? (
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-lg">لا توجد تقييمات سابقة</p>
                <p className="text-muted-foreground text-sm">ابدأ بإدخال بيانات قضيتك أعلاه</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {assessments.map((a) => {
                const expanded = expandedId === a.id;
                const cfg = levelConfig[a.level] || levelConfig.LOW;
                return (
                  <Card key={a.id} className="overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedId(expanded ? null : a.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <RiskBadge level={a.level} />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{a.case_title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("ar-SA")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-left w-16">
                          <p className={`text-lg font-bold ${cfg.color}`}>{a.score}</p>
                          <p className="text-[10px] text-muted-foreground">/ 100</p>
                        </div>
                        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                    {expanded && (
                      <CardContent className="border-t border-border pt-4 space-y-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">مستوى المخاطر</p>
                          <Progress value={a.score} className="h-3" />
                        </div>
                        {a.ai_analysis && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">التحليل</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{a.ai_analysis}</p>
                          </div>
                        )}
                        {a.recommendations && a.recommendations.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">التوصيات</p>
                            <ul className="list-disc list-inside space-y-1">
                              {a.recommendations.map((r: string, i: number) => (
                                <li key={i} className="text-sm text-foreground">{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>الثقة: {Math.round((a.ai_confidence || 0) * 100)}%</span>
                          <span>الفئة: {a.category}</span>
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(a.id)}>
                          <Trash2 className="w-3 h-3 ml-1" /> حذف
                        </Button>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Layout>
    </ServiceGuard>
  );
};

export default RiskAssessment;
