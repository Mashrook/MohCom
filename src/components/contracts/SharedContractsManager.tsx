import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Share2, 
  Trash2, 
  Copy, 
  Eye, 
  Calendar, 
  Clock,
  ExternalLink,
  Loader2,
  FileText
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SharedContract {
  id: string;
  title: string;
  share_token: string;
  created_at: string;
  expires_at: string | null;
  view_count: number | null;
}

const SharedContractsManager = () => {
  const { user } = useAuth();
  const [sharedContracts, setSharedContracts] = useState<SharedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSharedContracts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('shared_contracts')
        .select('id, title, share_token, created_at, expires_at, view_count')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSharedContracts(data || []);
    } catch (error) {
      console.error('Error fetching shared contracts:', error);
      toast.error('حدث خطأ في جلب العقود المشاركة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedContracts();
  }, [user]);

  const handleRevokeShare = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('shared_contracts')
        .delete()
        .eq('id', deleteId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setSharedContracts(prev => prev.filter(c => c.id !== deleteId));
      toast.success('تم إلغاء مشاركة العقد بنجاح');
    } catch (error) {
      console.error('Error revoking share:', error);
      toast.error('حدث خطأ في إلغاء المشاركة');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const copyShareLink = (token: string) => {
    const shareUrl = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('تم نسخ الرابط');
  };

  const openShareLink = (token: string) => {
    const shareUrl = `${window.location.origin}/shared/${token}`;
    window.open(shareUrl, '_blank');
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (sharedContracts.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-12 text-center">
          <Share2 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            لا توجد عقود مشاركة
          </h3>
          <p className="text-muted-foreground">
            يمكنك مشاركة العقود المعبأة من خلال زر المشاركة في نموذج تعبئة العقد
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          العقود المشاركة ({sharedContracts.length})
        </h3>
      </div>

      <div className="grid gap-4">
        {sharedContracts.map((contract) => {
          const expired = isExpired(contract.expires_at);
          
          return (
            <Card 
              key={contract.id} 
              className={`bg-card/50 border-border/50 ${expired ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <h4 className="font-semibold text-foreground truncate">
                        {contract.title}
                      </h4>
                      {expired ? (
                        <Badge variant="destructive" className="text-xs">
                          منتهي الصلاحية
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          نشط
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(contract.created_at)}
                      </span>
                      
                      {contract.expires_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          ينتهي: {formatDate(contract.expires_at)}
                        </span>
                      )}
                      
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {contract.view_count || 0} مشاهدة
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyShareLink(contract.share_token)}
                      disabled={expired}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openShareLink(contract.share_token)}
                      disabled={expired}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(contract.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء مشاركة العقد</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إلغاء مشاركة هذا العقد؟ لن يتمكن أي شخص لديه الرابط من الوصول إليه بعد الآن.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeShare}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : null}
              تأكيد الإلغاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SharedContractsManager;
