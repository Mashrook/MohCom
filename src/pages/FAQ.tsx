import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { ChevronDown, Search, Scale, FileText, MessageSquare, CreditCard, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // الخدمات العامة
  {
    category: "الخدمات العامة",
    question: "ما هي منصة محامي كوم؟",
    answer: "محامي كوم هي منصة قانونية ذكية تقدم خدمات استشارية قانونية متكاملة باستخدام الذكاء الاصطناعي. نوفر استشارات قانونية فورية، تحليل العقود، التنبؤ بالأحكام القضائية، وربط العملاء بنخبة من المحامين المعتمدين في المملكة العربية السعودية."
  },
  {
    category: "الخدمات العامة",
    question: "ما هي الخدمات التي تقدمها المنصة؟",
    answer: "نقدم مجموعة شاملة من الخدمات تشمل: الاستشارات القانونية الذكية، التنبؤ بالأحكام القضائية، تحليل ومراجعة العقود، نظام الشكاوى الذكي، البحث في الأنظمة واللوائح السعودية، والتواصل المباشر مع محامين معتمدين."
  },
  {
    category: "الخدمات العامة",
    question: "هل الخدمات متاحة على مدار الساعة؟",
    answer: "نعم، خدمات الذكاء الاصطناعي متاحة على مدار الساعة طوال أيام الأسبوع. أما التواصل المباشر مع المحامين فيكون خلال ساعات العمل الرسمية من الأحد إلى الخميس."
  },
  // الاستشارات القانونية
  {
    category: "الاستشارات القانونية",
    question: "كيف تعمل خدمة الاستشارات الذكية؟",
    answer: "تعتمد خدمة الاستشارات على تقنية الذكاء الاصطناعي المدربة على الأنظمة واللوائح السعودية. يمكنك طرح سؤالك القانوني والحصول على إجابة فورية مدعومة بالمراجع القانونية ذات الصلة."
  },
  {
    category: "الاستشارات القانونية",
    question: "هل يمكنني الاعتماد على الاستشارة الذكية في القضايا المهمة؟",
    answer: "الاستشارات الذكية تقدم توجيهات أولية ومعلومات قانونية عامة. للقضايا المهمة والمعقدة، ننصح بالتواصل مع محامٍ معتمد عبر المنصة للحصول على استشارة متخصصة."
  },
  // التنبؤ بالأحكام
  {
    category: "التنبؤ بالأحكام",
    question: "ما هي خدمة التنبؤ بالأحكام؟",
    answer: "خدمة التنبؤ بالأحكام تستخدم الذكاء الاصطناعي لتحليل تفاصيل قضيتك ومقارنتها بقضايا مشابهة سابقة، لتقديم تقدير لنسبة النجاح المحتملة ونقاط القوة والضعف في قضيتك."
  },
  {
    category: "التنبؤ بالأحكام",
    question: "ما مدى دقة التنبؤات؟",
    answer: "التنبؤات مبنية على تحليل البيانات والقضايا المشابهة، لكنها ليست ضماناً للنتيجة. كل قضية فريدة وتعتمد على عوامل متعددة. نوصي باستخدام التنبؤات كأداة توجيهية مع استشارة محامٍ متخصص."
  },
  // العقود
  {
    category: "العقود",
    question: "ما هي أنواع العقود المتاحة؟",
    answer: "نوفر مكتبة شاملة من نماذج العقود تشمل: عقود الإيجار، عقود العمل، عقود البيع والشراء، عقود الشراكة، عقود الخدمات، واتفاقيات السرية وغيرها الكثير."
  },
  {
    category: "العقود",
    question: "هل يمكنني تعديل العقود؟",
    answer: "نعم، جميع نماذج العقود قابلة للتعديل والتخصيص. يمكنك ملء البيانات المطلوبة وتعديل البنود حسب احتياجاتك، ثم تحميل العقد بصيغة PDF."
  },
  // الاشتراكات والأسعار
  {
    category: "الاشتراكات والأسعار",
    question: "ما هي خطط الاشتراك المتاحة؟",
    answer: "نقدم ثلاث خطط: الأساسية للاستخدام الشخصي، الاحترافية للمحامين والشركات الصغيرة، والمؤسسات للشركات الكبيرة. كل خطة توفر مستويات مختلفة من الوصول والميزات."
  },
  {
    category: "الاشتراكات والأسعار",
    question: "هل يمكنني تجربة الخدمات قبل الاشتراك؟",
    answer: "نعم، نوفر تجربة مجانية لمرة واحدة لكل خدمة. يمكنك تجربة الاستشارات، التنبؤ بالأحكام، والخدمات الأخرى قبل اتخاذ قرار الاشتراك."
  },
  {
    category: "الاشتراكات والأسعار",
    question: "كيف يمكنني إلغاء اشتراكي؟",
    answer: "يمكنك إدارة اشتراكك وإلغائه في أي وقت من خلال صفحة إدارة الاشتراك. سيستمر اشتراكك حتى نهاية الفترة المدفوعة."
  },
  // الخصوصية والأمان
  {
    category: "الخصوصية والأمان",
    question: "هل بياناتي آمنة؟",
    answer: "نعم، نستخدم أعلى معايير التشفير والأمان لحماية بياناتك. جميع المحادثات والمستندات مشفرة، ولا نشارك بياناتك مع أي طرف ثالث دون موافقتك."
  },
  {
    category: "الخصوصية والأمان",
    question: "من يمكنه الاطلاع على استشاراتي؟",
    answer: "استشاراتك سرية تماماً. فقط أنت والمحامي الذي تتواصل معه (إن وجد) يمكنهم الاطلاع عليها. فريق الدعم الفني لا يطلع على محتوى الاستشارات."
  },
  // المحامين
  {
    category: "المحامين",
    question: "كيف يمكنني التواصل مع محامٍ؟",
    answer: "يمكنك استعراض قائمة المحامين المعتمدين في المنصة، والاطلاع على تخصصاتهم وتقييماتهم، ثم التواصل مباشرة عبر نظام الرسائل أو طلب استشارة."
  },
  {
    category: "المحامين",
    question: "هل المحامون في المنصة معتمدون؟",
    answer: "نعم، جميع المحامين في المنصة معتمدون ومرخصون من وزارة العدل في المملكة العربية السعودية. نتحقق من جميع الرخص والشهادات قبل قبول أي محامٍ في المنصة."
  },
];

