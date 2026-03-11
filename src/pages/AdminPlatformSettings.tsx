import { useState, useEffect } from "react";
import { useIOSAppMode } from "@/hooks/useIOSAppMode";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Key,
  Brain,
  Database,
  Video,
  Bell,
  BarChart3,
  Shield,
  Save,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wifi,
  Phone,
  MessageSquare,
  Mail,
  Globe,
  Server,
  Cpu,
  HardDrive,
  Cloud,
  Link2,
  Zap,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Activity,
  Smartphone
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface PlatformSetting {
  id: string;
  setting_key: string;
  setting_value: boolean;
  setting_value_int: number | null;
  updated_at: string;
}

interface IntegrationStatus {
  name: string;
  key: string;
  status: 'active' | 'inactive' | 'error';
  description: string;
  icon: React.ReactNode;
}

const AdminPlatformSettings = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isIOSAppModeEnabled, toggleIOSAppMode } = useIOSAppMode();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  
  // Integration Settings State
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  
  // AI Settings
  const [aiSettings, setAiSettings] = useState({
    model: 'google/gemini-2.5-flash',
    maxTokens: 4096,
    temperature: 0.7,
    enabled: true,
    streamingEnabled: true,
    rateLimitPerMinute: 60
  });
  
  // Storage Settings
  const [storageSettings, setStorageSettings] = useState({
    maxFileSize: 50, // MB
    allowedFileTypes: 'pdf,doc,docx,jpg,png,mp4',
    publicBucket: true,
    compressionEnabled: true,
    compressionQuality: 'medium'
  });
  
  // Communication Settings
  const [communicationSettings, setCommunicationSettings] = useState({
    videoCallsEnabled: true,
    voiceCallsEnabled: true,
    chatEnabled: true,
    maxCallDuration: 60, // minutes
    recordCalls: false,
    jitsiEnabled: true
  });
  
  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    subscriptionReminders: true,
    reminderDaysBefore: 3,
    marketingEmails: false,
    securityAlerts: true
  });
  
  // Analytics Settings
  const [analyticsSettings, setAnalyticsSettings] = useState({
    googleAnalyticsEnabled: true,
    trackUserBehavior: true,
    trackPageViews: true,
    trackEvents: true,
    dataRetentionDays: 365,
    anonymizeIp: true
  });

  // Integration statuses
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([
    { name: 'AI Provider Gateway', key: 'AI_API_KEY', status: 'active', description: 'نماذج الذكاء الاصطناعي عبر API Keys', icon: <Brain className="w-5 h-5" /> },
    { name: 'Tap Payments', key: 'TAP_SECRET_KEY', status: 'active', description: 'بوابة الدفع الإلكتروني', icon: <Key className="w-5 h-5" /> },
    { name: 'Jitsi Meet', key: 'JITSI_APP_ID', status: 'active', description: 'مكالمات الفيديو والصوت', icon: <Video className="w-5 h-5" /> },
    { name: 'Resend Email', key: 'RESEND_API_KEY', status: 'active', description: 'إرسال البريد الإلكتروني', icon: <Mail className="w-5 h-5" /> },
    { name: 'Perplexity Search', key: 'PERPLEXITY_API_KEY', status: 'active', description: 'البحث القانوني المتقدم', icon: <Globe className="w-5 h-5" /> },
  ]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية الوصول لهذه الصفحة",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin, authLoading, navigate]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_security_settings")
        .select("*");

      if (error) throw error;
      setSettings(data || []);
      
      // Load communication settings from section_settings
      const { data: sectionData } = await supabase
        .from("section_settings")
        .select("*")
        .in("section_key", ['voice_calls', 'video_calls', 'chat_messages']);
      
      if (sectionData) {
        const voiceCalls = sectionData.find(s => s.section_key === 'voice_calls');
        const videoCalls = sectionData.find(s => s.section_key === 'video_calls');
        const chat = sectionData.find(s => s.section_key === 'chat_messages');
        
        setCommunicationSettings(prev => ({
          ...prev,
          voiceCallsEnabled: voiceCalls?.is_enabled ?? true,
          videoCallsEnabled: videoCalls?.is_enabled ?? true,
          chatEnabled: chat?.is_enabled ?? true
        }));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({ title: "خطأ", description: "فشل في تحميل الإعدادات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveAiSettings = async () => {
    setSaving(true);
    try {
      // Save AI settings to admin_security_settings
      const settingsToSave = [
        { setting_key: 'ai_enabled', setting_value: aiSettings.enabled, setting_value_int: null },
        { setting_key: 'ai_streaming_enabled', setting_value: aiSettings.streamingEnabled, setting_value_int: null },
        { setting_key: 'ai_rate_limit', setting_value: true, setting_value_int: aiSettings.rateLimitPerMinute },
        { setting_key: 'ai_max_tokens', setting_value: true, setting_value_int: aiSettings.maxTokens },
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from("admin_security_settings")
          .upsert({
            setting_key: setting.setting_key,
            setting_value: setting.setting_value,
            setting_value_int: setting.setting_value_int,
            updated_by: user?.id
          }, { onConflict: 'setting_key' });
        
        if (error) throw error;
      }
      
      toast({ title: "تم الحفظ", description: "تم حفظ إعدادات الذكاء الاصطناعي بنجاح" });
    } catch (error) {
      console.error("Error saving AI settings:", error);
      toast({ title: "خطأ", description: "فشل في حفظ الإعدادات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveCommunicationSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { section_key: 'voice_calls', is_enabled: communicationSettings.voiceCallsEnabled },
        { section_key: 'video_calls', is_enabled: communicationSettings.videoCallsEnabled },
        { section_key: 'chat_messages', is_enabled: communicationSettings.chatEnabled },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("section_settings")
          .update({ is_enabled: update.is_enabled })
          .eq("section_key", update.section_key);
        
        if (error) throw error;
      }
      
      // Save other communication settings
      const settingsToSave = [
        { setting_key: 'max_call_duration', setting_value: true, setting_value_int: communicationSettings.maxCallDuration },
        { setting_key: 'record_calls', setting_value: communicationSettings.recordCalls, setting_value_int: null },
        { setting_key: 'jitsi_enabled', setting_value: communicationSettings.jitsiEnabled, setting_value_int: null },
      ];

      for (const setting of settingsToSave) {
        await supabase
          .from("admin_security_settings")
          .upsert({
            setting_key: setting.setting_key,
            setting_value: setting.setting_value,
            setting_value_int: setting.setting_value_int,
            updated_by: user?.id
          }, { onConflict: 'setting_key' });
      }
      
      toast({ title: "تم الحفظ", description: "تم حفظ إعدادات الاتصالات بنجاح" });
    } catch (error) {
      console.error("Error saving communication settings:", error);
      toast({ title: "خطأ", description: "فشل في حفظ الإعدادات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = [
        { setting_key: 'email_notifications', setting_value: notificationSettings.emailNotifications, setting_value_int: null },
        { setting_key: 'push_notifications', setting_value: notificationSettings.pushNotifications, setting_value_int: null },
        { setting_key: 'sms_notifications', setting_value: notificationSettings.smsNotifications, setting_value_int: null },
        { setting_key: 'subscription_reminders', setting_value: notificationSettings.subscriptionReminders, setting_value_int: null },
        { setting_key: 'reminder_days_before', setting_value: true, setting_value_int: notificationSettings.reminderDaysBefore },
        { setting_key: 'marketing_emails', setting_value: notificationSettings.marketingEmails, setting_value_int: null },
        { setting_key: 'security_alerts', setting_value: notificationSettings.securityAlerts, setting_value_int: null },
      ];

      for (const setting of settingsToSave) {
        await supabase
          .from("admin_security_settings")
          .upsert({
            setting_key: setting.setting_key,
            setting_value: setting.setting_value,
            setting_value_int: setting.setting_value_int,
            updated_by: user?.id
          }, { onConflict: 'setting_key' });
      }
      
      toast({ title: "تم الحفظ", description: "تم حفظ إعدادات الإشعارات بنجاح" });
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast({ title: "خطأ", description: "فشل في حفظ الإعدادات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveStorageSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = [
        { setting_key: 'max_file_size', setting_value: true, setting_value_int: storageSettings.maxFileSize },
        { setting_key: 'compression_enabled', setting_value: storageSettings.compressionEnabled, setting_value_int: null },
        { setting_key: 'public_bucket', setting_value: storageSettings.publicBucket, setting_value_int: null },
      ];

      for (const setting of settingsToSave) {
        await supabase
          .from("admin_security_settings")
          .upsert({
            setting_key: setting.setting_key,
            setting_value: setting.setting_value,
            setting_value_int: setting.setting_value_int,
            updated_by: user?.id
          }, { onConflict: 'setting_key' });
      }
      
      toast({ title: "تم الحفظ", description: "تم حفظ إعدادات التخزين بنجاح" });
    } catch (error) {
      console.error("Error saving storage settings:", error);
      toast({ title: "خطأ", description: "فشل في حفظ الإعدادات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveAnalyticsSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = [
        { setting_key: 'google_analytics_enabled', setting_value: analyticsSettings.googleAnalyticsEnabled, setting_value_int: null },
        { setting_key: 'track_user_behavior', setting_value: analyticsSettings.trackUserBehavior, setting_value_int: null },
        { setting_key: 'track_page_views', setting_value: analyticsSettings.trackPageViews, setting_value_int: null },
        { setting_key: 'track_events', setting_value: analyticsSettings.trackEvents, setting_value_int: null },
        { setting_key: 'data_retention_days', setting_value: true, setting_value_int: analyticsSettings.dataRetentionDays },
        { setting_key: 'anonymize_ip', setting_value: analyticsSettings.anonymizeIp, setting_value_int: null },
      ];

      for (const setting of settingsToSave) {
        await supabase
          .from("admin_security_settings")
          .upsert({
            setting_key: setting.setting_key,
            setting_value: setting.setting_value,
            setting_value_int: setting.setting_value_int,
            updated_by: user?.id
          }, { onConflict: 'setting_key' });
      }
      
      toast({ title: "تم الحفظ", description: "تم حفظ إعدادات الإحصائيات بنجاح" });
    } catch (error) {
      console.error("Error saving analytics settings:", error);
      toast({ title: "خطأ", description: "فشل في حفظ الإعدادات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">نشط</Badge>;
      case 'inactive':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">غير نشط</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">خطأ</Badge>;
      default:
        return null;
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-golden" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-golden mb-2">إعدادات المنصة الشاملة</h1>
          <p className="text-muted-foreground">تحكم كامل في جميع أدوات وخدمات المنصة</p>
        </div>

        <Tabs defaultValue="integrations" className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-6 gap-2 h-auto p-2 bg-navy-800/50">
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              <span className="hidden md:inline">التكاملات</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span className="hidden md:inline">الذكاء الاصطناعي</span>
            </TabsTrigger>
            <TabsTrigger value="storage" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span className="hidden md:inline">التخزين</span>
            </TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              <span className="hidden md:inline">الاتصالات</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden md:inline">الإشعارات</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden md:inline">الإحصائيات</span>
            </TabsTrigger>
          </TabsList>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <div className="grid gap-6">
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden flex items-center gap-2">
                    <Link2 className="w-5 h-5" />
                    التكاملات والخدمات الخارجية
                  </CardTitle>
                  <CardDescription>
                    إدارة مفاتيح API والتكاملات مع الخدمات الخارجية
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrations.map((integration, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg bg-background border border-border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-golden/10 text-golden">
                          {integration.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{integration.name}</p>
                            {getStatusBadge(integration.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{integration.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            المفتاح: {integration.key}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-400">ملاحظة أمنية</p>
                        <p className="text-sm text-muted-foreground">
                          مفاتيح API مخزنة بشكل آمن ومشفرة. لتحديث أي مفتاح، يرجى التواصل مع فريق الدعم التقني.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    حالة النظام
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                      <Server className="w-6 h-6 mx-auto mb-2 text-green-400" />
                      <p className="text-sm font-medium text-green-400">الخادم</p>
                      <p className="text-xs text-muted-foreground">يعمل بشكل طبيعي</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                      <Database className="w-6 h-6 mx-auto mb-2 text-green-400" />
                      <p className="text-sm font-medium text-green-400">قاعدة البيانات</p>
                      <p className="text-xs text-muted-foreground">متصلة</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                      <Cloud className="w-6 h-6 mx-auto mb-2 text-green-400" />
                      <p className="text-sm font-medium text-green-400">التخزين السحابي</p>
                      <p className="text-xs text-muted-foreground">متاح</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                      <Zap className="w-6 h-6 mx-auto mb-2 text-green-400" />
                      <p className="text-sm font-medium text-green-400">Edge Functions</p>
                      <p className="text-xs text-muted-foreground">تعمل</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* iOS App Mode Toggle */}
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="text-golden flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    وضع تطبيق iOS
                  </CardTitle>
                  <CardDescription>
                    التحكم في إخفاء عناصر الدفع والاشتراك داخل تطبيق iOS للامتثال لمتطلبات Apple App Store
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">تفعيل وضع iOS App Mode</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        عند التفعيل، يتم إخفاء روابط الدفع والاشتراك تلقائياً عندما يفتح المستخدم التطبيق من iOS WebView
                      </p>
                    </div>
                    <Switch
                      checked={isIOSAppModeEnabled}
                      onCheckedChange={async (checked) => {
                        const success = await toggleIOSAppMode(checked);
                        if (success) {
                          toast({
                            title: checked ? "تم التفعيل" : "تم الإيقاف",
                            description: checked 
                              ? "سيتم إخفاء عناصر الدفع في تطبيق iOS" 
                              : "سيتم عرض جميع عناصر الدفع حتى في تطبيق iOS",
                          });
                        } else {
                          toast({ title: "خطأ", description: "فشل في تحديث الإعداد", variant: "destructive" });
                        }
                      }}
                    />
                  </div>
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-400">تنبيه مهم</p>
                        <p className="text-sm text-muted-foreground">
                          إيقاف هذا الوضع قد يؤدي إلى رفض التطبيق من Apple App Store. يُنصح بإبقائه مفعلاً دائماً.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Settings Tab */}
          <TabsContent value="ai">
            <Card className="glass-card border-golden/20">
              <CardHeader>
                <CardTitle className="text-golden flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  إعدادات الذكاء الاصطناعي
                </CardTitle>
                <CardDescription>
                  تحكم في نماذج الذكاء الاصطناعي وإعداداتها
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-golden" />
                    <div>
                      <p className="font-medium">تفعيل الذكاء الاصطناعي</p>
                      <p className="text-sm text-muted-foreground">تشغيل/إيقاف جميع خدمات الذكاء الاصطناعي</p>
                    </div>
                  </div>
                  <Switch
                    checked={aiSettings.enabled}
                    onCheckedChange={(checked) => setAiSettings({ ...aiSettings, enabled: checked })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>نموذج الذكاء الاصطناعي</Label>
                    <Select
                      value={aiSettings.model}
                      onValueChange={(value) => setAiSettings({ ...aiSettings, model: value })}
                    >
                      <SelectTrigger className="bg-background border-border mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (سريع)</SelectItem>
                        <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (متقدم)</SelectItem>
                        <SelectItem value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (اقتصادي)</SelectItem>
                        <SelectItem value="openai/gpt-5">GPT-5 (الأقوى)</SelectItem>
                        <SelectItem value="openai/gpt-5-mini">GPT-5 Mini (متوازن)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>الحد الأقصى للرموز</Label>
                    <Input
                      type="number"
                      value={aiSettings.maxTokens}
                      onChange={(e) => setAiSettings({ ...aiSettings, maxTokens: parseInt(e.target.value) || 4096 })}
                      className="bg-background border-border mt-2"
                    />
                  </div>

                  <div>
                    <Label>معدل الحد من الطلبات (بالدقيقة)</Label>
                    <Input
                      type="number"
                      value={aiSettings.rateLimitPerMinute}
                      onChange={(e) => setAiSettings({ ...aiSettings, rateLimitPerMinute: parseInt(e.target.value) || 60 })}
                      className="bg-background border-border mt-2"
                    />
                  </div>

                  <div>
                    <Label>درجة الحرارة (Temperature)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={aiSettings.temperature}
                      onChange={(e) => setAiSettings({ ...aiSettings, temperature: parseFloat(e.target.value) || 0.7 })}
                      className="bg-background border-border mt-2"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-golden" />
                    <div>
                      <p className="font-medium">البث المباشر (Streaming)</p>
                      <p className="text-sm text-muted-foreground">عرض الردود أثناء الكتابة</p>
                    </div>
                  </div>
                  <Switch
                    checked={aiSettings.streamingEnabled}
                    onCheckedChange={(checked) => setAiSettings({ ...aiSettings, streamingEnabled: checked })}
                  />
                </div>

                <Button onClick={saveAiSettings} disabled={saving} className="bg-golden hover:bg-golden/90">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ إعدادات الذكاء الاصطناعي
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Storage Tab */}
          <TabsContent value="storage">
            <Card className="glass-card border-golden/20">
              <CardHeader>
                <CardTitle className="text-golden flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  إعدادات التخزين
                </CardTitle>
                <CardDescription>
                  إدارة التخزين والملفات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>الحد الأقصى لحجم الملف (MB)</Label>
                    <Input
                      type="number"
                      value={storageSettings.maxFileSize}
                      onChange={(e) => setStorageSettings({ ...storageSettings, maxFileSize: parseInt(e.target.value) || 50 })}
                      className="bg-background border-border mt-2"
                    />
                  </div>

                  <div>
                    <Label>أنواع الملفات المسموحة</Label>
                    <Input
                      value={storageSettings.allowedFileTypes}
                      onChange={(e) => setStorageSettings({ ...storageSettings, allowedFileTypes: e.target.value })}
                      className="bg-background border-border mt-2"
                      placeholder="pdf,doc,docx,jpg,png"
                    />
                  </div>

                  <div>
                    <Label>جودة الضغط</Label>
                    <Select
                      value={storageSettings.compressionQuality}
                      onValueChange={(value) => setStorageSettings({ ...storageSettings, compressionQuality: value })}
                    >
                      <SelectTrigger className="bg-background border-border mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">منخفضة (أصغر حجم)</SelectItem>
                        <SelectItem value="medium">متوسطة (متوازن)</SelectItem>
                        <SelectItem value="high">عالية (أفضل جودة)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <HardDrive className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">ضغط الملفات تلقائياً</p>
                        <p className="text-sm text-muted-foreground">ضغط الصور والفيديو قبل الرفع</p>
                      </div>
                    </div>
                    <Switch
                      checked={storageSettings.compressionEnabled}
                      onCheckedChange={(checked) => setStorageSettings({ ...storageSettings, compressionEnabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">الملفات العامة</p>
                        <p className="text-sm text-muted-foreground">السماح بالوصول العام للملفات المرفوعة</p>
                      </div>
                    </div>
                    <Switch
                      checked={storageSettings.publicBucket}
                      onCheckedChange={(checked) => setStorageSettings({ ...storageSettings, publicBucket: checked })}
                    />
                  </div>
                </div>

                <Button onClick={saveStorageSettings} disabled={saving} className="bg-golden hover:bg-golden/90">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ إعدادات التخزين
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication">
            <Card className="glass-card border-golden/20">
              <CardHeader>
                <CardTitle className="text-golden flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  إعدادات الاتصالات
                </CardTitle>
                <CardDescription>
                  إدارة مكالمات الفيديو والصوت والدردشة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">مكالمات الفيديو</p>
                        <p className="text-sm text-muted-foreground">تفعيل مكالمات الفيديو بين المحامين والمشتركين</p>
                      </div>
                    </div>
                    <Switch
                      checked={communicationSettings.videoCallsEnabled}
                      onCheckedChange={(checked) => setCommunicationSettings({ ...communicationSettings, videoCallsEnabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">المكالمات الصوتية</p>
                        <p className="text-sm text-muted-foreground">تفعيل المكالمات الصوتية</p>
                      </div>
                    </div>
                    <Switch
                      checked={communicationSettings.voiceCallsEnabled}
                      onCheckedChange={(checked) => setCommunicationSettings({ ...communicationSettings, voiceCallsEnabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">الدردشة النصية</p>
                        <p className="text-sm text-muted-foreground">تفعيل الرسائل النصية</p>
                      </div>
                    </div>
                    <Switch
                      checked={communicationSettings.chatEnabled}
                      onCheckedChange={(checked) => setCommunicationSettings({ ...communicationSettings, chatEnabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <Wifi className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">Jitsi Meet</p>
                        <p className="text-sm text-muted-foreground">استخدام Jitsi لمكالمات الفيديو</p>
                      </div>
                    </div>
                    <Switch
                      checked={communicationSettings.jitsiEnabled}
                      onCheckedChange={(checked) => setCommunicationSettings({ ...communicationSettings, jitsiEnabled: checked })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>الحد الأقصى لمدة المكالمة (دقيقة)</Label>
                    <Input
                      type="number"
                      value={communicationSettings.maxCallDuration}
                      onChange={(e) => setCommunicationSettings({ ...communicationSettings, maxCallDuration: parseInt(e.target.value) || 60 })}
                      className="bg-background border-border mt-2"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">تسجيل المكالمات</p>
                      <p className="text-sm text-muted-foreground">تسجيل المكالمات لأغراض الجودة (يتطلب موافقة المستخدم)</p>
                    </div>
                  </div>
                  <Switch
                    checked={communicationSettings.recordCalls}
                    onCheckedChange={(checked) => setCommunicationSettings({ ...communicationSettings, recordCalls: checked })}
                  />
                </div>

                <Button onClick={saveCommunicationSettings} disabled={saving} className="bg-golden hover:bg-golden/90">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ إعدادات الاتصالات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="glass-card border-golden/20">
              <CardHeader>
                <CardTitle className="text-golden flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  إعدادات الإشعارات
                </CardTitle>
                <CardDescription>
                  تحكم في جميع أنواع الإشعارات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">إشعارات البريد الإلكتروني</p>
                        <p className="text-sm text-muted-foreground">إرسال إشعارات عبر البريد الإلكتروني</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailNotifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">الإشعارات الفورية (Push)</p>
                        <p className="text-sm text-muted-foreground">إرسال إشعارات فورية للمستخدمين</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.pushNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, pushNotifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">إشعارات SMS</p>
                        <p className="text-sm text-muted-foreground">إرسال رسائل نصية قصيرة</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.smsNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, smsNotifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">تذكيرات تجديد الاشتراك</p>
                        <p className="text-sm text-muted-foreground">إرسال تذكيرات قبل انتهاء الاشتراك</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.subscriptionReminders}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, subscriptionReminders: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">التنبيهات الأمنية</p>
                        <p className="text-sm text-muted-foreground">إشعارات عند اكتشاف نشاط مشبوه</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.securityAlerts}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, securityAlerts: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">رسائل تسويقية</p>
                        <p className="text-sm text-muted-foreground">إرسال عروض ومستجدات المنصة</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.marketingEmails}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, marketingEmails: checked })}
                    />
                  </div>
                </div>

                <div>
                  <Label>أيام التذكير قبل انتهاء الاشتراك</Label>
                  <Input
                    type="number"
                    value={notificationSettings.reminderDaysBefore}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, reminderDaysBefore: parseInt(e.target.value) || 3 })}
                    className="bg-background border-border mt-2 max-w-xs"
                  />
                </div>

                <Button onClick={saveNotificationSettings} disabled={saving} className="bg-golden hover:bg-golden/90">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ إعدادات الإشعارات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card className="glass-card border-golden/20">
              <CardHeader>
                <CardTitle className="text-golden flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  إعدادات الإحصائيات والتحليلات
                </CardTitle>
                <CardDescription>
                  تحكم في جمع البيانات والتحليلات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">Google Analytics</p>
                        <p className="text-sm text-muted-foreground">تفعيل تتبع Google Analytics</p>
                      </div>
                    </div>
                    <Switch
                      checked={analyticsSettings.googleAnalyticsEnabled}
                      onCheckedChange={(checked) => setAnalyticsSettings({ ...analyticsSettings, googleAnalyticsEnabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">تتبع سلوك المستخدم</p>
                        <p className="text-sm text-muted-foreground">تسجيل تفاعلات المستخدمين مع المنصة</p>
                      </div>
                    </div>
                    <Switch
                      checked={analyticsSettings.trackUserBehavior}
                      onCheckedChange={(checked) => setAnalyticsSettings({ ...analyticsSettings, trackUserBehavior: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <Eye className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">تتبع مشاهدات الصفحات</p>
                        <p className="text-sm text-muted-foreground">تسجيل زيارات الصفحات</p>
                      </div>
                    </div>
                    <Switch
                      checked={analyticsSettings.trackPageViews}
                      onCheckedChange={(checked) => setAnalyticsSettings({ ...analyticsSettings, trackPageViews: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">تتبع الأحداث</p>
                        <p className="text-sm text-muted-foreground">تسجيل النقرات والتفاعلات</p>
                      </div>
                    </div>
                    <Switch
                      checked={analyticsSettings.trackEvents}
                      onCheckedChange={(checked) => setAnalyticsSettings({ ...analyticsSettings, trackEvents: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-golden" />
                      <div>
                        <p className="font-medium">إخفاء عنوان IP</p>
                        <p className="text-sm text-muted-foreground">إخفاء هوية عناوين IP للخصوصية</p>
                      </div>
                    </div>
                    <Switch
                      checked={analyticsSettings.anonymizeIp}
                      onCheckedChange={(checked) => setAnalyticsSettings({ ...analyticsSettings, anonymizeIp: checked })}
                    />
                  </div>
                </div>

                <div>
                  <Label>مدة الاحتفاظ بالبيانات (أيام)</Label>
                  <Input
                    type="number"
                    value={analyticsSettings.dataRetentionDays}
                    onChange={(e) => setAnalyticsSettings({ ...analyticsSettings, dataRetentionDays: parseInt(e.target.value) || 365 })}
                    className="bg-background border-border mt-2 max-w-xs"
                  />
                </div>

                <Button onClick={saveAnalyticsSettings} disabled={saving} className="bg-golden hover:bg-golden/90">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ إعدادات الإحصائيات
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminPlatformSettings;
