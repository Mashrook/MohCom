import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Shield, FileText, CreditCard, Users, AlertTriangle, Scale, Globe, RefreshCw, MessageSquare, Smartphone, Ban, Lock } from "lucide-react";

const Terms = () => {
  const sections = [
    { id: "acceptance", title: "القبول بالشروط", icon: FileText },
    { id: "eligibility", title: "أهلية الاستخدام", icon: Users },
    { id: "account", title: "حساب المستخدم", icon: Lock },
    { id: "services", title: "وصف الخدمات", icon: Smartphone },
    { id: "subscriptions", title: "الاشتراكات والدفع", icon: CreditCard },
    { id: "user-conduct", title: "سلوك المستخدم", icon: Shield },
    { id: "prohibited", title: "الأنشطة المحظورة", icon: Ban },
    { id: "intellectual", title: "الملكية الفكرية", icon: Scale },
    { id: "disclaimer", title: "إخلاء المسؤولية", icon: AlertTriangle },
    { id: "termination", title: "إنهاء الحساب", icon: RefreshCw },
    { id: "governing-law", title: "القانون الواجب التطبيق", icon: Globe },
    { id: "contact", title: "التواصل معنا", icon: MessageSquare },
  ];

  return (
    <Layout>
      <SEO 
        title="شروط الاستخدام"
        description="شروط وأحكام استخدام منصة وتطبيق محامي كوم للخدمات القانونية. اقرأ الشروط قبل استخدام خدماتنا."
        url="/terms"
        keywords="شروط الاستخدام, أحكام الخدمة, اتفاقية المستخدم, محامي كوم, شروط التطبيق"
      />
      <div className="min-h-screen bg-background py-16 px-4" dir="rtl">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              شروط الاستخدام
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              يرجى قراءة هذه الشروط والأحكام بعناية قبل استخدام تطبيق ومنصة محامي كوم
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              آخر تحديث: ديسمبر 2024
            </p>
          </div>

          {/* Quick Navigation */}
          <div className="bg-card rounded-2xl p-6 border border-border mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">التنقل السريع</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors text-sm text-muted-foreground hover:text-foreground"
                >
                  <section.icon className="w-4 h-4 text-primary" />
                  <span>{section.title}</span>
                </a>
              ))}
            </div>
          </div>
          
          <div className="bg-card rounded-2xl p-8 border border-border space-y-10">
            
            {/* Acceptance */}
            <section id="acceptance">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/20">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">القبول بالشروط</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>
                  باستخدامك لتطبيق ومنصة محامي كوم ("التطبيق" أو "الخدمة")، فإنك توافق على الالتزام بهذه الشروط والأحكام ("الشروط"). إذا كنت لا توافق على أي من هذه الشروط، يرجى عدم استخدام التطبيق.
                </p>
                <p>
                  هذه الشروط تشكل اتفاقية قانونية ملزمة بينك وبين محامي كوم. باستخدامك للتطبيق، فإنك تقر بأنك قرأت وفهمت ووافقت على الالتزام بهذه الشروط.
                </p>
                <p>
                  نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطارك بالتغييرات الجوهرية عبر التطبيق أو البريد الإلكتروني. استمرارك في استخدام التطبيق بعد التعديلات يعني قبولك للشروط المحدثة.
                </p>
              </div>
            </section>

            {/* Eligibility */}
            <section id="eligibility">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">أهلية الاستخدام</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>لاستخدام تطبيق محامي كوم، يجب أن:</p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>يكون عمرك 18 سنة أو أكثر، أو أن يكون لديك إذن من ولي أمرك</li>
                  <li>تكون لديك الأهلية القانونية لإبرام عقود ملزمة</li>
                  <li>لا تكون محظوراً من استخدام الخدمة بموجب القوانين المعمول بها</li>
                  <li>تقدم معلومات صحيحة ودقيقة عند التسجيل</li>
                </ul>
                <p>
                  إذا كنت تستخدم التطبيق نيابة عن شركة أو جهة قانونية، فإنك تقر بأنك مخول بإلزام تلك الجهة بهذه الشروط.
                </p>
              </div>
            </section>

            {/* Account */}
            <section id="account">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">حساب المستخدم</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p><strong>إنشاء الحساب:</strong></p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>يجب إنشاء حساب للوصول إلى معظم ميزات التطبيق</li>
                  <li>يجب تقديم معلومات دقيقة وكاملة ومحدثة</li>
                  <li>أنت مسؤول عن الحفاظ على سرية بيانات تسجيل الدخول</li>
                  <li>يجب إخطارنا فوراً عند أي استخدام غير مصرح به لحسابك</li>
                </ul>
                <p><strong>أمان الحساب:</strong></p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>نوصي بتفعيل المصادقة الثنائية (MFA) لحماية حسابك</li>
                  <li>استخدم كلمة مرور قوية وفريدة</li>
                  <li>لا تشارك بيانات حسابك مع الآخرين</li>
                  <li>أنت مسؤول عن جميع الأنشطة التي تتم من خلال حسابك</li>
                </ul>
              </div>
            </section>

            {/* Services */}
            <section id="services">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">وصف الخدمات</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>محامي كوم يقدم الخدمات التالية:</p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li><strong>الاستشارات القانونية الذكية:</strong> استشارات قانونية مدعومة بالذكاء الاصطناعي</li>
                  <li><strong>توقعات الأحكام:</strong> تحليل القضايا وتوقع النتائج المحتملة</li>
                  <li><strong>إدارة العقود:</strong> تصفح وإنشاء وتحليل العقود القانونية</li>
                  <li><strong>البحث القانوني:</strong> البحث في الأنظمة والقوانين السعودية</li>
                  <li><strong>التواصل مع المحامين:</strong> التواصل مع محامين مرخصين عبر الرسائل والمكالمات</li>
                  <li><strong>نظام الشكاوى:</strong> تحليل وصياغة الشكاوى القانونية</li>
                </ul>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
                  <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                    <strong>تنبيه هام:</strong> المعلومات المقدمة عبر التطبيق هي لأغراض إرشادية ومعلوماتية فقط، ولا تُعد بديلاً عن الاستشارة القانونية المتخصصة من محامٍ مرخص. نوصي دائماً بالتحقق من أي معلومات قانونية مع محامٍ مختص.
                  </p>
                </div>
              </div>
            </section>

            {/* Subscriptions */}
            <section id="subscriptions">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/20">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">الاشتراكات والدفع</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p><strong>التجارب المجانية:</strong></p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>يحصل المستخدمون الجدد على تجربة مجانية واحدة لكل خدمة</li>
                  <li>بعد انتهاء التجربة، يتطلب الوصول اشتراكاً مدفوعاً</li>
                </ul>
                <p><strong>الاشتراكات المدفوعة:</strong></p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>الأسعار معروضة بالريال السعودي وشاملة لضريبة القيمة المضافة</li>
                  <li>يتم تجديد الاشتراكات تلقائياً ما لم يتم إلغاؤها قبل موعد التجديد</li>
                  <li>يمكنك إلغاء اشتراكك في أي وقت من إعدادات الحساب</li>
                  <li>عند الإلغاء، تستمر الخدمة حتى نهاية فترة الفوترة الحالية</li>
                </ul>
                <p><strong>طرق الدفع:</strong></p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>نقبل: مدى، فيزا، ماستركارد، Apple Pay، Google Pay، STC Pay</li>
                  <li>تتم معالجة المدفوعات بشكل آمن عبر بوابة Tap Payments</li>
                </ul>
                <p><strong>سياسة الاسترجاع:</strong></p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>يمكن استرجاع المبالغ خلال 14 يوماً من تاريخ الاشتراك</li>
                  <li>لا يمكن الاسترجاع إذا تم استخدام الخدمات بشكل جوهري</li>
                  <li>راجع <a href="/refund" className="text-primary hover:underline">سياسة الاسترجاع</a> للتفاصيل الكاملة</li>
                </ul>
              </div>
            </section>

            {/* User Conduct */}
            <section id="user-conduct">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">سلوك المستخدم</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>عند استخدام التطبيق، توافق على:</p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>تقديم معلومات صحيحة ودقيقة ومحدثة</li>
                  <li>استخدام التطبيق لأغراض قانونية فقط</li>
                  <li>احترام حقوق المستخدمين الآخرين والمحامين</li>
                  <li>عدم محاولة الوصول غير المصرح به لأنظمتنا</li>
                  <li>عدم استخدام التطبيق بطريقة قد تضر بالخدمة أو بالآخرين</li>
                  <li>الالتزام بجميع القوانين والأنظمة المعمول بها</li>
                  <li>عدم انتهاك حقوق الملكية الفكرية للآخرين</li>
                </ul>
              </div>
            </section>

            {/* Prohibited Activities */}
            <section id="prohibited">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-destructive/20">
                  <Ban className="w-5 h-5 text-destructive" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">الأنشطة المحظورة</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>يُحظر عليك:</p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>استخدام التطبيق لأي غرض غير قانوني أو احتيالي</li>
                  <li>انتحال شخصية أي شخص أو جهة</li>
                  <li>نشر محتوى مسيء أو تشهيري أو مخالف للآداب العامة</li>
                  <li>محاولة اختراق أو تعطيل أنظمة التطبيق</li>
                  <li>استخدام برامج آلية أو روبوتات للوصول للتطبيق</li>
                  <li>جمع بيانات المستخدمين الآخرين بدون إذن</li>
                  <li>إرسال رسائل مزعجة أو إعلانات غير مرغوب فيها</li>
                  <li>التلاعب بالذكاء الاصطناعي أو محاولة استغلاله بطرق غير مشروعة</li>
                  <li>مشاركة حسابك أو بيانات الدخول مع الآخرين</li>
                  <li>استخدام التطبيق لتقديم استشارات قانونية إذا لم تكن محامياً مرخصاً</li>
                </ul>
              </div>
            </section>

            {/* Intellectual Property */}
            <section id="intellectual">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Scale className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">الملكية الفكرية</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p><strong>حقوقنا:</strong></p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>جميع المحتويات والتصاميم والشعارات والعلامات التجارية هي ملكية حصرية لمحامي كوم</li>
                  <li>التطبيق وجميع مكوناته محمية بموجب قوانين حقوق الملكية الفكرية</li>
                  <li>لا يجوز نسخ أو تعديل أو توزيع أي جزء من التطبيق بدون إذن كتابي</li>
                </ul>
                <p><strong>محتوى المستخدم:</strong></p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>تحتفظ بملكية المحتوى الذي تقدمه (مستندات، معلومات قضايا، إلخ)</li>
                  <li>بتقديم المحتوى، تمنحنا ترخيصاً لاستخدامه لتقديم الخدمة لك</li>
                  <li>لن نشارك محتواك مع أطراف ثالثة إلا وفق سياسة الخصوصية</li>
                </ul>
              </div>
            </section>

            {/* Disclaimer */}
            <section id="disclaimer">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">إخلاء المسؤولية</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p><strong>تنبيه هام:</strong></p>
                  <ul className="list-disc list-inside space-y-2 mr-4 mt-2">
                    <li>الخدمة تُقدم "كما هي" و"حسب التوفر" بدون أي ضمانات</li>
                    <li>لا نضمن دقة أو اكتمال المعلومات المقدمة عبر الذكاء الاصطناعي</li>
                    <li>توقعات الأحكام هي تقديرات إرشادية وليست ضماناً للنتائج</li>
                    <li>لا نتحمل مسؤولية القرارات المتخذة بناءً على معلومات التطبيق</li>
                    <li>يجب التحقق من أي معلومات قانونية مع محامٍ مختص</li>
                  </ul>
                </div>
                <p><strong>حدود المسؤولية:</strong></p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>لن نكون مسؤولين عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام التطبيق</li>
                  <li>مسؤوليتنا القصوى محدودة بالمبالغ المدفوعة منك خلال الـ 12 شهراً الماضية</li>
                  <li>لا نتحمل مسؤولية انقطاع الخدمة أو فقدان البيانات</li>
                </ul>
              </div>
            </section>

            {/* Termination */}
            <section id="termination">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/20">
                  <RefreshCw className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">إنهاء الحساب</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p><strong>إنهاء من قبلك:</strong></p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>يمكنك إلغاء حسابك في أي وقت من إعدادات الحساب</li>
                  <li>عند الإلغاء، ستفقد الوصول لجميع بياناتك وسجلاتك</li>
                  <li>لن يتم استرداد رسوم الاشتراك المدفوعة مسبقاً</li>
                </ul>
                <p><strong>إنهاء من قبلنا:</strong></p>
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>يحق لنا تعليق أو إنهاء حسابك إذا انتهكت هذه الشروط</li>
                  <li>يحق لنا إنهاء الخدمة في أي وقت مع إشعار مسبق معقول</li>
                  <li>في حالة الإنهاء لانتهاك الشروط، لن يتم استرداد أي مبالغ</li>
                </ul>
              </div>
            </section>

            {/* Governing Law */}
            <section id="governing-law">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">القانون الواجب التطبيق</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <ul className="list-disc list-inside space-y-2 mr-4">
                  <li>تخضع هذه الشروط وتُفسر وفقاً لأنظمة المملكة العربية السعودية</li>
                  <li>أي نزاعات تنشأ عن استخدام التطبيق تختص بالنظر فيها المحاكم السعودية</li>
                  <li>في حالة وجود تعارض بين هذه الشروط والقوانين المحلية، تسود القوانين المحلية</li>
                  <li>يخضع التطبيق لرقابة هيئة الحكومة الرقمية ووزارة العدل في المملكة العربية السعودية</li>
                </ul>
              </div>
            </section>

            {/* Contact */}
            <section id="contact">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/20">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">التواصل معنا</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>للاستفسارات أو الشكاوى المتعلقة بهذه الشروط:</p>
                <div className="bg-accent/50 rounded-lg p-4 space-y-2">
                  <p><strong>البريد الإلكتروني:</strong> info@mohamie.com</p>
                  <p><strong>واتساب:</strong> +966531099732</p>
                  <p><strong>الموقع:</strong> <a href="https://mohamie.com" className="text-primary hover:underline">mohamie.com</a></p>
                </div>
                <p className="text-sm">
                  سنبذل قصارى جهدنا للرد على استفساراتك خلال 48 ساعة عمل.
                </p>
              </div>
            </section>

            {/* Footer */}
            <section className="pt-6 border-t border-border">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  آخر تحديث: ديسمبر 2024
                </p>
                <div className="flex gap-4 text-sm">
                  <a href="/privacy" className="text-primary hover:underline">سياسة الخصوصية</a>
                  <a href="/refund" className="text-primary hover:underline">سياسة الاسترجاع</a>
                  <a href="/contact" className="text-primary hover:underline">تواصل معنا</a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Terms;
