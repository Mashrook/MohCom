import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Database, ShieldAlert, AlertTriangle, Lock, MapPin, Video, Key, Bot, Search, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const AdminIntegrations = () => {
  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الربط والتكامل (API Keys)</h1>
          <p className="text-muted-foreground">إعدادات الاتصال بالخدمات الخارجية.</p>
        </div>
      </div>

      <Card className="border-amber-500/50 bg-amber-500/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <Lock className="h-5 w-5" />
            وضع الأمان العالي (Production Mode)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            لأسباب أمنية، لا يمكن عرض أو تعديل مفاتيح الربط الحساسة (Secret Keys) من المتصفح.
            يرجى ضبط متغيرات البيئة (Environment Variables) في لوحة تحكم الخادم مباشرة.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="payment" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="payment" className="flex items-center gap-1">
            <CreditCard className="h-4 w-4" />
            بوابة الدفع
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1">
            <Bot className="h-4 w-4" />
            الذكاء الاصطناعي
          </TabsTrigger>
          <TabsTrigger value="maps" className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            الخرائط
          </TabsTrigger>
          <TabsTrigger value="rtc" className="flex items-center gap-1">
            <Video className="h-4 w-4" />
            الاتصال
          </TabsTrigger>
          <TabsTrigger value="auth" className="flex items-center gap-1">
            <Key className="h-4 w-4" />
            المصادقة
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1">
            <ShieldAlert className="h-4 w-4" />
            الحماية
          </TabsTrigger>
        </TabsList>

        {/* Payment Tab */}
        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Moyasar Payment
                <Badge variant="default" className="bg-green-500">متصل</Badge>
              </CardTitle>
              <CardDescription>حالة الربط مع بوابة الدفع</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Publishable Key</Label>
                <div className="flex items-center gap-2">
                  <Input type="password" value="pk_live_••••••••" disabled className="font-mono" />
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secret Key</Label>
                <div className="flex items-center gap-2">
                  <Input type="password" value="sk_live_••••••••" disabled className="font-mono" />
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                الاتصال مؤمن
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Tap Payments
                <Badge variant="default" className="bg-green-500">متصل</Badge>
              </CardTitle>
              <CardDescription>بوابة دفع بديلة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Public Key</Label>
                <div className="flex items-center gap-2">
                  <Input type="password" value="pk_live_••••••••" disabled className="font-mono" />
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secret Key</Label>
                <div className="flex items-center gap-2">
                  <Input type="password" value="sk_live_••••••••" disabled className="font-mono" />
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Moyasar is the only payment processor */}
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Gemini (الاستشارات والتنبؤ)
                </div>
                <Badge variant="default" className="bg-green-500">متصل</Badge>
              </CardTitle>
              <CardDescription>المفتاح الحسّاس يجب أن يُخزّن في الخادم فقط.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex items-center gap-2">
                  <Input type="password" value="AIzaSy••••••••" disabled className="font-mono" />
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project ID</Label>
                  <Input value="semiotic-axis-481211-n9" disabled className="font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label>Project Number</Label>
                  <Input value="415038890856" disabled className="font-mono text-sm" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                للاستخدام الآمن، نفّذ الطلبات عبر Supabase Edge Functions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Perplexity (بحث قانوني/الشكاوى)
                </div>
                <Badge variant="default" className="bg-green-500">متصل</Badge>
              </CardTitle>
              <CardDescription>المفتاح الحسّاس يُخزّن في الخادم.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex items-center gap-2">
                  <Input type="password" value="pplx-••••••••" disabled className="font-mono" />
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                أرسل الاستعلامات عبر وظيفة خوادم مؤمنة لتجنّب كشف المفتاح.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Provider
                </div>
                <Badge variant="default" className="bg-green-500">تلقائي</Badge>
              </CardTitle>
              <CardDescription>مهيأ من خلال متغيرات البيئة في Railway أو Supabase Secrets.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                استخدم AI_PROVIDER و AI_MODEL و AI_API_KEY لاختيار المزود والنموذج.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maps Tab */}
        <TabsContent value="maps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Mapbox
                </div>
                <Badge variant="default" className="bg-green-500">متصل</Badge>
              </CardTitle>
              <CardDescription>رمز الوصول العمومي يمكن استخدامه في الواجهة.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>MAPBOX_PUBLIC_TOKEN</Label>
                <Input value="pk.eyJ1IjoibW9oYW1pZSIs••••••••" disabled className="font-mono text-sm" />
              </div>
              <p className="text-xs text-muted-foreground">
                إن كان مضبوطًا يمكنك بناء خرائط تفاعلية في التطبيق.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RTC Tab */}
        <TabsContent value="rtc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  JaaS (الاتصال الصوتي والمرئي)
                </div>
                <Badge variant="default" className="bg-green-500">متصل</Badge>
              </CardTitle>
              <CardDescription>تُستخدم مع JitsiMeeting داخل التطبيق.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>JITSI_APP_ID</Label>
                <Input value="vpaas-magic-cookie-c3525b••••••••" disabled className="font-mono text-sm" />
              </div>
              <div className="space-y-2">
                <Label>JITSI_PRIVATE_KEY</Label>
                <div className="flex items-center gap-2">
                  <Input type="password" value="••••••••" disabled className="font-mono" />
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                المكالمات تعمل من صفحة الاستشارات عبر فيديو Jitsi.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auth Tab */}
        <TabsContent value="auth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Google OAuth
                </div>
                <Badge variant="default" className="bg-green-500">متصل</Badge>
              </CardTitle>
              <CardDescription>المعرف يُستخدم مع Supabase Auth.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>GOOGLE_OAUTH_CLIENT_ID</Label>
                <Input value="942395257900-tajur2fctgud9v04edhaj195urruon5o.apps.googleusercontent.com" disabled className="font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label>Callback URL</Label>
                <Input value="https://glmpsmwcbxebxioekgzu.supabase.co/auth/v1/callback" disabled className="font-mono text-xs" />
              </div>
              <p className="text-xs text-muted-foreground">
                اضبط مزوّد Google في لوحة Supabase مع Client ID و Redirect URI أعلاه.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  VirusTotal
                </div>
                <Badge variant="secondary">اختياري</Badge>
              </CardTitle>
              <CardDescription>فحص الملفات المرفوعة للتأكد من سلامتها.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex items-center gap-2">
                  <Input type="password" placeholder="غير مُهيأ" disabled className="font-mono" />
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Resend (البريد الإلكتروني)
                </div>
                <Badge variant="default" className="bg-green-500">متصل</Badge>
              </CardTitle>
              <CardDescription>خدمة إرسال رسائل البريد الإلكتروني.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex items-center gap-2">
                  <Input type="password" value="re_••••••••" disabled className="font-mono" />
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminIntegrations;
