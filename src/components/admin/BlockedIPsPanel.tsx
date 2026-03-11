/**
 * Blocked IPs Management Panel
 * لوحة إدارة عناوين IP المحظورة
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBlockedIPs } from '@/hooks/useBlockedIPs';
import { Shield, ShieldOff, Plus, Ban, Clock, RefreshCw, AlertTriangle, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const BlockedIPsPanel = () => {
  const { blockedIPs, loading, blockIP, unblockIP, makeBlockPermanent, refetch } = useBlockedIPs();
  const [newIP, setNewIP] = useState('');
  const [reason, setReason] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [blockDuration, setBlockDuration] = useState('24');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [makingPermanent, setMakingPermanent] = useState<string | null>(null);

  const handleBlockIP = async () => {
    if (!newIP.trim() || !reason.trim()) return;
    
    setBlocking(true);
    const success = await blockIP(newIP.trim(), reason.trim(), isPermanent, parseInt(blockDuration));
    if (success) {
      setNewIP('');
      setReason('');
      setIsPermanent(false);
      setDialogOpen(false);
    }
    setBlocking(false);
  };

  const handleUnblock = async (ip: string) => {
    await unblockIP(ip);
  };

  const handleMakePermanent = async (ip: string) => {
    setMakingPermanent(ip);
    await makeBlockPermanent(ip);
    setMakingPermanent(null);
  };

  const permanentCount = blockedIPs.filter(ip => ip.is_permanent).length;
  const autoBlockedCount = blockedIPs.filter(ip => ip.auto_blocked).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Ban className="h-5 w-5 text-destructive" />
          عناوين IP المحظورة ({blockedIPs.length})
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 ml-2" />
                حظر IP جديد
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>حظر عنوان IP</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>عنوان IP</Label>
                  <Input
                    placeholder="مثال: 192.168.1.1"
                    value={newIP}
                    onChange={(e) => setNewIP(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label>سبب الحظر</Label>
                  <Input
                    placeholder="أدخل سبب الحظر"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>حظر دائم</Label>
                  <Switch checked={isPermanent} onCheckedChange={setIsPermanent} />
                </div>
                {!isPermanent && (
                  <div>
                    <Label>مدة الحظر</Label>
                    <Select value={blockDuration} onValueChange={setBlockDuration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">ساعة واحدة</SelectItem>
                        <SelectItem value="6">6 ساعات</SelectItem>
                        <SelectItem value="12">12 ساعة</SelectItem>
                        <SelectItem value="24">24 ساعة</SelectItem>
                        <SelectItem value="48">48 ساعة</SelectItem>
                        <SelectItem value="72">72 ساعة</SelectItem>
                        <SelectItem value="168">أسبوع</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={handleBlockIP} disabled={blocking || !newIP.trim() || !reason.trim()} className="w-full">
                  {blocking ? 'جاري الحظر...' : 'حظر العنوان'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-destructive/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-destructive">{blockedIPs.length}</div>
            <div className="text-xs text-muted-foreground">إجمالي المحظورين</div>
          </div>
          <div className="bg-orange-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-500">{permanentCount}</div>
            <div className="text-xs text-muted-foreground">حظر دائم</div>
          </div>
          <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-500">{autoBlockedCount}</div>
            <div className="text-xs text-muted-foreground">حظر تلقائي</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : blockedIPs.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto text-green-500 mb-2" />
            <p className="text-muted-foreground">لا توجد عناوين IP محظورة حالياً</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">عنوان IP</TableHead>
                  <TableHead className="text-right">السبب</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">وقت الحظر</TableHead>
                  <TableHead className="text-right">ينتهي في</TableHead>
                  <TableHead className="text-right">الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blockedIPs.map((ip) => (
                  <TableRow key={ip.id}>
                    <TableCell className="font-mono text-sm" dir="ltr">{ip.ip_address}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{ip.reason}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {ip.is_permanent && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 ml-1" />
                            دائم
                          </Badge>
                        )}
                        {ip.auto_blocked && (
                          <Badge variant="secondary" className="text-xs">
                            تلقائي
                          </Badge>
                        )}
                        {ip.attempt_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {ip.attempt_count} محاولة
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(ip.blocked_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      {ip.is_permanent ? (
                        <span className="text-destructive text-xs">لا ينتهي</span>
                      ) : ip.blocked_until ? (
                        <span className="text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(ip.blocked_until), 'dd/MM HH:mm', { locale: ar })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {!ip.is_permanent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMakePermanent(ip.ip_address)}
                            disabled={makingPermanent === ip.ip_address}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            title="تحويل لحظر دائم"
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnblock(ip.ip_address)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <ShieldOff className="h-4 w-4 ml-1" />
                          إلغاء الحظر
                        </Button>
                      </div>
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

export default BlockedIPsPanel;
