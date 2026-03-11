# دليل رفع تطبيق محامي كوم على Apple App Store

## معلومات المطور
- **الاسم**: IBRAHEM ALHAMMAD
- **البريد الإلكتروني**: ishoud959@icloud.com
- **Team ID**: P2SV4K77QH
- **Issuer ID**: 7f70ffe7-d863-41e9-9372-6f11c63ffafc
- **Developer ID**: 7f70ffe7-d863-41e9-9372-6f11c63ffafc

## معلومات التطبيق
- **App ID**: com.mohamie.app
- **اسم التطبيق**: محامي كوم
- **الموقع**: https://mohamie.com
- **Apple Pay Domain**: https://mohamie.com/.well-known/apple-developer-merchantid-domain-association

---

## الخطوة 1: تصدير المشروع من Lovable

1. اذهب إلى **Settings** → **Export to GitHub**
2. انقر على **Export** لإنشاء مستودع GitHub
3. استنسخ المستودع على جهازك:
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

---

## الخطوة 2: إعداد بيئة التطوير

### المتطلبات:
- **macOS** (Monterey 12.0 أو أحدث)
- **Xcode 15+** من App Store
- **Node.js 18+** و npm
- **CocoaPods**: `sudo gem install cocoapods`

### تثبيت المشروع:
```bash
# تثبيت التبعيات
npm install

# بناء المشروع للإنتاج
npm run build

# إضافة منصة iOS
npx cap add ios

# مزامنة المشروع
npx cap sync ios
```

---

## الخطوة 3: تكوين Xcode

### فتح المشروع:
```bash
npx cap open ios
```

### إعدادات الـ Signing:
1. اختر **App** في المتصفح الجانبي
2. اذهب إلى **Signing & Capabilities**
3. اختر **Team**: IBRAHEM ALHAMMAD (P2SV4K77QH)
4. تأكد من **Bundle Identifier**: `com.mohamie.app`
5. فعّل **Automatically manage signing**

### إضافة Capabilities:
اضغط **+ Capability** وأضف:
- ✅ Push Notifications
- ✅ Associated Domains
- ✅ Apple Pay (اختياري)
- ✅ Background Modes → Remote notifications

### تكوين Associated Domains:
أضف في Domains:
```
applinks:mohamie.com
webcredentials:mohamie.com
```

---

## الخطوة 4: تكوين Info.plist

أضف هذه المفاتيح في `ios/App/App/Info.plist`:

```xml
<!-- Camera Access -->
<key>NSCameraUsageDescription</key>
<string>يحتاج التطبيق للوصول إلى الكاميرا للمكالمات المرئية</string>

<!-- Microphone Access -->
<key>NSMicrophoneUsageDescription</key>
<string>يحتاج التطبيق للوصول إلى الميكروفون للمكالمات الصوتية</string>

<!-- Photo Library Access -->
<key>NSPhotoLibraryUsageDescription</key>
<string>يحتاج التطبيق للوصول إلى الصور لرفع المستندات</string>

<!-- Face ID -->
<key>NSFaceIDUsageDescription</key>
<string>استخدم Face ID لتسجيل الدخول الآمن</string>
```

### ⚠️ مهم جداً - إزالة NSUserTrackingUsageDescription

**إذا رفضت Apple التطبيق بسبب NSUserTrackingUsageDescription، يجب إزالته:**

1. افتح `ios/App/App/Info.plist` في Xcode
2. ابحث عن `NSUserTrackingUsageDescription` واحذف المفتاح والقيمة بالكامل
3. **لا يحتاج التطبيق لتتبع المستخدمين** - نحن لا نستخدم IDFA أو أي تتبع إعلاني
4. أعد بناء التطبيق وارفعه مرة أخرى

**ملاحظة:** تطبيقنا لا يجمع بيانات لتتبع المستخدمين عبر التطبيقات الأخرى، لذا لا نحتاج لهذا الإذن.

---

## الخطوة 5: إنشاء أيقونات التطبيق

### الأحجام المطلوبة:
استخدم صورة 1024x1024 بكسل وأنشئ:
- 20x20, 29x29, 40x40, 58x58, 60x60
- 76x76, 80x80, 87x87, 120x120
- 152x152, 167x167, 180x180, 1024x1024

