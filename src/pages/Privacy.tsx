import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Lock, 
  Eye, 
  Database, 
  UserCheck, 
  Mail, 
  FileText,
  AlertCircle,
  CheckCircle2,
  Baby,
  Scale,
  Globe
} from "lucide-react";

const Privacy = () => {
  const lastUpdated = "16 يناير 2026";
  const effectiveDate = "16 يناير 2026";

  const sections = [
    {
      id: "introduction",
      title: "مقدمة",
      icon: FileText,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            توضح هذه السياسة كيفية جمع واستخدام وحماية البيانات الشخصية التي يتم جمعها من مستخدمي منصة وتطبيق «محاميكم» ("المنصة"، "نحن"، "لنا"). باستخدامك للمنصة، فإنك تقر بأنك قرأت هذه السياسة وفهمتها ووافقت على ما ورد فيها.
          </p>
        </div>
      )
    },
    {
      id: "data-collection",
      title: "البيانات التي نقوم بجمعها",
      icon: Database,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-foreground mb-3">1.1 بيانات يقدمها المستخدم مباشرة:</h4>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>بيانات التسجيل (مثل الاسم، البريد الإلكتروني، رقم الجوال – إن لزم).</li>
              <li>المحتوى الذي يدخله المستخدم في المنصة، مثل الأسئلة القانونية، تفاصيل القضايا، نصوص الشكاوى، ومحتوى العقود.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3">1.2 بيانات يتم جمعها تلقائيًا:</h4>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>بيانات تقنية مثل نوع الجهاز، نظام التشغيل، عنوان بروتوكول الإنترنت (IP)، وبيانات الاستخدام العامة.</li>
              <li>ملفات تعريف الارتباط (Cookies) أو تقنيات مشابهة لتحسين تجربة الاستخدام.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: "data-usage",
      title: "كيفية استخدام البيانات",
      icon: Eye,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">نستخدم البيانات للأغراض التالية:</p>
          <ul className="text-muted-foreground space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <span>تقديم الخدمات القانونية المدعومة بالذكاء الاصطناعي، بما في ذلك الاستشارات الفورية، تنبؤ الأحكام، نماذج العقود، البحث القانوني، وتقديم الشكاوى.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <span>تحسين أداء المنصة وتطوير نماذج الذكاء الاصطناعي وتحليل الاستخدام بشكل عام.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <span>التواصل مع المستخدم بشأن التحديثات أو الإشعارات المتعلقة بالخدمة.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <span>الامتثال للالتزامات النظامية أو التنظيمية عند الاقتضاء.</span>
            </li>
          </ul>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mt-4">
            <p className="text-muted-foreground">
              <strong className="text-green-400">هام:</strong> لن نقوم ببيع بياناتك الشخصية لأي طرف ثالث.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "legal-basis",
      title: "أساس المعالجة النظامي",
      icon: Scale,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">تتم معالجة بياناتك استنادًا إلى واحد أو أكثر من الأسس التالية:</p>
          <ul className="text-muted-foreground space-y-2 list-disc list-inside">
            <li>موافقتك الصريحة عند استخدام المنصة وإدخال بياناتك.</li>
            <li>الحاجة إلى تنفيذ الخدمة التي تطلبها.</li>
            <li>الامتثال لالتزام نظامي أو تنظيمي.</li>
            <li>المصلحة المشروعة في تحسين وتطوير خدماتنا، مع عدم الإضرار بحقوقك الأساسية في الخصوصية.</li>
          </ul>
        </div>
      )
    },
    {
      id: "data-sharing",
      title: "مشاركة البيانات مع أطراف ثالثة",
      icon: UserCheck,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">قد نشارك بعض البيانات مع:</p>
          <ul className="text-muted-foreground space-y-3">
            <li className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <span>مزودي الخدمات التقنية (مثل استضافة الخوادم أو خدمات التحليل) بالقدر اللازم لتشغيل المنصة.</span>
            </li>
            <li className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <span>الجهات النظامية أو القضائية عند وجود التزام نظامي أو أمر رسمي.</span>
            </li>
          </ul>
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-4">
            <p className="text-muted-foreground">
              نلتزم بعدم مشاركة بياناتك مع أي طرف ثالث لأغراض تسويقية دون موافقتك الصريحة.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "data-security",
      title: "حماية البيانات",
      icon: Lock,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            نطبق إجراءات تقنية وتنظيمية مناسبة لحماية بياناتك من الوصول غير المصرح به أو الفقد أو التعديل أو الإفصاح غير المشروع، بما في ذلك:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                بروتوكولات آمنة
              </h4>
              <p className="text-sm text-muted-foreground">استخدام بروتوكولات اتصال آمنة قدر الإمكان.</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                تقييد الوصول
              </h4>
              <p className="text-sm text-muted-foreground">تقييد الوصول إلى البيانات على الموظفين أو الأنظمة التي تحتاج إليها فقط.</p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-4">
            مع ذلك، لا يمكن ضمان أمان كامل لأي نظام إلكتروني، ويُقر المستخدم بذلك.
          </p>
        </div>
      )
    },
    {
      id: "data-retention",
      title: "الاحتفاظ بالبيانات",
      icon: Database,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            نحتفظ بالبيانات الشخصية للمدة اللازمة لتحقيق الأغراض التي جُمعت من أجلها، أو للامتثال للمتطلبات النظامية المعمول بها.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            قد يتم حذف أو إخفاء هوية بعض البيانات بعد فترة زمنية معقولة إذا لم تعد هناك حاجة للاحتفاظ بها.
          </p>
        </div>
      )
    },
    {
      id: "user-rights",
      title: "حقوق المستخدم",
      icon: UserCheck,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            قد يكون للمستخدم، وفقًا للأنظمة المعمول بها، حقوق تتعلق ببياناته الشخصية، مثل:
          </p>
          <div className="grid gap-3">
            {[
              { title: "حق الوصول", desc: "طلب الوصول إلى البيانات الشخصية التي نحتفظ بها عنه" },
              { title: "حق التصحيح", desc: "طلب تصحيح أي بيانات غير دقيقة أو غير مكتملة" },
              { title: "حق الحذف", desc: "طلب حذف البيانات في حدود ما يسمح به النظام" },
              { title: "حق الاعتراض", desc: "الاعتراض على بعض أنواع المعالجة أو تقييدها" }
            ].map((right, i) => (
              <div key={i} className="flex items-start gap-3 bg-muted/20 rounded-lg p-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-foreground">{right.title}:</span>
                  <span className="text-muted-foreground mr-1">{right.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-sm mt-4">
            يمكن للمستخدم التواصل معنا عبر البريد الإلكتروني المذكور في المنصة لممارسة هذه الحقوق، مع إرفاق ما يلزم من بيانات للتحقق من الهوية.
          </p>
        </div>
      )
    },
    {
      id: "children-privacy",
      title: "بيانات القُصّر",
      icon: Baby,
      content: (
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-muted-foreground leading-relaxed">
              لا تستهدف المنصة القُصّر دون سن الرشد النظامي. في حال علمنا بجمع بيانات من قاصر دون موافقة ولي الأمر، سنعمل على حذفها في أقرب وقت ممكن.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "policy-updates",
      title: "التعديلات على سياسة الخصوصية",
      icon: FileText,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            قد نقوم بتحديث هذه السياسة من وقت لآخر.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            سيتم نشر أي تعديل على هذه الصفحة مع تحديث تاريخ النفاذ، ويُعد استمرار استخدامك للمنصة بعد التعديل موافقة ضمنية على السياسة المعدلة.
          </p>
        </div>
      )
    },
    {
      id: "contact",
      title: "التواصل",
      icon: Mail,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            لأي استفسارات تتعلق بسياسة الخصوصية، يمكن التواصل عبر:
          </p>
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <p className="text-foreground font-medium">
              البريد الإلكتروني: info@mohamie.com
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <Layout>
      <SEO 
        title="سياسة الخصوصية | محاميكم"
        description="سياسة الخصوصية لمنصة محاميكم - كيفية جمع واستخدام وحماية بياناتك الشخصية"
        url="/privacy"
      />
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge variant="outline" className="mb-4 px-4 py-1.5 text-primary border-primary/30">
              <Shield className="w-4 h-4 ml-2" />
              حماية خصوصيتك أولويتنا
            </Badge>
            <h1 className="text-4xl md:text-5xl font-cairo font-bold text-foreground mb-6">
              سياسة الخصوصية
            </h1>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <span>آخر تحديث: {lastUpdated}</span>
              <span className="hidden sm:inline">•</span>
              <span>تاريخ النفاذ: {effectiveDate}</span>
            </div>
          </div>

          {/* Table of Contents */}
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                محتويات السياسة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {sections.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted/50"
                  >
                    {index + 1}. {section.title}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="space-y-6 max-w-4xl mx-auto">
            {sections.map((section, index) => (
              <Card key={section.id} id={section.id} className="border-border/50 hover:border-primary/30 transition-colors scroll-mt-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <section.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span>{index + 1}. {section.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {section.content}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center mt-12 p-6 bg-muted/30 rounded-2xl max-w-2xl mx-auto">
            <Globe className="w-8 h-8 text-primary mx-auto mb-4" />
            <h3 className="font-bold text-lg text-foreground mb-2">التزامنا بحماية بياناتك</h3>
            <p className="text-muted-foreground text-sm">
              في محاميكم، نلتزم بأعلى معايير حماية البيانات وفقًا للأنظمة المعمول بها في المملكة العربية السعودية.
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              للتواصل: <a href="mailto:info@mohamie.com" className="text-primary hover:underline">info@mohamie.com</a>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Privacy;
