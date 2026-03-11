import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Edit, Trash2, Plus, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserTemplateForm } from "./UserTemplateForm";

interface UserTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  sector: string | null;
  content: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface UserTemplatesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (template: UserTemplate) => void;
}

export const UserTemplatesManager = ({ isOpen, onClose, onSelectTemplate }: UserTemplatesManagerProps) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<UserTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<UserTemplate | null>(null);

  const fetchTemplates = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_contract_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('حدث خطأ في جلب القوالب');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchTemplates();
    }
  }, [isOpen, user]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_contract_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('تم حذف القالب بنجاح');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('حدث خطأ في حذف القالب');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-golden" />
              قوالبي المخصصة
            </DialogTitle>
            <DialogDescription>
              إدارة قوالب العقود الخاصة بك
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Button 
              variant="golden" 
              onClick={() => setShowCreateForm(true)}
              className="mb-4"
            >
              <Plus className="w-4 h-4 ml-2" />
              إنشاء قالب جديد
            </Button>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-golden" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لم تقم بإنشاء أي قوالب بعد</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {templates.map((template) => (
                  <Card key={template.id} className="border-border/50 hover:border-golden/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground truncate">{template.title}</h4>
                          {template.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span className="px-2 py-0.5 bg-muted rounded">{template.category}</span>
                            {template.sector && (
                              <span className="px-2 py-0.5 bg-muted rounded">{template.sector}</span>
                            )}
                            {template.is_public && (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">عام</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewTemplate(template)}
                            title="معاينة"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {onSelectTemplate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                onSelectTemplate(template);
                                onClose();
                              }}
                            >
                              استخدام
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingTemplate(template)}
                            title="تعديل"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmId(template.id)}
                            className="text-destructive hover:text-destructive"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Form */}
      <UserTemplateForm
        isOpen={showCreateForm || !!editingTemplate}
        onClose={() => {
          setShowCreateForm(false);
          setEditingTemplate(null);
        }}
        onSuccess={fetchTemplates}
        editTemplate={editingTemplate}
      />

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.title}</DialogTitle>
            <DialogDescription>{previewTemplate?.description}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <pre className="whitespace-pre-wrap font-sans text-sm bg-muted p-4 rounded-lg max-h-[50vh] overflow-y-auto">
              {previewTemplate?.content}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا القالب نهائياً ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserTemplatesManager;
