import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  File,
  FileText,
  Image,
  Video,
  Music,
  Search,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  Loader2,
  User,
  Calendar,
  HardDrive,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { logAdminAction } from "@/hooks/useAdminAudit";

interface FileData {
  id: string;
  name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  uploaded_by: string;
  created_at: string;
  is_public: boolean | null;
  uploader_name?: string | null;
  uploader_email?: string | null;
}

const AdminFileManager = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data: filesData, error } = await supabase
        .from("files")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch uploader info
      const filesWithUploaders = await Promise.all(
        (filesData || []).map(async (file) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", file.uploaded_by)
            .maybeSingle();

          let email = null;
          try {
            const { data: emailData } = await supabase.rpc("get_user_email_for_admin", {
              target_user_id: file.uploaded_by,
            });
            email = emailData;
          } catch {}

          return {
            ...file,
            uploader_name: profile?.full_name,
            uploader_email: email,
          };
        })
      );

      setFiles(filesWithUploaders);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الملفات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="w-5 h-5 text-muted-foreground" />;
    if (fileType.startsWith("image/")) return <Image className="w-5 h-5 text-blue-400" />;
    if (fileType.startsWith("video/")) return <Video className="w-5 h-5 text-purple-400" />;
    if (fileType.startsWith("audio/")) return <Music className="w-5 h-5 text-green-400" />;
    if (fileType.includes("pdf") || fileType.includes("document"))
      return <FileText className="w-5 h-5 text-red-400" />;
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "غير معروف";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = async () => {
    if (!selectedFile) return;
    setDeleting(true);

    try {
      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from("files")
        .remove([selectedFile.file_path]);

      if (storageError) {
        console.warn("Storage delete warning:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("files")
        .delete()
        .eq("id", selectedFile.id);

      if (dbError) throw dbError;

      await logAdminAction("file_deleted", "files", {
        targetId: selectedFile.id,
        targetUserId: selectedFile.uploaded_by,
        oldValues: { name: selectedFile.name, file_path: selectedFile.file_path },
        description: `حذف الملف: ${selectedFile.name}`,
      });

      toast({
        title: "تم الحذف",
        description: "تم حذف الملف بنجاح",
      });

      setDeleteDialogOpen(false);
      fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "خطأ",
        description: "فشل في حذف الملف",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (file: FileData) => {
    try {
      const { data, error } = await supabase.storage
        .from("files")
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الملف",
        variant: "destructive",
      });
    }
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.uploader_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.uploader_email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "image" && file.file_type?.startsWith("image/")) ||
      (typeFilter === "video" && file.file_type?.startsWith("video/")) ||
      (typeFilter === "document" &&
        (file.file_type?.includes("pdf") ||
          file.file_type?.includes("document") ||
          file.file_type?.includes("text"))) ||
      (typeFilter === "other" &&
        !file.file_type?.startsWith("image/") &&
        !file.file_type?.startsWith("video/") &&
        !file.file_type?.includes("pdf"));

    return matchesSearch && matchesType;
  });

  const stats = {
    total: files.length,
    totalSize: files.reduce((acc, f) => acc + (f.file_size || 0), 0),
    images: files.filter((f) => f.file_type?.startsWith("image/")).length,
    documents: files.filter(
      (f) => f.file_type?.includes("pdf") || f.file_type?.includes("document")
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <File className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">إجمالي الملفات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <HardDrive className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
                <p className="text-sm text-muted-foreground">الحجم الإجمالي</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Image className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold">{stats.images}</p>
                <p className="text-sm text-muted-foreground">صور</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold">{stats.documents}</p>
                <p className="text-sm text-muted-foreground">مستندات</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو المستخدم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="نوع الملف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="image">صور</SelectItem>
                <SelectItem value="video">فيديو</SelectItem>
                <SelectItem value="document">مستندات</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchFiles} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Files Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <File className="h-5 w-5" />
            قائمة الملفات ({filteredFiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الملف</TableHead>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">الحجم</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(file.file_type)}
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.file_type || "غير معروف"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm">{file.uploader_name || "غير معروف"}</p>
                            <p className="text-xs text-muted-foreground">{file.uploader_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatFileSize(file.file_size)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(new Date(file.created_at), "d MMM yyyy", { locale: ar })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {file.is_public ? (
                          <Badge className="bg-green-500/20 text-green-400">عام</Badge>
                        ) : (
                          <Badge className="bg-yellow-500/20 text-yellow-400">خاص</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDownload(file)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => {
                              setSelectedFile(file);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredFiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        لا توجد ملفات
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف الملف "{selectedFile?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFileManager;
