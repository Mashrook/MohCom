import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Copy, Check, Search, FileJson, Shield, CreditCard, MessageSquare, Video, Database, Download } from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";

interface ApiEndpoint {
  id: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  category: string;
  auth: boolean;
  requestBody?: {
    type: string;
    properties: Record<string, { type: string; description: string; required?: boolean }>;
  };
  responseExample?: object;
  headers?: Record<string, string>;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "check-subscription",
    name: "التحقق من الاشتراك",
    method: "GET",
    path: "/functions/v1/check-subscription",
    description: "التحقق من حالة اشتراك المستخدم الحالي",
    category: "payments",
    auth: true,
    responseExample: {
      hasSubscription: true,
      isActive: true,
      planType: "professional",
      endDate: "2025-02-15T00:00:00Z"
    }
  },
  {
    id: "create-moyasar-checkout",
    name: "إنشاء جلسة دفع Moyasar",
    method: "POST",
    path: "/functions/v1/create-moyasar-checkout",
    description: "إنشاء جلسة دفع جديدة عبر Moyasar",
    category: "payments",
    auth: true,
    requestBody: {
      type: "object",
      properties: {
        planId: { type: "string", description: "معرف الخطة (basic, professional, enterprise)", required: true },
        paymentMethod: { type: "string", description: "طريقة الدفع (creditcard, applepay, stcpay)", required: true },
        mobile: { type: "string", description: "رقم الجوال (مطلوب لـ stcpay)" }
      }
    },
    responseExample: {
      success: true,
      redirectUrl: "https://api.moyasar.com/...",
      paymentId: "pay_xxx"
    }
  },
  {
    id: "moyasar-webhook",
    name: "Webhook الدفع",
    method: "POST",
    path: "/functions/v1/moyasar-webhook",
    description: "استقبال إشعارات الدفع من Moyasar",
    category: "payments",
    auth: false,
    requestBody: {
      type: "object",
      properties: {
        id: { type: "string", description: "معرف الدفع", required: true },
        status: { type: "string", description: "حالة الدفع", required: true },
        amount: { type: "number", description: "المبلغ بالهللات", required: true }
      }
    }
  },
  {
    id: "legal-ai",
    name: "المساعد القانوني الذكي",
    method: "POST",
    path: "/functions/v1/legal-ai",
    description: "طرح استفسارات قانونية والحصول على إجابات ذكية",
    category: "ai",
    auth: true,
    requestBody: {
      type: "object",
      properties: {
        messages: { type: "array", description: "سجل المحادثة", required: true },
        systemPrompt: { type: "string", description: "تعليمات النظام (اختياري)" }
      }
    },
    responseExample: {
      content: "بناءً على نظام العمل السعودي..."
    }
  },
  {
    id: "lawyer-ai-assistant",
    name: "مساعد المحامي الذكي",
    method: "POST",
    path: "/functions/v1/lawyer-ai-assistant",
    description: "مساعد ذكي خاص بالمحامين لتحليل القضايا",
    category: "ai",
    auth: true,
    requestBody: {
      type: "object",
      properties: {
        messages: { type: "array", description: "سجل المحادثة", required: true },
        chatId: { type: "string", description: "معرف المحادثة" }
      }
    }
  },
  {
    id: "perplexity-search",
    name: "البحث في الأنظمة",
    method: "POST",
    path: "/functions/v1/perplexity-search",
    description: "البحث في الأنظمة واللوائح السعودية",
    category: "ai",
    auth: true,
    requestBody: {
      type: "object",
      properties: {
        query: { type: "string", description: "نص البحث", required: true }
      }
    },
    responseExample: {
      content: "وفقاً لنظام...",
      citations: ["https://laws.boe.gov.sa/..."]
    }
  },
  {
    id: "support-chat",
    name: "الدعم الفني",
    method: "POST",
    path: "/functions/v1/support-chat",
    description: "محادثة الدعم الفني الآلي",
    category: "support",
    auth: false,
    requestBody: {
      type: "object",
      properties: {
        messages: { type: "array", description: "سجل المحادثة", required: true }
      }
    }
  },
  {
    id: "parse-document",
    name: "تحليل المستندات",
    method: "POST",
    path: "/functions/v1/parse-document",
    description: "استخراج النص من ملفات PDF و Word",
    category: "documents",
    auth: true,
    requestBody: {
      type: "object",
      properties: {
        fileUrl: { type: "string", description: "رابط الملف", required: true },
        fileType: { type: "string", description: "نوع الملف (pdf, docx)", required: true }
      }
    },
    responseExample: {
      text: "محتوى المستند...",
      pages: 5
    }
  },
  {
    id: "send-contract-share",
    name: "مشاركة العقد",
    method: "POST",
    path: "/functions/v1/send-contract-share",
    description: "إرسال رابط مشاركة العقد عبر البريد",
    category: "documents",
    auth: true,
    requestBody: {
      type: "object",
      properties: {
        contractId: { type: "string", description: "معرف العقد", required: true },
        recipientEmail: { type: "string", description: "البريد الإلكتروني", required: true }
      }
    }
  },
  {
    id: "jitsi-token",
    name: "رمز مكالمات الفيديو",
    method: "POST",
    path: "/functions/v1/jitsi-token",
    description: "إنشاء رمز JWT لمكالمات الفيديو",
    category: "video",
    auth: true,
    requestBody: {
      type: "object",
      properties: {
        roomName: { type: "string", description: "اسم الغرفة", required: true },
        targetUserId: { type: "string", description: "معرف المستخدم الآخر" }
      }
    },
    responseExample: {
      token: "eyJhbGciOiJS...",
      roomName: "consultation_123",
      domain: "meet.jit.si"
    }
  },
  {
    id: "check-admin-ip",
    name: "التحقق من IP المسؤول",
    method: "POST",
    path: "/functions/v1/check-admin-ip",
    description: "التحقق من صلاحية IP للوصول للوحة التحكم",
    category: "security",
    auth: false,
    responseExample: {
      allowed: true,
      reason: "IP in whitelist"
    }
  },
  {
    id: "data-backup",
    name: "النسخ الاحتياطي",
    method: "POST",
    path: "/functions/v1/data-backup",
    description: "إنشاء نسخة احتياطية للبيانات (للمسؤولين)",
    category: "security",
    auth: true,
    responseExample: {
      success: true,
      backupId: "backup_xxx",
      downloadUrl: "https://..."
    }
  },
  {
    id: "get-moyasar-config",
    name: "إعدادات Moyasar",
    method: "GET",
    path: "/functions/v1/get-moyasar-config",
    description: "الحصول على المفتاح العام لـ Moyasar",
    category: "payments",
    auth: false,
    responseExample: {
      publishableKey: "pk_live_xxx"
    }
  }
];

