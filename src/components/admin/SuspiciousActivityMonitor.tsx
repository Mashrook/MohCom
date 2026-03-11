/**
 * Suspicious Activity Monitor Component
 * مكون مراقبة الأنشطة المشبوهة
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shield, 
  AlertTriangle, 
  RefreshCw, 
  Clock,
  ShieldAlert,
  ShieldX,
  Zap,
  Eye
} from 'lucide-react';
import { useSuspiciousActivityDetector, SuspiciousPattern } from '@/hooks/useSuspiciousActivityDetector';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const getPatternIcon = (type: SuspiciousPattern['type']) => {
  switch (type) {
    case 'brute_force':
      return <ShieldX className="h-4 w-4" />;
    case 'account_takeover':
      return <ShieldAlert className="h-4 w-4" />;
    case 'password_spray':
      return <Zap className="h-4 w-4" />;
    case 'rapid_requests':
      return <RefreshCw className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
};

const getSeverityColor = (severity: SuspiciousPattern['severity']) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default:
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }
};

const getSeverityLabel = (severity: SuspiciousPattern['severity']) => {
  switch (severity) {
    case 'critical':
      return 'حرج';
    case 'high':
      return 'عالي';
    case 'medium':
      return 'متوسط';
    default:
      return 'منخفض';
  }
};

const getTypeLabel = (type: SuspiciousPattern['type']) => {
  switch (type) {
    case 'brute_force':
      return 'هجوم Brute Force';
    case 'account_takeover':
      return 'استيلاء على حساب';
    case 'password_spray':
      return 'هجوم Password Spray';
    case 'rapid_requests':
      return 'طلبات سريعة مشبوهة';
    case 'unusual_location':
      return 'موقع غير معتاد';
    case 'session_hijack':
      return 'اختطاف جلسة';
    default:
      return 'نشاط مشبوه';
  }
};

export const SuspiciousActivityMonitor: React.FC = () => {
  const { 
    patterns, 
    isDetecting, 
    lastScan, 
    runDetection,
    getCriticalCount,
    getHighCount 
  } = useSuspiciousActivityDetector();

  const criticalCount = getCriticalCount();
  const highCount = getHighCount();

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">كشف الأنشطة المشبوهة</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {criticalCount} تهديد حرج
              </Badge>
            )}
            {highCount > 0 && (
              <Badge variant="outline" className="border-orange-500/50 text-orange-400">
                {highCount} تهديد عالي
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => runDetection()}
              disabled={isDetecting}
              className="gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isDetecting ? 'animate-spin' : ''}`} />
              فحص
            </Button>
          </div>
        </div>
        <CardDescription className="flex items-center gap-2 text-xs">
          <Clock className="h-3 w-3" />
          آخر فحص: {lastScan ? format(lastScan, 'HH:mm:ss', { locale: ar }) : 'لم يتم'}
          <span className="text-muted-foreground">• الفحص التلقائي كل 30 ثانية</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {patterns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد أنشطة مشبوهة حالياً</p>
            <p className="text-xs mt-1">النظام يراقب باستمرار</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className={`p-3 rounded-lg border ${getSeverityColor(pattern.severity)} transition-all hover:scale-[1.01]`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getPatternIcon(pattern.type)}
                      <span className="font-medium text-sm">{pattern.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {getTypeLabel(pattern.type)}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] ${getSeverityColor(pattern.severity)}`}
                      >
                        {getSeverityLabel(pattern.severity)}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    {pattern.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-3">
                      {pattern.sourceIp && (
                        <span>IP: {pattern.sourceIp}</span>
                      )}
                      {pattern.userEmail && (
                        <span>البريد: {pattern.userEmail}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {pattern.autoBlocked && (
                        <Badge variant="destructive" className="text-[10px]">
                          محظور تلقائياً
                        </Badge>
                      )}
                      <span>
                        {format(new Date(pattern.timestamp), 'dd/MM HH:mm', { locale: ar })}
                      </span>
                    </div>
                  </div>

                  {pattern.metadata && Object.keys(pattern.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        تفاصيل إضافية
                      </summary>
                      <pre className="text-[10px] mt-1 p-2 bg-background/50 rounded overflow-auto max-h-24">
                        {JSON.stringify(pattern.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default SuspiciousActivityMonitor;
