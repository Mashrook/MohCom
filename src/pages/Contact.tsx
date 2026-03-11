import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Send, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const contactInfo = [
  {
    icon: Mail,
    title: "البريد الإلكتروني",
    value: "info@mohamie.com",
    description: "الرد خلال 24 ساعة",
  },
  {
    icon: Phone,
    title: "الهاتف",
    value: "+966 53 109 9732",
    description: "خلال ساعات العمل",
  },
  {
    icon: MessageSquare,
    title: "واتساب",
    value: "+966 53 109 9732",
    description: "رد فوري",
  },
  {
    icon: MapPin,
    title: "الموقع",
    value: "المملكة العربية السعودية",
    description: "نعمل عن بُعد",
  },
];

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "تم إرسال رسالتك بنجاح",
      description: "سنتواصل معك في أقرب وقت ممكن",
    });
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  return (
    <Layout>
      <SEO 
        title="تواصل معنا"
        description="تواصل مع فريق محامي كوم للاستفسارات والدعم. نحن هنا لمساعدتك في جميع احتياجاتك القانونية."
        url="/contact"
        keywords="تواصل معنا, دعم محامي كوم, استفسارات قانونية, رقم محامي, بريد محامي كوم"
      />
      <section className="py-24">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              تواصل معنا
            </span>
            <h1 className="font-cairo font-bold text-3xl md:text-4xl text-foreground mb-6">
              نحن هنا لمساعدتك
            </h1>
            <p className="text-muted-foreground text-lg">
              لديك سؤال أو استفسار؟ لا تتردد في التواصل معنا
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Info */}
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {contactInfo.map((item) => (
                  <div
                    key={item.title}
                    className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-cairo font-semibold text-foreground mb-1">
                      {item.title}
                    </h3>
                    <p className="text-primary font-medium mb-1" dir="ltr">
                      {item.value}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Working Hours */}
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h3 className="font-cairo font-semibold text-xl text-foreground mb-4">
                  ساعات العمل
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">الأحد - الخميس</span>
                    <span className="text-foreground">9:00 ص - 6:00 م</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">الجمعة - السبت</span>
                    <span className="text-foreground">مغلق</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="p-8 rounded-2xl bg-card border border-border">
              <h3 className="font-cairo font-semibold text-2xl text-foreground mb-6">
                أرسل لنا رسالة
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      الاسم الكامل
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="محمد أحمد"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="+966 5XX XXX XXXX"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      الموضوع
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="موضوع الرسالة"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    الرسالة
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    placeholder="اكتب رسالتك هنا..."
                  />
                </div>
                <Button type="submit" variant="golden" size="lg" className="w-full">
                  <Send className="w-5 h-5 ml-2" />
                  إرسال الرسالة
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
