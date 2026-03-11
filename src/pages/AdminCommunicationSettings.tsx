import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Video, 
  Phone, 
  MessageSquare, 
  Loader2,
  Settings,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";

interface CommunicationSetting {
  id: string;
  section_key: string;
  section_name: string;
  is_enabled: boolean;
}

const AdminCommunicationSettings = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<CommunicationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const communicationKeys = ['voice_calls', 'video_calls', 'chat_messages'];

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("section_settings")
        .select("id, section_key, section_name, is_enabled")
        .in("section_key", communicationKeys);

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "خطأ",
        description: "فشل في جلب الإعدادات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleToggle = async (settingKey: string, currentValue: boolean) => {
    setSaving(settingKey);
    try {
      const { error } = await supabase
        .from("section_settings")
        .update({ is_enabled: !currentValue })
        .eq("section_key", settingKey);

      if (error) throw error;

      setSettings(settings.map(s => 
        s.section_key === settingKey ? { ...s, is_enabled: !currentValue } : s
      ));

      toast({
        title: "تم الحفظ",
        description: `تم ${!currentValue ? 'تفعيل' : 'تعطيل'} الخدمة بنجاح`,
      });
    } catch (error) {
      console.error("Error updating setting:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث الإعداد",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const getSettingConfig = (key: string) => {
    switch (key) {
      case 'voice_calls':
        return {
          icon: Phone,
          title: "المكالمات الصوتية",
          description: "تمكين المستخدمين من إجراء مكالمات صوتية مع المحامين",
          color: "text-green-400",
          bgColor: "bg-green-500/10",
        };
      case 'video_calls':
        return {
          icon: Video,
          title: "مكالمات الفيديو",
          description: "تمكين المستخدمين من إجراء مكالمات فيديو مع المحامين",
          color: "text-blue-400",
          bgColor: "bg-blue-500/10",
        };
      case 'chat_messages':
        return {
          icon: MessageSquare,
          title: "الدردشة النصية",
          description: "تمكين المستخدمين من إرسال رسائل نصية للمحامين",
          color: "text-purple-400",
          bgColor: "bg-purple-500/10",
        };
      default:
        return {
          icon: Settings,
          title: key,
          description: "",
          color: "text-muted-foreground",
          bgColor: "bg-muted/10",
        };
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

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/admin" className="hover:text-golden transition-colors">
              لوحة التحكم
            </Link>
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span className="text-foreground">إعدادات الاتصال</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              إعدادات <span className="text-gradient-golden">الاتصال</span>
            </h1>
            <p className="text-muted-foreground">
              التحكم في خدمات الاتصال بين المستخدمين والمحامين
            </p>
          </div>

          {/* Settings Cards */}
          <div className="space-y-4">
            {communicationKeys.map((key) => {
              const setting = settings.find(s => s.section_key === key);
              const config = getSettingConfig(key);
              const Icon = config.icon;
              const isEnabled = setting?.is_enabled ?? true;

              return (
                <Card key={key} className="bg-card/50 border-border/50 hover:border-golden/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${config.bgColor}`}>
                          <Icon className={`w-6 h-6 ${config.color}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-lg">
                            {config.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {config.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm ${isEnabled ? 'text-green-400' : 'text-red-400'}`}>
                          {isEnabled ? 'مفعّل' : 'معطّل'}
                        </span>
                        {saving === key ? (
                          <Loader2 className="w-5 h-5 animate-spin text-golden" />
                        ) : (
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => handleToggle(key, isEnabled)}
                            className="data-[state=checked]:bg-golden"
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Info Card */}
          <Card className="mt-8 bg-golden/5 border-golden/20">
            <CardHeader>
              <CardTitle className="text-golden text-lg">ملاحظة</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                عند تعطيل أي من خدمات الاتصال، لن يتمكن المستخدمون من استخدام هذه الخدمة 
                في التواصل مع المحامين. تأكد من إبلاغ المستخدمين بأي تغييرات قبل تطبيقها.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default AdminCommunicationSettings;
