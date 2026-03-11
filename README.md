# MohCom

منصة محامي كوم للاستشارات القانونية بالذكاء الاصطناعي، مبنية كواجهة React + Supabase Edge Functions وقابلة للنشر المستقل على Railway بدون أي اعتماد على Lovable.

## التشغيل المحلي

```bash
npm install
npm run dev
```

## البناء والإنتاج

```bash
npm run build
npm run start
```

الخادم الإنتاجي يستخدم `server.cjs` لتقديم ملفات `dist` مع دعم SPA fallback.

## النشر على Railway

المشروع مهيأ عبر `railway.toml` للنشر على الرابط:

- `https://mohcom-production.up.railway.app`

المتغيرات الأساسية المطلوبة في Railway:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL`
- `PUBLIC_SITE_URL`
- `AI_PROVIDER`
- `AI_MODEL`
- `AI_API_KEY`
- `AI_API_BASE_URL` عند استخدام مزود OpenAI-compatible مخصص
- `MOYASAR_PUBLISHABLE_KEY`
- `MOYASAR_SECRET_KEY`
- `VITE_MOYASAR_URL`

## Supabase

المشروع يعتمد على Supabase مباشرة من خلال متغيرات البيئة فقط. لا يتم حقن أي مفاتيح سرية داخل الواجهة.

## الذكاء الاصطناعي

تم استبدال الاعتماد على Lovable بطبقة موحدة في Edge Functions تدعم مزودي API عبر متغيرات البيئة:

- `AI_PROVIDER=openai`
- `AI_PROVIDER=openrouter`
- `AI_PROVIDER=gemini`
- `AI_PROVIDER=custom`

يمكن اختيار النموذج عبر `AI_MODEL` وربط أي مزود متوافق عبر `AI_API_KEY` و `AI_API_BASE_URL`.

## الدفع

الدفع في الواجهة يعتمد على Moyasar MPF ويدعم:

- Apple Pay
- مدى
- Visa
- Mastercard
- STC Pay عند تفعيلها من Moyasar

الإعدادات العامة تُجلب من Edge Function `get-moyasar-config` ولا يتم كشف المفتاح السري للواجهة.
