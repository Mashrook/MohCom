import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Bell,
  User,
  Clock,
  RefreshCw,
  CreditCard,
  Mail,
  Ban,
  ShieldCheck
} from "lucide-react";
import { useSecurityAlerts, SecurityAlert, PaymentErrorAlert } from "@/hooks/useSecurityAlerts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SecurityAlertsPanelProps {
  showPaymentAlerts?: boolean;
}

const SecurityAlertsPanel: React.FC<SecurityAlertsPanelProps> = ({ showPaymentAlerts = true }) => {
  const { alerts, suspiciousActivities, paymentErrorAlerts, loading, acknowledgeAlert, getUnacknowledgedCount, refetch } = useSecurityAlerts();
  const [blockingUser, setBlockingUser] = useState<string | null>(null);

  const handleBlockUser = async (userId: string, userName?: string) => {
    setBlockingUser(userId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('blocked_payment_users')
        .insert({
          user_id: userId,
          blocked_by: user?.id,
          reason: `تم الحظر بسبب محاولات دفع فاشلة متكررة`
        });

      if (error) throw error;

      toast({
        title: "تم حظر المستخدم",
        description: `تم حظر ${userName || 'المستخدم'} من محاولات الدفع`,
      });
      refetch();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في حظر المستخدم",
        variant: "destructive"
      });
    } finally {
      setBlockingUser(null);
    }
  };

  const handleUnblockUser = async (userId: string, userName?: string) => {
    setBlockingUser(userId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('blocked_payment_users')
        .update({
          unblocked_at: new Date().toISOString(),
          unblocked_by: user?.id
        })
        .eq('user_id', userId)
        .is('unblocked_at', null);

      if (error) throw error;

      toast({
        title: "تم إلغاء الحظر",
        description: `تم إلغاء حظر ${userName || 'المستخدم'} من محاولات الدفع`,
      });
      refetch();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إلغاء حظر المستخدم",
        variant: "destructive"
      });
    } finally {
      setBlockingUser(null);
    }
  };

  const getSeverityColor = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSeverityIcon = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Bell className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unacknowledgedCount = getUnacknowledgedCount();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي التنبيهات</p>
                <p className="text-2xl font-bold">{alerts.length}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card className={unacknowledgedCount > 0 ? 'border-red-500' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">تنبيهات غير مقروءة</p>
                <p className="text-2xl font-bold text-red-500">{unacknowledgedCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">أنشطة مشبوهة</p>
                <p className="text-2xl font-bold text-orange-500">{suspiciousActivities.length}</p>
              </div>
              <Shield className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">تنبيهات حرجة</p>
                <p className="text-2xl font-bold text-red-600">
                  {alerts.filter(a => a.severity === 'critical').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Error Alerts */}
      {showPaymentAlerts && paymentErrorAlerts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-destructive" />
              تنبيهات أخطاء الدفع المتكررة
              <Badge variant="destructive" className="mr-2">
                {paymentErrorAlerts.length} مستخدم
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentErrorAlerts.map((alert) => (
                <div 
                  key={alert.userId}
                  className={`p-4 rounded-lg border space-y-3 ${
                    alert.isBlocked 
                      ? 'bg-muted/50 border-muted-foreground/30' 
                      : 'bg-destructive/10 border-destructive/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {alert.userName || 'مستخدم غير معروف'}
                      </span>
                      {alert.isBlocked && (
                        <Badge variant="secondary" className="gap-1">
                          <Ban className="h-3 w-3" />
                          محظور
                        </Badge>
                      )}
                    </div>
                    <Badge variant="destructive">
                      {alert.errorCount} خطأ
                    </Badge>
                  </div>

                  {alert.userEmail && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span dir="ltr">{alert.userEmail}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      آخر خطأ: {formatTime(alert.lastErrorAt)}
                    </span>
                  </div>

                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">الأخطاء الأخيرة:</p>
                    <div className="space-y-1">
                      {alert.recentErrors.slice(0, 3).map((err, idx) => (
                        <p key={idx} className="text-xs bg-background/50 p-2 rounded truncate">
                          {err}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50">
                    {alert.isBlocked ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnblockUser(alert.userId, alert.userName)}
                        disabled={blockingUser === alert.userId}
                        className="gap-2"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        إلغاء الحظر
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleBlockUser(alert.userId, alert.userName)}
                        disabled={blockingUser === alert.userId}
                        className="gap-2"
                      >
                        <Ban className="h-4 w-4" />
                        حظر من الدفع
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suspicious Activities */}
      {suspiciousActivities.length > 0 && (
        <Card className="border-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              أنشطة مشبوهة مكتشفة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suspiciousActivities.map((activity) => (
                <div 
                  key={activity.id}
                  className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium">
                        {activity.attemptCount} محاولة فاشلة
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.activityType}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <Badge variant={activity.blocked ? "destructive" : "outline"}>
                      {activity.blocked ? 'محظور' : 'مراقب'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(activity.lastAttempt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts List */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">سجل التنبيهات الأمنية</CardTitle>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد تنبيهات أمنية</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div 
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.acknowledged ? 'opacity-60' : ''
                    } ${
                      alert.severity === 'critical' ? 'border-red-500 bg-red-500/5' :
                      alert.severity === 'high' ? 'border-orange-500 bg-orange-500/5' :
                      'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {getSeverityIcon(alert.severity)}
                        </Badge>
                        <div>
                          <h4 className="font-medium text-sm">{alert.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {alert.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTime(alert.timestamp)}
                          </div>
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityAlertsPanel;