const categories = [
  { id: "all", label: "الكل", icon: Scale },
  { id: "الخدمات العامة", label: "الخدمات العامة", icon: MessageSquare },
  { id: "الاستشارات القانونية", label: "الاستشارات", icon: MessageSquare },
  { id: "التنبؤ بالأحكام", label: "التنبؤ بالأحكام", icon: Scale },
  { id: "العقود", label: "العقود", icon: FileText },
  { id: "الاشتراكات والأسعار", label: "الاشتراكات", icon: CreditCard },
  { id: "الخصوصية والأمان", label: "الخصوصية", icon: Shield },
  { id: "المحامين", label: "المحامين", icon: Users },
];

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openItems, setOpenItems] = useState<number[]>([]);

  const filteredFAQs = faqData.filter((faq) => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleItem = (index: number) => {
    setOpenItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // Generate FAQ Schema for SEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };

  return (
    <Layout>
      <SEO
        title="الأسئلة الشائعة"
        description="إجابات على الأسئلة الأكثر شيوعاً حول خدمات محامي كوم للاستشارات القانونية الذكية، الاشتراكات، العقود، والمزيد."
        url="/faq"
        keywords="أسئلة شائعة, محامي كوم, استشارات قانونية, أسئلة قانونية, مساعدة"
      />
      
      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="py-24">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              مركز المساعدة
            </span>
            <h1 className="font-cairo font-bold text-3xl md:text-4xl text-foreground mb-6">
              الأسئلة الشائعة
            </h1>
            <p className="text-muted-foreground text-lg">
              إجابات على أكثر الأسئلة شيوعاً حول خدماتنا
            </p>
          </div>

          {/* Search */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث في الأسئلة الشائعة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-border rounded-xl pr-12 pl-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
                )}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* FAQ Items */}
          <div className="max-w-3xl mx-auto space-y-4">
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">لم يتم العثور على نتائج</p>
              </div>
            ) : (
              filteredFAQs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full flex items-center justify-between p-5 text-right hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium text-foreground">{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 mr-4",
                        openItems.includes(index) && "rotate-180"
                      )}
                    />
                  </button>
                  {openItems.includes(index) && (
                    <div className="px-5 pb-5 pt-0">
                      <div className="pt-4 border-t border-border">
                        <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                        <span className="inline-block mt-3 text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                          {faq.category}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Contact CTA */}
          <div className="max-w-2xl mx-auto mt-16 text-center p-8 rounded-2xl bg-card border border-border">
            <h2 className="font-cairo font-semibold text-xl text-foreground mb-3">
              لم تجد إجابة لسؤالك؟
            </h2>
            <p className="text-muted-foreground mb-6">
              تواصل معنا وسنكون سعداء بمساعدتك
            </p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-golden text-navy-900 font-medium hover:opacity-90 transition-opacity"
            >
              <MessageSquare className="w-5 h-5" />
              تواصل معنا
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default FAQ;
