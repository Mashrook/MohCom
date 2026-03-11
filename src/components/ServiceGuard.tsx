import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSectionSettings } from "@/hooks/useSectionSettings";
import { Layout } from "@/components/layout/Layout";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ServiceGuardProps {
  sectionKey: string;
  children: ReactNode;
}

export function ServiceGuard({ sectionKey, children }: ServiceGuardProps) {
  const { isSectionEnabled, loading } = useSectionSettings();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isSectionEnabled(sectionKey)) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-6 p-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">الخدمة غير متاحة حالياً</h1>
            <p className="text-muted-foreground max-w-md">
              هذه الخدمة معطلة مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً أو التواصل مع الدعم.
            </p>
            <Button onClick={() => navigate("/")} className="bg-primary hover:bg-primary/90">
              العودة للرئيسية
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
}
