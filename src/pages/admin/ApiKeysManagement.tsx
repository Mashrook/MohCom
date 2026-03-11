import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, Bot, Video, Key, Settings, 
  Save, Eye, EyeOff, RefreshCw, CheckCircle, AlertCircle,
  Lock, Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logAdminAction } from '@/hooks/useAdminAudit';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface ApiKeyConfig {
  id: string;
  key_name: string;
  key_category: string;
  display_name: string;
  description: string | null;
  is_configured: boolean;
  last_updated: string;
}

const ApiKeysManagement = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKeyConfig | null>(null);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showKeyValue, setShowKeyValue] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_api_keys')
        .select('*')
        .order('key_category', { ascending: true });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل مفاتيح API',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleUpdateKey = async () => {
    if (!selectedKey || !newKeyValue.trim()) return;
    
    setSaving(true);
    try {
      // Update the status in our tracking table
      const { error } = await supabase
        .from('admin_api_keys')
        .update({
          is_configured: true,
          last_updated: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('id', selectedKey.id);

      if (error) throw error;

      // Log the action
      await logAdminAction('api_key_updated', 'admin_api_keys', {
        targetId: selectedKey.id,
        description: `تحديث مفتاح API: ${selectedKey.display_name}`,
      });

      toast({
        title: 'تم التحديث',
        description: (
          <div className="space-y-2">
            <p>تم تسجيل تحديث المفتاح. لتطبيق المفتاح الجديد:</p>
            <ol className="list-decimal list-inside text-sm">
              <li>أضف المفتاح كمتغير بيئة في Railway أو Supabase Edge Functions</li>
              <li>أعد نشر الخدمة أو أعد نشر الدالة المتأثرة</li>
              <li>اسم المفتاح: <code className="bg-muted px-1 rounded">{selectedKey.key_name}</code></li>
            </ol>
          </div>
        ),
      });

      setUpdateDialogOpen(false);
      setNewKeyValue('');
      setSelectedKey(null);
      fetchApiKeys();
    } catch (error) {
      console.error('Error updating key:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث المفتاح',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ai':
        return <Bot className="h-5 w-5 text-purple-400" />;
      case 'payment':
        return <CreditCard className="h-5 w-5 text-green-400" />;
      case 'rtc':
        return <Video className="h-5 w-5 text-blue-400" />;
      default:
        return <Key className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'ai':
        return 'الذكاء الاصطناعي';
      case 'payment':
        return 'بوابات الدفع';
      case 'rtc':
        return 'الاتصال المرئي والصوتي';
      default:
        return 'أخرى';
    }
  };

  const groupedKeys = apiKeys.reduce((acc, key) => {
    if (!acc[key.key_category]) {
      acc[key.key_category] = [];
    }
    acc[key.key_category].push(key);
    return acc;
  }, {} as Record<string, ApiKeyConfig[]>);

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6" />
            إدارة مفاتيح API
          </h1>
          <p className="text-muted-foreground">إدارة وتحديث مفاتيح الربط مع الخدمات الخارجية</p>
        </div>
        <Button variant="outline" onClick={fetchApiKeys} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      <Alert className="border-amber-500/50 bg-amber-500/10">
        <Shield className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-600">تنبيه أمني</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          لأسباب أمنية، يجب تخزين مفاتيح API كمتغيرات بيئة مشفرة في Railway وSupabase فقط.
          عند تحديث أي مفتاح، يلزم تحديث متغير البيئة ثم إعادة نشر الخدمة المعنية.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai" className="flex items-center gap-1">
            <Bot className="h-4 w-4" />
            الذكاء الاصطناعي
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-1">
            <CreditCard className="h-4 w-4" />
            الدفع
          </TabsTrigger>
          <TabsTrigger value="rtc" className="flex items-center gap-1">
            <Video className="h-4 w-4" />
            الاتصال
          </TabsTrigger>
          <TabsTrigger value="other" className="flex items-center gap-1">
            <Key className="h-4 w-4" />
            أخرى
          </TabsTrigger>
        </TabsList>

        {['ai', 'payment', 'rtc', 'other'].map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            {groupedKeys[category]?.map((apiKey) => (
              <Card key={apiKey.id} className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(apiKey.key_category)}
                      {apiKey.display_name}
                    </div>
                    <Badge 
                      variant={apiKey.is_configured ? "default" : "secondary"}
                      className={apiKey.is_configured ? "bg-green-500" : ""}
                    >
                      {apiKey.is_configured ? (
                        <>
                          <CheckCircle className="h-3 w-3 ml-1" />
                          مُهيأ
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 ml-1" />
                          غير مُهيأ
                        </>
                      )}
                    </Badge>
                  </CardTitle>
                  {apiKey.description && (
                    <CardDescription>{apiKey.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>اسم المتغير</Label>
                    <Input 
                      value={apiKey.key_name} 
                      disabled 
                      className="font-mono text-sm bg-muted/50" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>القيمة الحالية</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="password" 
                        value="••••••••••••••••" 
                        disabled 
                        className="font-mono" 
                      />
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      آخر تحديث: {new Date(apiKey.last_updated).toLocaleDateString('ar-SA')}
                    </p>
                    <Button 
                      onClick={() => {
                        setSelectedKey(apiKey);
                        setUpdateDialogOpen(true);
                      }}
                    >
                      <Key className="h-4 w-4 ml-2" />
                      تحديث المفتاح
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!groupedKeys[category]?.length && (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="py-8 text-center text-muted-foreground">
                  لا توجد مفاتيح في هذه الفئة
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Update Key Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              تحديث {selectedKey?.display_name}
            </DialogTitle>
            <DialogDescription>
              أدخل قيمة المفتاح الجديد. سيتم تسجيل التحديث وستحتاج لإضافته في إعدادات المشروع.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اسم المتغير</Label>
              <Input 
                value={selectedKey?.key_name || ''} 
                disabled 
                className="font-mono bg-muted/50" 
              />
            </div>
            <div className="space-y-2">
              <Label>القيمة الجديدة</Label>
              <div className="flex items-center gap-2">
                <Input
                  type={showKeyValue ? 'text' : 'password'}
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  placeholder="أدخل المفتاح الجديد..."
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowKeyValue(!showKeyValue)}
                >
                  {showKeyValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateKey} disabled={saving || !newKeyValue.trim()}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
              حفظ التحديث
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiKeysManagement;
