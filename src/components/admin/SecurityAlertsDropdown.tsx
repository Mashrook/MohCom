/**
 * Security Alerts Dropdown for Admin Navbar
 * قائمة منسدلة لإشعارات الأمان للمسؤولين
 */

import { useState } from 'react';
import { Bell, Shield, AlertTriangle, Ban, Key, Activity, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAdminSecurityAlerts, SecurityAlert } from '@/hooks/useAdminSecurityAlerts';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const getAlertIcon = (type: SecurityAlert['type']) => {
  switch (type) {
    case 'brute_force':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'ip_blocked':
      return <Ban className="h-4 w-4 text-orange-500" />;
    case 'leaked_password':
      return <Key className="h-4 w-4 text-yellow-500" />;
    case 'security_incident':
      return <Shield className="h-4 w-4 text-red-500" />;
    case 'suspicious_activity':
      return <Activity className="h-4 w-4 text-purple-500" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getSeverityColor = (severity: SecurityAlert['severity']) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-500/20 border-red-500/50 text-red-500';
    case 'high':
      return 'bg-orange-500/20 border-orange-500/50 text-orange-500';
    case 'medium':
      return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500';
    case 'low':
      return 'bg-blue-500/20 border-blue-500/50 text-blue-500';
    default:
      return 'bg-muted';
  }
};

const SecurityAlertsDropdown = () => {
  const { alerts, unreadCount, markAsRead, markAllAsRead, clearAlerts } = useAdminSecurityAlerts();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-golden" />
            <span className="font-semibold">تنبيهات الأمان</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} جديد
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="h-7 text-xs"
              >
                <Check className="h-3 w-3 ml-1" />
                قراءة الكل
              </Button>
            )}
            {alerts.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAlerts}
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="h-10 w-10 mb-3 text-green-500" />
              <p className="text-sm">لا توجد تنبيهات أمنية</p>
              <p className="text-xs">النظام آمن حالياً</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => markAsRead(alert.id)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50",
                    !alert.isRead && "bg-muted/30 border-primary/20",
                    alert.isRead && "opacity-70"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-full border",
                      getSeverityColor(alert.severity)
                    )}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          !alert.isRead && "font-semibold"
                        )}>
                          {alert.title}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={cn("text-[10px] shrink-0", getSeverityColor(alert.severity))}
                        >
                          {alert.severity === 'critical' ? 'حرج' :
                           alert.severity === 'high' ? 'عالي' :
                           alert.severity === 'medium' ? 'متوسط' : 'منخفض'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {alert.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: ar })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {alerts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs"
                onClick={() => {
                  setIsOpen(false);
                  // Could navigate to full security dashboard
                }}
              >
                عرض جميع الأحداث الأمنية
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SecurityAlertsDropdown;
