import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Settings, ShieldAlert, ShieldCheck, Shield, AlertTriangle, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface RiskConfig {
  id: string;
  config_key: string;
  config_name: string;
  config_value: any;
  description: string;
  updated_at: string;
}

interface RiskAssessment {
  id: string;
  user_id: string;
  case_title: string;
  category: string;
  score: number;
  level: RiskLevel;
  ai_confidence: number;
  status: string;
  created_at: string;
}

const levelBadge: Record<RiskLevel, { className: string; label: string }> = {
  LOW: { className: "bg-green-500/20 text-green-400 border-0", label: "منخفض" },
  MEDIUM: { className: "bg-yellow-500/20 text-yellow-400 border-0", label: "متوسط" },
  HIGH: { className: "bg-orange-500/20 text-orange-400 border-0", label: "مرتفع" },
  CRITICAL: { className: "bg-red-500/20 text-red-400 border-0", label: "حرج" },
};

const AdminRiskManagement = () => {
  const [configs, setConfigs] = useState<RiskConfig[]>([]);
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [configRes, assessRes] = await Promise.all([
      supabase.from("risk_configurations").select("*").order("created_at"),
      supabase.from("risk_assessments").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setConfigs((configRes.data as any[]) || []);
    setAssessments((assessRes.data as any[]) || []);

    // Init edit values
    const vals: Record<string, string> = {};
    (configRes.data || []).forEach((c: any) => {
      vals[c.id] = JSON.stringify(c.config_value, null, 2);
    });
    setEditValues(vals);
    setLoading(false);
  };

  const handleSaveConfig = async (config: RiskConfig) => {
    setSaving(config.id);
    try {
      const parsed = JSON.parse(editValues[config.id]);
      const { error } = await supabase
        .from("risk_configurations")
        .update({ config_value: parsed, updated_at: new Date().toISOString() })
        .eq("id", config.id);
      if (error) throw error;
      toast.success(`تم حفظ ${config.config_name}`);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "خطأ في حفظ الإعدادات - تأكد من صحة JSON");
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    const { error } = await supabase.from("risk_assessments").delete().eq("id", id);
    if (error) toast.error("فشل الحذف");
    else {
      toast.success("تم الحذف");
      setAssessments((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const stats = {
    total: assessments.length,
    critical: assessments.filter((a) => a.level === "CRITICAL").length,
    high: assessments.filter((a) => a.level === "HIGH").length,
    medium: assessments.filter((a) => a.level === "MEDIUM").length,
    low: assessments.filter((a) => a.level === "LOW").length,
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="إدارة المخاطر | لوحة التحكم" />
      <div className="container mx-auto px-4 py-8 max-w-6xl" dir="rtl">
        <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-primary" />
          إدارة المخاطر
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: "الإجمالي", value: stats.total, icon: Shield, color: "text-foreground" },
            { label: "حرج", value: stats.critical, icon: ShieldAlert, color: "text-red-400" },
            { label: "مرتفع", value: stats.high, icon: AlertTriangle, color: "text-orange-400" },
            { label: "متوسط", value: stats.medium, icon: Shield, color: "text-yellow-400" },
            { label: "منخفض", value: stats.low, icon: ShieldCheck, color: "text-green-400" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="configs">
          <TabsList className="mb-4">
            <TabsTrigger value="configs">
              <Settings className="w-4 h-4 ml-1" /> إعدادات التقييم
            </TabsTrigger>
            <TabsTrigger value="assessments">
              <ShieldAlert className="w-4 h-4 ml-1" /> التقييمات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configs">
            <div className="space-y-4">
              {configs.map((config) => (
                <Card key={config.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{config.config_name}</span>
                      <Badge variant="outline" className="text-xs">{config.config_key}</Badge>
                    </CardTitle>
                    {config.description && (
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={editValues[config.id] || ""}
                      onChange={(e) => setEditValues({ ...editValues, [config.id]: e.target.value })}
                      rows={5}
                      className="font-mono text-sm"
                      dir="ltr"
                    />
                    <Button
                      onClick={() => handleSaveConfig(config)}
                      disabled={saving === config.id}
                      size="sm"
                    >
                      {saving === config.id ? (
                        <Loader2 className="w-3 h-3 animate-spin ml-1" />
                      ) : (
                        <Save className="w-3 h-3 ml-1" />
                      )}
                      حفظ
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="assessments">
            {assessments.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-12 text-center">
                  <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">لا توجد تقييمات</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>القضية</TableHead>
                        <TableHead>الفئة</TableHead>
                        <TableHead>المستوى</TableHead>
                        <TableHead>النقاط</TableHead>
                        <TableHead>الثقة</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>إجراء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assessments.map((a) => {
                        const badge = levelBadge[a.level] || levelBadge.LOW;
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">{a.case_title}</TableCell>
                            <TableCell>{a.category}</TableCell>
                            <TableCell><Badge className={badge.className}>{badge.label}</Badge></TableCell>
                            <TableCell>{a.score}/100</TableCell>
                            <TableCell>{Math.round((a.ai_confidence || 0) * 100)}%</TableCell>
                            <TableCell className="text-xs">{new Date(a.created_at).toLocaleDateString("ar-SA")}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteAssessment(a.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminRiskManagement;