const CATEGORIES = [
  { id: "all", name: "الكل", icon: FileJson },
  { id: "payments", name: "المدفوعات", icon: CreditCard },
  { id: "ai", name: "الذكاء الاصطناعي", icon: MessageSquare },
  { id: "documents", name: "المستندات", icon: FileJson },
  { id: "video", name: "الفيديو", icon: Video },
  { id: "security", name: "الأمان", icon: Shield },
  { id: "support", name: "الدعم", icon: MessageSquare }
];

const getMethodColor = (method: string) => {
  switch (method) {
    case "GET": return "bg-green-500/10 text-green-600 border-green-500/20";
    case "POST": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "PUT": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "DELETE": return "bg-red-500/10 text-red-600 border-red-500/20";
    default: return "bg-muted text-muted-foreground";
  }
};

const ApiDocumentation = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openEndpoints, setOpenEndpoints] = useState<string[]>([]);

  const baseUrl = "https://glmpsmwcbxebxioekgzu.supabase.co";

  const filteredEndpoints = API_ENDPOINTS.filter(endpoint => {
    const matchesSearch = endpoint.name.includes(searchQuery) || 
                         endpoint.path.includes(searchQuery) ||
                         endpoint.description.includes(searchQuery);
    const matchesCategory = selectedCategory === "all" || endpoint.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("تم النسخ!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleEndpoint = (id: string) => {
    setOpenEndpoints(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  return (
    <Layout>
      <SEO 
        title="توثيق API | محامي"
        description="توثيق واجهات برمجة التطبيقات لمنصة محامي"
      />
      
      <div className="container mx-auto px-4 py-8" dir="rtl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">توثيق API</h1>
          <p className="text-muted-foreground">
            واجهات برمجة التطبيقات المتاحة في منصة محامي
          </p>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Base URL:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-background p-2 rounded text-sm font-mono">
                {baseUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(baseUrl, "base-url")}
              >
                {copiedId === "base-url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* روابط تحميل ملفات OpenAPI */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" className="gap-2">
              <a href="/openapi.yaml" download="openapi.yaml">
                <Download className="h-4 w-4" />
                تحميل YAML
              </a>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <a href="/openapi.json" download="openapi.json">
                <Download className="h-4 w-4" />
                تحميل JSON
              </a>
            </Button>
            <span className="text-sm text-muted-foreground">
              يمكنك استخدام هذه الملفات مع أدوات مثل Insomnia أو Postman أو Apidog
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في الـ APIs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="flex-wrap h-auto">
              {CATEGORIES.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                  <cat.icon className="h-4 w-4" />
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-4">
          {filteredEndpoints.map((endpoint) => (
            <Card key={endpoint.id} className="overflow-hidden">
              <Collapsible
                open={openEndpoints.includes(endpoint.id)}
                onOpenChange={() => toggleEndpoint(endpoint.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={`${getMethodColor(endpoint.method)} font-mono`}>
                          {endpoint.method}
                        </Badge>
                        <div>
                          <CardTitle className="text-lg">{endpoint.name}</CardTitle>
                          <code className="text-sm text-muted-foreground font-mono">
                            {endpoint.path}
                          </code>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {endpoint.auth && (
                          <Badge variant="outline" className="gap-1">
                            <Shield className="h-3 w-3" />
                            مصادقة
                          </Badge>
                        )}
                        <ChevronDown className={`h-5 w-5 transition-transform ${openEndpoints.includes(endpoint.id) ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    <CardDescription>{endpoint.description}</CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="border-t pt-4 space-y-4">
                    {/* Full URL */}
                    <div>
                      <p className="text-sm font-medium mb-2">الرابط الكامل:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-muted p-2 rounded text-sm font-mono overflow-x-auto">
                          {baseUrl}{endpoint.path}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(`${baseUrl}${endpoint.path}`, endpoint.id)}
                        >
                          {copiedId === endpoint.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Headers */}
                    {endpoint.auth && (
                      <div>
                        <p className="text-sm font-medium mb-2">Headers المطلوبة:</p>
                        <pre className="bg-muted p-3 rounded text-sm font-mono overflow-x-auto">
{`{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json",
  "apikey": "<supabase_anon_key>"
}`}
                        </pre>
                      </div>
                    )}

                    {/* Request Body */}
                    {endpoint.requestBody && (
                      <div>
                        <p className="text-sm font-medium mb-2">Request Body:</p>
                        <div className="bg-muted p-3 rounded space-y-2">
                          {Object.entries(endpoint.requestBody.properties).map(([key, prop]) => (
                            <div key={key} className="flex items-start gap-2 text-sm">
                              <code className="font-mono text-primary">{key}</code>
                              <span className="text-muted-foreground">({prop.type})</span>
                              {prop.required && <Badge variant="destructive" className="text-xs">مطلوب</Badge>}
                              <span className="text-muted-foreground">- {prop.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Response Example */}
                    {endpoint.responseExample && (
                      <div>
                        <p className="text-sm font-medium mb-2">مثال الاستجابة:</p>
                        <pre className="bg-muted p-3 rounded text-sm font-mono overflow-x-auto">
                          {JSON.stringify(endpoint.responseExample, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* cURL Example */}
                    <div>
                      <p className="text-sm font-medium mb-2">مثال cURL:</p>
                      <pre className="bg-muted p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`curl -X ${endpoint.method} '${baseUrl}${endpoint.path}' \\
  -H 'Content-Type: application/json' \\${endpoint.auth ? `
  -H 'Authorization: Bearer YOUR_TOKEN' \\` : ''}
  -H 'apikey: YOUR_ANON_KEY'${endpoint.requestBody ? ` \\
  -d '${JSON.stringify(Object.fromEntries(Object.entries(endpoint.requestBody.properties).map(([k, v]) => [k, v.type === 'string' ? 'value' : v.type === 'array' ? [] : 0])), null, 2)}'` : ''}`}
                      </pre>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}

          {filteredEndpoints.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">لا توجد نتائج للبحث</p>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ApiDocumentation;
