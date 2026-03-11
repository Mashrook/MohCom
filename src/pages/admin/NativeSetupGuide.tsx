import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Smartphone, Globe, Shield, Terminal, FileCode, AlertTriangle } from "lucide-react";

const NativeSetupGuide = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gradient-golden">دليل إعداد التطبيق الأصلي</h1>
          <p className="text-muted-foreground mt-2">خطوات إعداد الروابط العميقة والتحقق من النطاق لنظامي iOS و Android</p>
        </div>

        {/* Onboarding Checklist */}
        <Card className="glass-card border-golden/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              قائمة مهام الإعداد الأولي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                "سحب آخر نسخة من الكود (git pull)",
                "تشغيل npm install",
                "تشغيل npx cap sync",
                "التحقق من ملف apple-app-site-association على النطاق",
                "التحقق من ملف assetlinks.json على النطاق",
                "اختبار الروابط العميقة باستخدام صفحة الاختبار",
                "التحقق من Universal Links على جهاز حقيقي",
                "فحص App Links على Android بعد التثبيت",
              ].map((task, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded border border-border">
                  <div className="w-6 h-6 rounded-full border-2 border-muted-foreground flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </div>
                  <span className="text-sm">{task}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* iOS Setup */}
        <Card className="glass-card border-golden/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              إعداد iOS (Universal Links)
              <Badge>Apple</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><FileCode className="w-4 h-4" /> 1. Associated Domains</h3>
              <p className="text-sm text-muted-foreground">أضف القدرة التالية في Xcode:</p>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto" dir="ltr">
{`# Xcode → Target → Signing & Capabilities → Associated Domains
applinks:mohamie.com
webcredentials:mohamie.com`}
              </pre>

              <h3 className="font-semibold flex items-center gap-2 mt-4"><Globe className="w-4 h-4" /> 2. Apple App Site Association</h3>
              <p className="text-sm text-muted-foreground">
                ملف <code dir="ltr">.well-known/apple-app-site-association</code> موجود بالفعل في المشروع.
                يجب استبدال <code dir="ltr">TEAMID</code> بـ Team ID الخاص بك من Apple Developer Console.
              </p>

              <h3 className="font-semibold flex items-center gap-2 mt-4"><Terminal className="w-4 h-4" /> 3. التحقق</h3>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto" dir="ltr">
{`# Verify AASA file is accessible
curl -v https://mohamie.com/.well-known/apple-app-site-association

# Test on device
xcrun simctl openurl booted "https://mohamie.com/consultation"`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Android Setup */}
        <Card className="glass-card border-golden/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              إعداد Android (App Links)
              <Badge variant="secondary">Android</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><FileCode className="w-4 h-4" /> 1. AndroidManifest.xml</h3>
              <p className="text-sm text-muted-foreground">أضف intent-filter داخل activity الرئيسي:</p>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto" dir="ltr">
{`<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https"
        android:host="mohamie.com"
        android:pathPrefix="/" />
</intent-filter>

<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="mohamie" />
</intent-filter>`}
              </pre>

              <h3 className="font-semibold flex items-center gap-2 mt-4"><Shield className="w-4 h-4" /> 2. Asset Links</h3>
              <p className="text-sm text-muted-foreground">
                ملف <code dir="ltr">.well-known/assetlinks.json</code> موجود. يجب استبدال <code dir="ltr">SHA256 fingerprint</code> ببصمة شهادة التوقيع.
              </p>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto" dir="ltr">
{`# Get SHA256 fingerprint
keytool -list -v -keystore your-keystore.jks -alias your-alias`}
              </pre>

              <h3 className="font-semibold flex items-center gap-2 mt-4"><Terminal className="w-4 h-4" /> 3. التحقق</h3>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto" dir="ltr">
{`# Verify assetlinks.json
curl -v https://mohamie.com/.well-known/assetlinks.json

# Test on device
adb shell am start -a android.intent.action.VIEW \\
  -d "https://mohamie.com/consultation" com.mohamie.ios`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="glass-card border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              ملاحظات مهمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold">•</span>
                استبدل <code dir="ltr">TEAMID</code> في ملف AASA بـ Team ID الفعلي من Apple Developer Console
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold">•</span>
                استبدل <code dir="ltr">REPLACE_WITH_YOUR_SHA256_FINGERPRINT</code> في assetlinks.json ببصمة SHA256 الفعلية
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold">•</span>
                يجب تشغيل <code dir="ltr">npx cap sync</code> بعد كل سحب كود جديد
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold">•</span>
                Universal Links لا تعمل في المحاكي - يجب الاختبار على جهاز حقيقي
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold">•</span>
                ملف AASA يجب أن يكون بترميز JSON بدون Content-Type خاطئ
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default NativeSetupGuide;
