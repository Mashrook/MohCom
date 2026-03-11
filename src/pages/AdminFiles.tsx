import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import AdminFileManager from "@/components/admin/AdminFileManager";

const AdminFiles = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية الوصول لهذه الصفحة",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate, toast]);

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-golden" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                إدارة <span className="text-gradient-golden">الملفات</span>
              </h1>
              <p className="text-muted-foreground">
                عرض وإدارة جميع ملفات المستخدمين في النظام
              </p>
            </div>
            <Link to="/admin">
              <Button variant="outline" className="border-golden/30 hover:bg-golden/10">
                <ArrowRight className="w-4 h-4 ml-2" />
                العودة للوحة التحكم
              </Button>
            </Link>
          </div>

          {/* File Manager Component */}
          <AdminFileManager />
        </div>
      </div>
    </Layout>
  );
};

export default AdminFiles;
