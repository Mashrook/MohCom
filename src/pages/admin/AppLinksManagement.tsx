import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Smartphone, Apple, ExternalLink, Save, Loader2, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

interface AppLink {
  id: string;
  platform: string;
  store_url: string;
  is_active: boolean;
  updated_at: string;
}

export default function AppLinksManagement() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState<AppLink[]>([]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
      return;
    }
    fetchLinks();
  }, [isAdmin, authLoading, navigate]);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("app_download_links")
        .select("*")
        .order("platform");
      
      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error("Error fetching links:", error);
      toast.error("حدث خطأ في جلب البيانات");
    } finally {
      setLoading(false);
    }
  };

  const updateLink = async (platform: string, updates: Partial<AppLink>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_download_links")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("platform", platform);
      
      if (error) throw error;
      
      toast.success(`تم تحديث رابط ${platform === 'ios' ? 'App Store' : 'Google Play'} بنجاح`);
      fetchLinks();
    } catch (error) {
      console.error("Error updating link:", error);
      toast.error("حدث خطأ في التحديث");
    } finally {
      setSaving(false);
    }
  };

  const handleUrlChange = (platform: string, value: string) => {
    setLinks(prev => prev.map(link => 
      link.platform === platform ? { ...link, store_url: value } : link
    ));
  };

  const handleActiveChange = (platform: string, value: boolean) => {
    updateLink(platform, { is_active: value });
  };

  const saveUrl = (platform: string) => {
    const link = links.find(l => l.platform === platform);
    if (link) {
      updateLink(platform, { store_url: link.store_url });
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const iosLink = links.find(l => l.platform === 'ios');
  const androidLink = links.find(l => l.platform === 'android');

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Link to="/admin" className="hover:text-primary transition-colors">
                لوحة التحكم
              </Link>
              <ArrowRight className="w-4 h-4" />
              <span>إدارة روابط التطبيق</span>
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Smartphone className="w-8 h-8 text-primary" />
              إدارة روابط التطبيق
            </h1>
            <p className="text-muted-foreground mt-2">
              تحديث روابط تحميل التطبيق على App Store و Google Play
            </p>
          </div>

          <div className="grid gap-6">
            {/* iOS Link */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                      <Apple className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <CardTitle>App Store (iOS)</CardTitle>
                      <CardDescription>رابط تحميل التطبيق على متجر Apple</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="ios-active" className="text-sm text-muted-foreground">
                      مفعّل
                    </Label>
                    <Switch
                      id="ios-active"
                      checked={iosLink?.is_active ?? false}
                      onCheckedChange={(checked) => handleActiveChange('ios', checked)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="ios-url">رابط App Store</Label>
                    <Input
                      id="ios-url"
                      placeholder="https://apps.apple.com/app/..."
                      value={iosLink?.store_url || ''}
                      onChange={(e) => handleUrlChange('ios', e.target.value)}
                      dir="ltr"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button 
                      onClick={() => saveUrl('ios')}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span className="mr-2">حفظ</span>
                    </Button>
                    {iosLink?.store_url && iosLink.store_url !== '#' && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={iosLink.store_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
                {iosLink?.updated_at && (
                  <p className="text-xs text-muted-foreground">
                    آخر تحديث: {new Date(iosLink.updated_at).toLocaleDateString('ar-SA')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Android Link */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
                        <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                      </svg>
                    </div>
                    <div>
                      <CardTitle>Google Play (Android)</CardTitle>
                      <CardDescription>رابط تحميل التطبيق على متجر Google</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="android-active" className="text-sm text-muted-foreground">
                      مفعّل
                    </Label>
                    <Switch
                      id="android-active"
                      checked={androidLink?.is_active ?? false}
                      onCheckedChange={(checked) => handleActiveChange('android', checked)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="android-url">رابط Google Play</Label>
                    <Input
                      id="android-url"
                      placeholder="https://play.google.com/store/apps/..."
                      value={androidLink?.store_url || ''}
                      onChange={(e) => handleUrlChange('android', e.target.value)}
                      dir="ltr"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button 
                      onClick={() => saveUrl('android')}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span className="mr-2">حفظ</span>
                    </Button>
                    {androidLink?.store_url && androidLink.store_url !== '#' && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={androidLink.store_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
                {androidLink?.updated_at && (
                  <p className="text-xs text-muted-foreground">
                    آخر تحديث: {new Date(androidLink.updated_at).toLocaleDateString('ar-SA')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Preview Link */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">معاينة صفحة التحميل</h3>
                    <p className="text-sm text-muted-foreground">
                      شاهد كيف تظهر الروابط للمستخدمين
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link to="/download">
                      <ExternalLink className="w-4 h-4 ml-2" />
                      معاينة
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
