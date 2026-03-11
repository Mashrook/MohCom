import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Trash2, Globe, Loader2, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AllowedIP {
  id: string;
  ip_address: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminIPRestriction = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restrictionEnabled, setRestrictionEnabled] = useState(false);
  const [allowedIPs, setAllowedIPs] = useState<AllowedIP[]>([]);
  const [currentIP, setCurrentIP] = useState<string>('');
  const [newIP, setNewIP] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
    fetchCurrentIP();
  }, []);

  const fetchCurrentIP = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-admin-ip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const data = await response.json();
      setCurrentIP(data.ip || 'غير معروف');
    } catch (error) {
      console.error('Error fetching current IP:', error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch restriction setting
      const { data: settings } = await supabase
        .from('admin_security_settings')
        .select('setting_value')
        .eq('setting_key', 'ip_restriction_enabled')
        .maybeSingle();

      setRestrictionEnabled(settings?.setting_value || false);

      // Fetch allowed IPs
      const { data: ips, error } = await supabase
        .from('admin_allowed_ips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllowedIPs(ips || []);
    } catch (error: any) {
      toast({
        title: 'خطأ في تحميل البيانات',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRestriction = async (enabled: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_security_settings')
        .update({ setting_value: enabled, updated_at: new Date().toISOString() })
        .eq('setting_key', 'ip_restriction_enabled');

      if (error) throw error;

      setRestrictionEnabled(enabled);
      toast({
        title: enabled ? 'تم تفعيل تقييد IP' : 'تم تعطيل تقييد IP',
        description: enabled 
          ? 'سيتم السماح فقط للعناوين المضافة بالوصول للوحة الإدارة'
          : 'يمكن للمدراء الوصول من أي عنوان IP',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addIP = async () => {
    if (!newIP.trim()) return;

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newIP.trim())) {
      toast({
        title: 'عنوان IP غير صالح',
        description: 'يرجى إدخال عنوان IP صالح (مثال: 192.168.1.1)',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('admin_allowed_ips')
        .insert({
          ip_address: newIP.trim(),
          description: newDescription.trim() || null,
          created_by: user?.id,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('هذا العنوان مضاف مسبقاً');
        }
        throw error;
      }

      toast({ title: 'تمت إضافة عنوان IP بنجاح' });
      setNewIP('');
      setNewDescription('');
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'خطأ في الإضافة',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleIPStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_allowed_ips')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteIP = async (id: string) => {
    try {
      const { error } = await supabase
        .from('admin_allowed_ips')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'تم حذف عنوان IP' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'خطأ في الحذف',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const addCurrentIP = () => {
    if (currentIP && currentIP !== 'غير معروف') {
      setNewIP(currentIP);
      setNewDescription('عنواني الحالي');
      setDialogOpen(true);
    }
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background py-8 px-4" dir="rtl">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-golden" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">تقييد IP للمدراء</h1>
              <p className="text-muted-foreground">إدارة عناوين IP المسموح لها بالوصول للوحة الإدارة</p>
            </div>
          </div>

          {/* Current IP Info */}
          <Card className="border-golden/30 bg-card-dark">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">عنوان IP الحالي الخاص بك</p>
                    <p className="font-mono text-lg text-foreground">{currentIP || 'جاري التحميل...'}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={addCurrentIP} disabled={!currentIP || currentIP === 'غير معروف'}>
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة للقائمة
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Restriction Toggle */}
          <Card className="border-golden/30 bg-card-dark">
            <CardHeader>
              <CardTitle className="text-golden">تفعيل تقييد IP</CardTitle>
              <CardDescription>
                عند التفعيل، سيتم السماح فقط للعناوين المضافة أدناه بالوصول للوحة الإدارة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {restrictionEnabled && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      مفعّل
                    </Badge>
                  )}
                  <Label htmlFor="restriction-toggle">
                    {restrictionEnabled ? 'التقييد مفعّل' : 'التقييد معطّل'}
                  </Label>
                </div>
                <Switch
                  id="restriction-toggle"
                  checked={restrictionEnabled}
                  onCheckedChange={toggleRestriction}
                  disabled={saving}
                />
              </div>
              {restrictionEnabled && allowedIPs.filter(ip => ip.is_active).length === 0 && (
                <div className="mt-4 p-3 bg-destructive/20 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    تحذير: لا توجد عناوين IP مفعّلة. أضف عنوانك الحالي لتجنب قفل نفسك.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Allowed IPs List */}
          <Card className="border-golden/30 bg-card-dark">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-golden">عناوين IP المسموح بها</CardTitle>
                <CardDescription>قائمة العناوين المصرح لها بالوصول للوحة الإدارة</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-golden hover:bg-golden-light text-black">
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة عنوان
                  </Button>
                </DialogTrigger>
                <DialogContent dir="rtl">
                  <DialogHeader>
                    <DialogTitle>إضافة عنوان IP جديد</DialogTitle>
                    <DialogDescription>أدخل عنوان IP المراد إضافته للقائمة المسموحة</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>عنوان IP</Label>
                      <Input
                        placeholder="192.168.1.1"
                        value={newIP}
                        onChange={(e) => setNewIP(e.target.value)}
                        dir="ltr"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الوصف (اختياري)</Label>
                      <Input
                        placeholder="مثال: مكتب الإدارة الرئيسي"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button onClick={addIP} disabled={saving || !newIP.trim()}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                      إضافة
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-golden" />
                </div>
              ) : allowedIPs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد عناوين IP مضافة</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">عنوان IP</TableHead>
                      <TableHead className="text-right">الوصف</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">تاريخ الإضافة</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allowedIPs.map((ip) => (
                      <TableRow key={ip.id}>
                        <TableCell className="font-mono">{ip.ip_address}</TableCell>
                        <TableCell>{ip.description || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={ip.is_active ? 'default' : 'secondary'}>
                            {ip.is_active ? 'مفعّل' : 'معطّل'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(ip.created_at).toLocaleDateString('ar-SA')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={ip.is_active}
                              onCheckedChange={() => toggleIPStatus(ip.id, ip.is_active)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteIP(ip.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default AdminIPRestriction;
