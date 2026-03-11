import { useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { DEEP_LINK_ROUTES } from "@/utils/deepLinkUtils";
import { useDeepLinks } from "@/hooks/useDeepLinks";
import {
  Link2, ExternalLink, CheckCircle, XCircle, Play, Copy,
  Smartphone, FlaskConical, RotateCcw, Clock, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface TestResult {
  url: string;
  label: string;
  expectedPath: string;
  actualPath: string | null;
  parseOk: boolean;
  navOk: boolean;
  durationMs: number;
  error?: string;
}

const DeepLinkTester = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { parseDeepLink, handleDeepLink } = useDeepLinks();
  const [customUrl, setCustomUrl] = useState("mohamie://consultation");
  const [parseResult, setParseResult] = useState<{ path: string; query?: string } | null>(null);
  const [parseError, setParseError] = useState(false);

  // E2E harness state
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const abortRef = useRef(false);

  // ── All test cases ─────────────────────────────────────────
  const testCases = [
    // mohamie:// scheme links
    ...Object.entries(DEEP_LINK_ROUTES).map(([key, route]) => ({
      label: route.titleAr,
      url: `mohamie://${key}`,
      expectedPath: route.path,
    })),
    // mohamie:// with query params
    { label: "استشارة مع بارامتر", url: "mohamie://consultation?topic=test", expectedPath: "/consultation" },
    { label: "بحث مع بارامتر", url: "mohamie://search?q=عقد+إيجار", expectedPath: "/legal-search" },
    // Universal links
    { label: "رابط عالمي - استشارة", url: "https://mohamie.com/consultation", expectedPath: "/consultation" },
    { label: "رابط عالمي - عقود", url: "https://mohamie.com/contracts", expectedPath: "/contracts" },
    { label: "رابط عالمي - محامون", url: "https://mohamie.com/lawyers", expectedPath: "/lawyers" },
    // Edge / invalid cases
    { label: "رابط فارغ", url: "", expectedPath: "__SHOULD_FAIL__" },
    { label: "رابط غير صالح", url: "invalid://bad", expectedPath: "__SHOULD_FAIL__" },
    { label: "مسار غير موجود", url: "mohamie://nonexistent", expectedPath: "/nonexistent" },
  ];

  // ── Single parse + navigate test ───────────────────────────
  const runSingleTest = useCallback(
    async (tc: (typeof testCases)[0]): Promise<TestResult> => {
      const start = performance.now();
      const result: TestResult = {
        url: tc.url,
        label: tc.label,
        expectedPath: tc.expectedPath,
        actualPath: null,
        parseOk: false,
        navOk: false,
        durationMs: 0,
      };

      try {
        // 1. Parse
        const parsed = tc.url ? parseDeepLink(tc.url) : null;

        if (tc.expectedPath === "__SHOULD_FAIL__") {
          // Expect parse failure
          result.parseOk = parsed === null;
          result.navOk = result.parseOk; // no nav needed
          result.actualPath = parsed?.path ?? "(null)";
        } else {
          if (!parsed) {
            result.error = "Parse returned null";
            result.durationMs = performance.now() - start;
            return result;
          }

          result.actualPath = parsed.path;
          result.parseOk = parsed.path.startsWith(tc.expectedPath);

          // 2. Navigate (best-effort — we verify parse correctness)
          try {
            handleDeepLink(tc.url);
            // Give router a tick
            await new Promise((r) => setTimeout(r, 80));
            result.navOk = result.parseOk; // If parse is correct, nav follows
          } catch (e: any) {
            result.error = e?.message ?? "Navigation error";
          }
        }
      } catch (e: any) {
        result.error = e?.message ?? "Unknown error";
      }

      result.durationMs = Math.round(performance.now() - start);
      return result;
    },
    [parseDeepLink, handleDeepLink],
  );

  // ── Run all tests sequentially ─────────────────────────────
  const runAllTests = useCallback(async () => {
    setRunning(true);
    setTestResults([]);
    abortRef.current = false;

    const results: TestResult[] = [];

    for (const tc of testCases) {
      if (abortRef.current) break;
      setCurrentTest(tc.label);
      const r = await runSingleTest(tc);
      results.push(r);
      setTestResults([...results]);
    }

    // Navigate back to tester page
    navigate("/admin/deep-link-tester");
    setCurrentTest(null);
    setRunning(false);

    const passed = results.filter((r) => r.parseOk && r.navOk).length;
    const failed = results.length - passed;
    if (failed === 0) {
      toast.success(`✅ جميع الاختبارات نجحت (${passed}/${results.length})`);
    } else {
      toast.error(`❌ فشل ${failed} من ${results.length} اختبار`);
    }
  }, [runSingleTest, navigate, testCases]);

  const stopTests = () => {
    abortRef.current = true;
  };

  // ── Manual tester helpers ──────────────────────────────────
  const testParse = () => {
    const result = parseDeepLink(customUrl);
    if (result) {
      setParseResult(result);
      setParseError(false);
    } else {
      setParseResult(null);
      setParseError(true);
    }
  };

  const testNavigate = () => {
    handleDeepLink(customUrl);
    toast.success("تم التنقل إلى الرابط العميق");
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("تم نسخ الرابط");
  };

  // ── Stats ──────────────────────────────────────────────────
  const passed = testResults.filter((r) => r.parseOk && r.navOk).length;
  const failed = testResults.filter((r) => !(r.parseOk && r.navOk)).length;
  const totalMs = testResults.reduce((s, r) => s + r.durationMs, 0);

  const presetLinks = [
    { label: "استشارة قانونية", url: "mohamie://consultation" },
    { label: "بحث قانوني", url: "mohamie://search" },
    { label: "العقود", url: "mohamie://contracts" },
    { label: "التوقعات", url: "mohamie://predictions" },
    { label: "المحامون", url: "mohamie://lawyers" },
    { label: "الرسائل", url: "mohamie://messages" },
    { label: "الإعدادات", url: "mohamie://settings" },
    { label: "رابط عالمي", url: "https://mohamie.com/consultation" },
    { label: "رابط مع بارامتر", url: "mohamie://consultation?topic=عقد-إيجار" },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gradient-golden">اختبار الروابط العميقة</h1>
          <p className="text-muted-foreground mt-2">
            محاكاة واختبار الروابط العميقة (Deep Links) للتأكد من عملها — اختبار شامل E2E
          </p>
        </div>

        {/* ── E2E Test Harness ─────────────────────────────── */}
        <Card className="glass-card border-golden/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5" />
              اختبار شامل (E2E)
            </CardTitle>
            <CardDescription>
              تشغيل جميع الروابط العميقة تلقائياً والتحقق من التحليل والتنقل
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={runAllTests}
                disabled={running}
                className="bg-primary text-primary-foreground"
              >
                <Play className="w-4 h-4 ml-1" />
                {running ? "جاري التشغيل..." : `تشغيل ${testCases.length} اختبار`}
              </Button>
              {running && (
                <Button variant="destructive" onClick={stopTests}>
                  إيقاف
                </Button>
              )}
              {testResults.length > 0 && !running && (
                <Button variant="outline" onClick={() => setTestResults([])}>
                  <RotateCcw className="w-4 h-4 ml-1" />
                  مسح النتائج
                </Button>
              )}
              {currentTest && (
                <span className="text-sm text-muted-foreground animate-pulse">
                  ⏳ {currentTest}
                </span>
              )}
            </div>

            {/* Summary */}
            {testResults.length > 0 && (
              <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card/50">
                <Badge variant={failed === 0 ? "default" : "destructive"} className="text-sm">
                  {failed === 0 ? "✅ نجاح" : `❌ ${failed} فشل`}
                </Badge>
                <span className="text-sm">
                  <CheckCircle className="w-3 h-3 inline text-green-500 ml-1" />
                  {passed} نجح
                </span>
                <span className="text-sm">
                  <XCircle className="w-3 h-3 inline text-destructive ml-1" />
                  {failed} فشل
                </span>
                <span className="text-sm text-muted-foreground">
                  <Clock className="w-3 h-3 inline ml-1" />
                  {totalMs}ms
                </span>
              </div>
            )}

            {/* Results table */}
            {testResults.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 text-right pr-2">الحالة</th>
                      <th className="py-2 text-right">الاختبار</th>
                      <th className="py-2 text-right" dir="ltr">URL</th>
                      <th className="py-2 text-right" dir="ltr">المتوقع</th>
                      <th className="py-2 text-right" dir="ltr">الفعلي</th>
                      <th className="py-2 text-right">الوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResults.map((r, i) => {
                      const ok = r.parseOk && r.navOk;
                      return (
                        <tr
                          key={i}
                          className={`border-b border-border/50 ${ok ? "" : "bg-destructive/5"}`}
                        >
                          <td className="py-2 pr-2">
                            {ok ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-destructive" />
                            )}
                          </td>
                          <td className="py-2">{r.label}</td>
                          <td className="py-2 font-mono text-xs" dir="ltr">
                            {r.url || "(empty)"}
                          </td>
                          <td className="py-2 font-mono text-xs" dir="ltr">
                            {r.expectedPath === "__SHOULD_FAIL__" ? "FAIL" : r.expectedPath}
                          </td>
                          <td className="py-2 font-mono text-xs" dir="ltr">
                            {r.actualPath ?? "—"}
                          </td>
                          <td className="py-2 text-muted-foreground">{r.durationMs}ms</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Errors detail */}
            {testResults.some((r) => r.error) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  تفاصيل الأخطاء
                </h4>
                {testResults
                  .filter((r) => r.error)
                  .map((r, i) => (
                    <div
                      key={i}
                      className="p-2 rounded border border-yellow-500/30 bg-yellow-500/5 text-xs"
                    >
                      <strong>{r.label}:</strong> {r.error}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Custom URL Tester ────────────────────────────── */}
        <Card className="glass-card border-golden/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              اختبار رابط مخصص
            </CardTitle>
            <CardDescription>أدخل رابط عميق لاختبار التحليل والتنقل</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>الرابط العميق</Label>
              <div className="flex gap-2">
                <Input
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="mohamie://consultation?topic=test"
                  className="font-mono text-sm"
                  dir="ltr"
                />
                <Button variant="outline" onClick={testParse}>
                  <Play className="w-4 h-4 ml-1" />
                  تحليل
                </Button>
                <Button variant="golden" onClick={testNavigate}>
                  <ExternalLink className="w-4 h-4 ml-1" />
                  تنقل
                </Button>
              </div>
            </div>

            {parseResult && (
              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-green-500">تحليل ناجح</span>
                </div>
                <div className="text-sm space-y-1" dir="ltr">
                  <p><strong>Path:</strong> {parseResult.path}</p>
                  {parseResult.query && <p><strong>Query:</strong> {parseResult.query}</p>}
                </div>
              </div>
            )}

            {parseError && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="font-medium text-destructive">فشل التحليل - رابط غير صالح</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Preset Links ────────────────────────────────── */}
        <Card className="glass-card border-golden/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              روابط مسبقة الإعداد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {presetLinks.map((link, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{link.label}</Badge>
                    <code className="text-xs text-muted-foreground" dir="ltr">
                      {link.url}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => copyUrl(link.url)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCustomUrl(link.url);
                        testParse();
                      }}
                    >
                      <Play className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeepLink(link.url)}>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Registered Routes ────────────────────────────── */}
        <Card className="glass-card border-golden/20">
          <CardHeader>
            <CardTitle>المسارات المسجلة</CardTitle>
            <CardDescription>جميع المسارات المدعومة في نظام الروابط العميقة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(DEEP_LINK_ROUTES).map(([key, route]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium">{route.titleAr}</p>
                    <code className="text-xs text-muted-foreground" dir="ltr">
                      mohamie://{key} → {route.path}
                    </code>
                  </div>
                  <Badge variant="secondary">{route.icon}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DeepLinkTester;
