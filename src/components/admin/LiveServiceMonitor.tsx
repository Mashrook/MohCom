import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  Database, 
  Cloud, 
  CreditCard, 
  Video, 
  Mail, 
  Brain, 
  HardDrive,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  nameAr: string;
  status: 'online' | 'offline' | 'degraded' | 'checking';
  latency?: number;
  lastCheck: Date;
  icon: React.ReactNode;
  description: string;
}

const LiveServiceMonitor = () => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastFullCheck, setLastFullCheck] = useState<Date | null>(null);

  const initialServices: Omit<ServiceStatus, 'status' | 'latency' | 'lastCheck'>[] = [
    { name: 'database', nameAr: 'قاعدة البيانات', icon: <Database className="h-5 w-5" />, description: 'Supabase PostgreSQL' },
    { name: 'auth', nameAr: 'نظام المصادقة', icon: <Cloud className="h-5 w-5" />, description: 'Supabase Auth' },
    { name: 'storage', nameAr: 'التخزين', icon: <HardDrive className="h-5 w-5" />, description: 'Supabase Storage' },
    { name: 'ai', nameAr: 'الذكاء الاصطناعي', icon: <Brain className="h-5 w-5" />, description: 'Configured AI Provider' },
    { name: 'payment', nameAr: 'الدفع', icon: <CreditCard className="h-5 w-5" />, description: 'Moyasar Payments' },
    { name: 'video', nameAr: 'مكالمات الفيديو', icon: <Video className="h-5 w-5" />, description: 'Jitsi Meet' },
    { name: 'email', nameAr: 'البريد الإلكتروني', icon: <Mail className="h-5 w-5" />, description: 'Resend Email' },
  ];

  const checkDatabase = async (): Promise<{ status: 'online' | 'offline' | 'degraded'; latency: number }> => {
    const start = Date.now();
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const latency = Date.now() - start;
      if (error) return { status: 'degraded', latency };
      return { status: 'online', latency };
    } catch {
      return { status: 'offline', latency: Date.now() - start };
    }
  };

  const checkAuth = async (): Promise<{ status: 'online' | 'offline' | 'degraded'; latency: number }> => {
    const start = Date.now();
    try {
      const { error } = await supabase.auth.getSession();
      const latency = Date.now() - start;
      if (error) return { status: 'degraded', latency };
      return { status: 'online', latency };
    } catch {
      return { status: 'offline', latency: Date.now() - start };
    }
  };

  const checkStorage = async (): Promise<{ status: 'online' | 'offline' | 'degraded'; latency: number }> => {
    const start = Date.now();
    try {
      const { error } = await supabase.storage.listBuckets();
      const latency = Date.now() - start;
      if (error) return { status: 'degraded', latency };
      return { status: 'online', latency };
    } catch {
      return { status: 'offline', latency: Date.now() - start };
    }
  };

  const checkAI = async (): Promise<{ status: 'online' | 'offline' | 'degraded'; latency: number }> => {
    const start = Date.now();
    try {
      // Check if edge function responds
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-ai`, {
        method: 'OPTIONS',
        headers: { 'Content-Type': 'application/json' }
      });
      const latency = Date.now() - start;
      return { status: response.ok || response.status === 204 ? 'online' : 'degraded', latency };
    } catch {
      return { status: 'offline', latency: Date.now() - start };
    }
  };

  const checkPayment = async (): Promise<{ status: 'online' | 'offline' | 'degraded'; latency: number }> => {
    const start = Date.now();
    try {
      const response = await fetch('https://api.moyasar.com/v1/payments', {
        method: 'OPTIONS',
        mode: 'no-cors'
      });
      const latency = Date.now() - start;
      return { status: 'online', latency };
    } catch {
      return { status: 'degraded', latency: Date.now() - start };
    }
  };

  const checkVideo = async (): Promise<{ status: 'online' | 'offline' | 'degraded'; latency: number }> => {
    const start = Date.now();
    try {
      const response = await fetch('https://meet.jit.si', {
        method: 'HEAD',
        mode: 'no-cors'
      });
      const latency = Date.now() - start;
      return { status: 'online', latency };
    } catch {
      return { status: 'degraded', latency: Date.now() - start };
    }
  };

  const checkEmail = async (): Promise<{ status: 'online' | 'offline' | 'degraded'; latency: number }> => {
    const start = Date.now();
    try {
      // Check if send-reminder-email function exists
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reminder-email`, {
        method: 'OPTIONS'
      });
      const latency = Date.now() - start;
      return { status: response.ok || response.status === 204 ? 'online' : 'degraded', latency };
    } catch {
      return { status: 'offline', latency: Date.now() - start };
    }
  };

  const checkAllServices = useCallback(async () => {
    setIsChecking(true);
    
    // Initialize all services as checking
    setServices(initialServices.map(s => ({
      ...s,
      status: 'checking' as const,
      lastCheck: new Date()
    })));

    const checks = [
      { name: 'database', check: checkDatabase },
      { name: 'auth', check: checkAuth },
      { name: 'storage', check: checkStorage },
      { name: 'ai', check: checkAI },
      { name: 'payment', check: checkPayment },
      { name: 'video', check: checkVideo },
      { name: 'email', check: checkEmail },
    ];

    const results = await Promise.all(
      checks.map(async ({ name, check }) => {
        const result = await check();
        return { name, ...result };
      })
    );

    const updatedServices = initialServices.map(service => {
      const result = results.find(r => r.name === service.name);
      return {
        ...service,
        status: result?.status || 'offline' as const,
        latency: result?.latency,
        lastCheck: new Date()
      };
    });

    setServices(updatedServices);
    setLastFullCheck(new Date());
    setIsChecking(false);

    // Alert for offline services
    const offlineServices = updatedServices.filter(s => s.status === 'offline');
    if (offlineServices.length > 0) {
      toast({
        title: 'تنبيه: خدمات متوقفة',
        description: `الخدمات التالية غير متاحة: ${offlineServices.map(s => s.nameAr).join('، ')}`,
        variant: 'destructive'
      });
    }

    const degradedServices = updatedServices.filter(s => s.status === 'degraded');
    if (degradedServices.length > 0) {
      toast({
        title: 'تحذير: أداء منخفض',
        description: `الخدمات التالية تعاني من مشاكل: ${degradedServices.map(s => s.nameAr).join('، ')}`,
      });
    }
  }, []);

  // Check services on mount and every 60 seconds
  useEffect(() => {
    checkAllServices();
    const interval = setInterval(checkAllServices, 60000);
    return () => clearInterval(interval);
  }, [checkAllServices]);

  const getStatusBadge = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 ml-1" /> متصل</Badge>;
      case 'offline':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 ml-1" /> منقطع</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertTriangle className="h-3 w-3 ml-1" /> بطيء</Badge>;
      case 'checking':
        return <Badge variant="secondary"><Clock className="h-3 w-3 ml-1 animate-spin" /> جاري الفحص</Badge>;
    }
  };

  const getLatencyColor = (latency?: number) => {
    if (!latency) return 'text-muted-foreground';
    if (latency < 200) return 'text-green-400';
    if (latency < 500) return 'text-yellow-400';
    return 'text-red-400';
  };

  const onlineCount = services.filter(s => s.status === 'online').length;
  const totalCount = services.length;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            مراقبة الخدمات الحية
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {onlineCount}/{totalCount} خدمات متصلة
            {lastFullCheck && (
              <span className="mr-2">• آخر فحص: {lastFullCheck.toLocaleTimeString('ar-SA')}</span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkAllServices}
          disabled={isChecking}
        >
          <RefreshCw className={`h-4 w-4 ml-2 ${isChecking ? 'animate-spin' : ''}`} />
          فحص الآن
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {services.map((service) => (
            <div
              key={service.name}
              className={`p-4 rounded-lg border transition-all ${
                service.status === 'online' 
                  ? 'border-green-500/30 bg-green-500/5' 
                  : service.status === 'offline'
                  ? 'border-red-500/30 bg-red-500/5'
                  : service.status === 'degraded'
                  ? 'border-yellow-500/30 bg-yellow-500/5'
                  : 'border-border/50 bg-muted/20'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${
                    service.status === 'online' ? 'bg-green-500/20 text-green-400' :
                    service.status === 'offline' ? 'bg-red-500/20 text-red-400' :
                    service.status === 'degraded' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {service.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{service.nameAr}</h4>
                    <p className="text-xs text-muted-foreground">{service.description}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                {getStatusBadge(service.status)}
                {service.latency !== undefined && (
                  <span className={`text-xs ${getLatencyColor(service.latency)}`}>
                    {service.latency}ms
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Overall Status Summary */}
        <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${
                onlineCount === totalCount ? 'bg-green-500' :
                onlineCount > totalCount / 2 ? 'bg-yellow-500' : 'bg-red-500'
              } animate-pulse`} />
              <span className="text-sm font-medium">
                {onlineCount === totalCount 
                  ? 'جميع الخدمات تعمل بشكل طبيعي' 
                  : onlineCount > totalCount / 2
                  ? 'بعض الخدمات تواجه مشاكل'
                  : 'مشاكل خطيرة في النظام'}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" /> متصل
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500" /> بطيء
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" /> منقطع
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveServiceMonitor;
