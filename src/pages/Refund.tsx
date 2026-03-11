import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { AlertCircle, CheckCircle, Clock, CreditCard, Mail, Phone } from "lucide-react";

const Refund = () => {
  return (
    <Layout>
      <SEO 
        title="سياسة الاسترجاع"
        description="سياسة الاسترجاع واسترداد الأموال لمنصة محامي كوم. تعرف على شروط وإجراءات طلب استرجاع المبالغ المدفوعة."
        url="/refund"
        keywords="سياسة الاسترجاع, استرداد الأموال, إلغاء الاشتراك, محامي كوم"
      />
      <div className="min-h-screen bg-background py-16 px-4" dir="rtl">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold text-foreground mb-8 text-center">
            سياسة الاسترجاع واسترداد الأموال
          </h1>
          
          <div className="bg-card rounded-2xl p-8 border border-border space-y-8">
            {/* مقدمة */}
            <section>
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                مقدمة
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                نحن في محامي كوم نسعى لتقديم أفضل الخدمات القانونية لعملائنا. نتفهم أن هناك ظروفاً قد تستدعي طلب استرجاع المبالغ المدفوعة، لذا وضعنا هذه السياسة لتوضيح الشروط والإجراءات المتبعة.
              </p>
            </section>

            {/* الخدمات القابلة للاسترجاع */}
            <section>
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6" />
                الخدمات القابلة للاسترجاع
              </h2>
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6">
                <ul className="text-muted-foreground space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>الاشتراكات الشهرية:</strong> يمكن طلب الاسترجاع خلال 7 أيام من تاريخ الاشتراك إذا لم يتم استخدام أي من الخدمات المدفوعة</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>الاشتراكات السنوية:</strong> يمكن طلب الاسترجاع خلال 14 يوماً من تاريخ الاشتراك إذا لم يتم استخدام أي من الخدمات المدفوعة</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>مشاكل تقنية:</strong> في حال وجود مشاكل تقنية تمنع استخدام الخدمة ولم يتم حلها خلال 48 ساعة</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* الخدمات غير القابلة للاسترجاع */}
            <section>
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                الخدمات غير القابلة للاسترجاع
              </h2>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                <ul className="text-muted-foreground space-y-3">
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>الاستشارات القانونية التي تم تقديمها بالفعل</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>العقود والمستندات التي تم إنشاؤها أو تحليلها</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>رسوم التواصل مع المحامين بعد إتمام الجلسة</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>الاشتراكات بعد انتهاء فترة الاسترجاع المحددة</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* إجراءات طلب الاسترجاع */}
            <section>
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center gap-2">
                <CreditCard className="w-6 h-6" />
                إجراءات طلب الاسترجاع
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">تقديم الطلب</h3>
                    <p className="text-muted-foreground text-sm">أرسل طلب الاسترجاع عبر البريد الإلكتروني أو نموذج التواصل مع ذكر سبب الطلب ورقم الفاتورة</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">مراجعة الطلب</h3>
                    <p className="text-muted-foreground text-sm">سنقوم بمراجعة طلبك خلال 3-5 أيام عمل والتحقق من استيفاء شروط الاسترجاع</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">معالجة الاسترجاع</h3>
                    <p className="text-muted-foreground text-sm">في حال الموافقة، سيتم استرداد المبلغ إلى نفس وسيلة الدفع المستخدمة خلال 7-14 يوم عمل</p>
                  </div>
                </div>
              </div>
            </section>

            {/* مدة المعالجة */}
            <section>
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6" />
                مدة معالجة الاسترجاع
              </h2>
              <div className="bg-muted/30 rounded-xl p-6">
                <ul className="text-muted-foreground space-y-3">
                  <li className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span><strong>البطاقات الائتمانية (Visa, Mastercard):</strong> 5-10 أيام عمل</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span><strong>مدى:</strong> 3-7 أيام عمل</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span><strong>Apple Pay / Google Pay:</strong> 5-10 أيام عمل</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span><strong>STC Pay:</strong> 3-5 أيام عمل</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* إلغاء الاشتراك */}
            <section>
              <h2 className="text-2xl font-semibold text-primary mb-4">إلغاء الاشتراك</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                يمكنك إلغاء اشتراكك في أي وقت من خلال صفحة إدارة الاشتراك في حسابك. عند الإلغاء:
              </p>
              <ul className="text-muted-foreground space-y-2 list-disc list-inside">
                <li>ستستمر في الوصول للخدمات حتى نهاية فترة الاشتراك الحالية</li>
                <li>لن يتم تجديد الاشتراك تلقائياً</li>
                <li>لن يتم استرداد المبالغ المدفوعة عن الفترة المتبقية (إلا في الحالات المذكورة أعلاه)</li>
              </ul>
            </section>

            {/* تواصل معنا */}
            <section>
              <h2 className="text-2xl font-semibold text-primary mb-4">تواصل معنا</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                لأي استفسارات حول سياسة الاسترجاع أو لتقديم طلب استرجاع:
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="mailto:info@mohamie.com" 
                  className="flex items-center gap-2 px-4 py-3 bg-primary/10 rounded-xl text-primary hover:bg-primary/20 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  <span>info@mohamie.com</span>
                </a>
                <a 
                  href="tel:+966531099732" 
                  className="flex items-center gap-2 px-4 py-3 bg-primary/10 rounded-xl text-primary hover:bg-primary/20 transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  <span dir="ltr">+966 53 109 9732</span>
                </a>
              </div>
            </section>

            <section className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                آخر تحديث: ديسمبر 2024
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Refund;