### الأداة الموصى بها:
- [App Icon Generator](https://appicon.co/)
- أو استخدم أمر: `npx @nicepkg/appicon generate`

ضع الأيقونات في:
`ios/App/App/Assets.xcassets/AppIcon.appiconset/`

---

## الخطوة 6: إعداد App Store Connect

### 1. إنشاء App ID:
1. اذهب إلى [Apple Developer Portal](https://developer.apple.com/account)
2. **Certificates, IDs & Profiles** → **Identifiers**
3. اضغط **+** → **App IDs** → **App**
4. **Bundle ID**: `com.mohamie.app`
5. فعّل الـ Capabilities المطلوبة

### 2. إنشاء التطبيق في App Store Connect:
1. اذهب إلى [App Store Connect](https://appstoreconnect.apple.com)
2. **My Apps** → **+** → **New App**
3. املأ البيانات:
   - **Platform**: iOS
   - **Name**: محامي كوم
   - **Primary Language**: Arabic
   - **Bundle ID**: com.mohamie.app
   - **SKU**: mohamie-app-001

---

## الخطوة 7: بناء التطبيق للإنتاج

### تعديل الإعدادات للإنتاج:
في `capacitor.config.ts`، تأكد من أن `server.url` معلّق:
```typescript
server: {
  // url: 'https://...', // معلّق للإنتاج
  cleartext: false,
  ...
}
```

### بناء الأرشيف:
```bash
# بناء المشروع
npm run build

# مزامنة
npx cap sync ios

# فتح Xcode
npx cap open ios
```

في Xcode:
1. اختر **Product** → **Archive**
2. انتظر انتهاء البناء
3. سيفتح **Organizer** تلقائياً

---

## الخطوة 8: رفع التطبيق

### من Organizer:
1. اختر الأرشيف الجديد
2. اضغط **Distribute App**
3. اختر **App Store Connect**
4. اختر **Upload**
5. اتبع الخطوات وانتظر الرفع

### أو باستخدام Transporter:
1. حمّل [Transporter](https://apps.apple.com/app/transporter/id1450874784) من Mac App Store
2. سجّل الدخول بحسابك
3. اسحب ملف `.ipa` إلى Transporter
4. اضغط **Deliver**

---

## الخطوة 9: إعداد صفحة المتجر

### المعلومات المطلوبة:
- **اسم التطبيق**: محامي كوم
- **العنوان الفرعي**: مستشارك القانوني بالذكاء الاصطناعي
- **الوصف** (باللغة العربية):
```
محامي كوم - منصتك القانونية الذكية

🤖 استشارات قانونية بالذكاء الاصطناعي
📄 تحليل العقود والمستندات
⚖️ توقعات الأحكام القضائية
👨‍⚖️ تواصل مباشر مع محامين معتمدين
🔍 بحث قانوني شامل

الميزات:
• استشارات قانونية فورية على مدار الساعة
• تحليل ذكي للعقود والمستندات القانونية
• توقعات مبنية على السوابق القضائية
• مكالمات صوتية ومرئية مع المحامين
• تخزين آمن ومشفر للمستندات
• دعم كامل للغة العربية

مثالي لـ:
• رجال الأعمال وأصحاب الشركات
• الأفراد الباحثين عن استشارات قانونية
• المحامين والمستشارين القانونيين
```

- **الكلمات المفتاحية**: محامي، قانون، استشارات، عقود، قضايا، ذكاء اصطناعي

### لقطات الشاشة المطلوبة:
- iPhone 6.7" (1290 x 2796 px) - 3 صور على الأقل
- iPhone 6.5" (1242 x 2688 px) - 3 صور على الأقل
- iPad Pro 12.9" (2048 x 2732 px) - 3 صور على الأقل

---

## الخطوة 10: المراجعة والنشر

### قبل الإرسال:
- ✅ اختبر التطبيق على أجهزة حقيقية
- ✅ تأكد من عمل كل الميزات
- ✅ راجع سياسة الخصوصية: https://mohamie.com/privacy
- ✅ راجع شروط الاستخدام: https://mohamie.com/terms

### إرسال للمراجعة:
1. في App Store Connect، اذهب للتطبيق
2. أكمل جميع المعلومات المطلوبة
3. اضغط **Submit for Review**
4. انتظر 24-48 ساعة للمراجعة

---

## ملاحظات مهمة

### Apple Pay:
- ملف التحقق موجود: `public/.well-known/apple-developer-merchantid-domain-association`
- تأكد من إعداد Merchant ID في Apple Developer Portal

### Push Notifications:
- أنشئ APNs Key في Apple Developer Portal
- أضف المفتاح في Supabase أو Firebase

### App Review Guidelines:
- تأكد من الامتثال لـ [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- خاصة القسم 5.1 (الخصوصية) والقسم 3.1.1 (المدفوعات داخل التطبيق)

---

## الدعم والمساعدة

للمساعدة في عملية النشر:
- 📧 info@mohamie.com
- 📖 [Capacitor iOS Docs](https://capacitorjs.com/docs/ios)
- 📖 [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
