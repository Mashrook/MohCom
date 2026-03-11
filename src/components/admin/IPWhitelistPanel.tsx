/**
 * IP Whitelist Management Panel
 * لوحة إدارة القائمة البيضاء لعناوين IP
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Plus, Trash2, RefreshCw, CheckCircle } from 'lucide-react';
import { useIPWhitelist } from '@/hooks/useIPWhitelist';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const IPWhitelistPanel = () => {
  const { whitelistedIPs, loading, addToWhitelist, removeFromWhitelist, toggleWhitelistStatus, refetch } = useIPWhitelist();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newIP, setNewIP] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddIP = async () => {
    if (!newIP.trim()) return;
    
    setIsSubmitting(true);
    const success = await addToWhitelist(newIP.trim(), newDescription.trim());
    setIsSubmitting(false);
    
    if (success) {
      setNewIP('');
      setNewDescription('');
      setIsAddDialogOpen(false);
    }
  };

  const handleRemove = async (id: string) => {
    await removeFromWhitelist(id);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    await toggleWhitelistStatus(id, !currentStatus);
  };

  const validateIP = (ip: string): boolean => {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  };

  const activeCount = whitelistedIPs.filter(ip => ip.is_active).length;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-400" />
          القائمة البيضاء للـ IP ({activeCount} نشط)
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-1 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 ml-1" />
                إضافة IP
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة عنوان IP للقائمة البيضاء</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>عنوان IP</Label>
                  <Input
                    placeholder="مثال: 192.168.1.1"
                    value={newIP}
                    onChange={(e) => setNewIP(e.target.value)}
                    className={!newIP || validateIP(newIP) ? '' : 'border-red-500'}
                  />
                  {newIP && !validateIP(newIP) && (
                    <p className="text-sm text-red-500">عنوان IP غير صالح</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>الوصف (اختياري)</Label>
                  <Textarea
                    placeholder="مثال: خادم المكتب الرئيسي"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                  <p className="text-muted-foreground">
                    <CheckCircle className="h-4 w-4 inline ml-1 text-green-400" />
                    عناوين IP في القائمة البيضاء لن يتم حظرها تلقائياً حتى لو أطلقت تنبيهات أمنية.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button 
                  onClick={handleAddIP} 
                  disabled={!newIP.trim() || !validateIP(newIP) || isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'جاري الإضافة...' : 'إضافة'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : whitelistedIPs.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">لا توجد عناوين IP في القائمة البيضاء</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              أضف عناوين IP الموثوقة لمنع حظرها تلقائياً
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">عنوان IP</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-right">تاريخ الإضافة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {whitelistedIPs.map((ip) => (
                  <TableRow key={ip.id}>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">{ip.ip_address}</code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ip.description || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(ip.created_at), 'yyyy/MM/dd HH:mm', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={ip.is_active}
                          onCheckedChange={() => handleToggleStatus(ip.id, ip.is_active)}
                        />
                        <Badge variant={ip.is_active ? 'default' : 'secondary'}>
                          {ip.is_active ? 'نشط' : 'معطل'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(ip.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IPWhitelistPanel;
