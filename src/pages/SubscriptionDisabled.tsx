import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Globe, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

const SubscriptionDisabled = () => {
  return (
    <Layout>
      <SEO
        title="الاشتراك"
        description="ميزة الاشتراك متاحة عبر الموقع الرسمي"
        url="/subscription-disabled"
      />
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto text-center space-y-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
              <Globe className="w-10 h-10 text-primary" />
            </div>

            <h1 className="font-cairo font-bold text-3xl text-foreground">
              إدارة الاشتراك
            </h1>

            <p className="text-muted-foreground text-lg leading-relaxed">
              ميزة الاشتراك وإدارة الباقات متاحة عبر الموقع الرسمي لمنصة محامي كوم.
            </p>

            <p className="text-muted-foreground text-sm">
              إذا كنت مشتركاً بالفعل، يمكنك تسجيل الدخول والاستفادة من جميع الخدمات المتاحة لباقتك.
            </p>

            <div className="flex flex-col gap-3">
              <Link to="/auth">
                <Button variant="golden" size="lg" className="w-full">
                  <LogIn className="w-5 h-5 ml-2" />
                  تسجيل الدخول
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" size="lg" className="w-full">
                  العودة للرئيسية
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default SubscriptionDisabled;
