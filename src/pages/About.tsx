import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Scale, Target, Eye, Award, Users, Shield, Zap } from "lucide-react";

const values = [
  {
    icon: Shield,
    title: "النزاهة",
    description: "نلتزم بأعلى معايير النزاهة والشفافية في جميع تعاملاتنا",
  },
  {
    icon: Award,
    title: "التميز",
    description: "نسعى دائماً لتقديم أفضل الخدمات القانونية بأعلى جودة",
  },
  {
    icon: Users,
    title: "العميل أولاً",
    description: "رضا العميل هو هدفنا الأول ومعيار نجاحنا",
  },
  {
    icon: Zap,
    title: "الابتكار",
    description: "نوظف أحدث التقنيات لتطوير خدماتنا باستمرار",
  },
];

const stats = [
  { value: "+500", label: "محامي معتمد" },
  { value: "+10K", label: "استشارة منجزة" },
  { value: "+5K", label: "عميل راضي" },
  { value: "98%", label: "نسبة الرضا" },
];

const About = () => {
  return (
    <Layout>
      <SEO 
        title="عن المنصة"
        description="تعرف على محامي كوم، المنصة الرائدة في تقديم الخدمات القانونية الذكية في المملكة العربية السعودية. نجمع بين الخبرة القانونية والتقنية الحديثة."
        url="/about"
        keywords="عن محامي كوم, منصة قانونية سعودية, خدمات قانونية ذكية, رؤية محامي كوم, مهمة محامي كوم"
      />
      {/* Hero Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              عن محامي كوم
            </span>
            <h1 className="font-cairo font-bold text-4xl md:text-5xl text-foreground mb-6">
              منصة احترافية تجمع نخبة من المحامين
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              نقدم الاستشارات والخدمات القانونية من خلال خبرة جماعية موثوقة بتقنية ذكية متقدمة
            </p>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Vision */}
            <div className="p-8 rounded-2xl bg-card border border-border hover-lift">
              <div className="w-16 h-16 rounded-xl bg-gradient-golden flex items-center justify-center mb-6 shadow-golden">
                <Eye className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="font-cairo font-bold text-2xl text-foreground mb-4">رؤيتنا</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                أن نكون المنصة الرائدة في تقديم الخدمات القانونية الذكية في المنطقة العربية، ونموذجاً يُحتذى به في الجمع بين الخبرة القانونية والتقنية الحديثة.
              </p>
            </div>

            {/* Mission */}
            <div className="p-8 rounded-2xl bg-card border border-border hover-lift">
              <div className="w-16 h-16 rounded-xl bg-gradient-golden flex items-center justify-center mb-6 shadow-golden">
                <Target className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="font-cairo font-bold text-2xl text-foreground mb-4">مهمتنا</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                تقديم الاستشارات والخدمات القانونية من خلال خبرة جماعية موثوقة بتقنية ذكية، وتمكين الجميع من الوصول للعدالة بسهولة ويسر.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-cairo font-black text-4xl md:text-5xl text-gradient-golden mb-2">
                  {stat.value}
                </p>
                <p className="text-muted-foreground font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              قيمنا
            </span>
            <h2 className="font-cairo font-bold text-3xl md:text-4xl text-foreground mb-6">
              القيم التي نؤمن بها
            </h2>
            <p className="text-muted-foreground text-lg">
              نلتزم بمجموعة من القيم الأساسية التي توجه عملنا وتحدد هويتنا
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div
                key={value.title}
                className="p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all duration-300 hover-lift text-center"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <value.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-cairo font-semibold text-xl text-foreground mb-3">
                  {value.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
