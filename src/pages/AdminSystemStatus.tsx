import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import LiveServiceMonitor from '@/components/admin/LiveServiceMonitor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Brain, CreditCard, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const AdminSystemStatus = () => {
  const { isAdmin, loading } = useAuth();
  const [stats, setStats] = useState({
    contracts: 0,
    aiChats: 0,
    payments: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [contractsRes, aiChatsRes, paymentsRes] = await Promise.all([
        supabase.from('contract_templates').select('id', { count: 'exact', head: true }),
        supabase.from('contract_analyses').select('id', { count: 'exact', head: true }),
        supabase.from('payment_history').select('id', { count: 'exact', head: true }).eq('status', 'CAPTURED'),
      ]);

      setStats({
        contracts: contractsRes.count || 0,
        aiChats: aiChatsRes.count || 0,
        payments: paymentsRes.count || 0,
      });
    };

    if (isAdmin) fetchStats();
  }, [isAdmin]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <SEO 
        title="حالة النظام - لوحة الإدارة"
        description="مراقبة حالة خدمات المنصة"
      />
      
      <div className="container mx-auto px-4 py-8" dir="rtl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            حالة النظام
          </h1>
          <p className="text-muted-foreground mt-2">
            مراقبة سلامة الخدمات والبنية التحتية للمنصة
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                العقود
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.contracts}</p>
              <p className="text-xs text-muted-foreground">نموذج عقد</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Brain className="h-4 w-4" />
                تحليلات الذكاء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.aiChats}</p>
              <p className="text-xs text-muted-foreground">تحليل قانوني</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                المدفوعات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.payments}</p>
              <p className="text-xs text-muted-foreground">عملية ناجحة</p>
            </CardContent>
          </Card>
        </div>

        {/* Live Service Monitor */}
        <LiveServiceMonitor />
      </div>
    </Layout>
  );
};

export default AdminSystemStatus;
