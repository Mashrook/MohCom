import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  X,
  FileText,
  Image,
  Video,
  Music,
  File,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Download,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  validateFile,
  sanitizeFileName,
  formatFileSize,
  CASE_DOCUMENT_ACCEPTED_TYPES,
  CASE_DOCUMENT_MAX_SIZE,
} from "@/utils/fileSecurityValidator";

export interface UploadedDocument {
  id?: string;
  name: string;
  path: string;
  size: number;
  type: string | null;
  status: "uploading" | "scanning" | "ready" | "error";
  error?: string;
}

interface CaseDocumentUploaderProps {
  /** Storage bucket name */
  bucket?: string;
  /** Called when files change (upload/remove) */
  onFilesChange?: (files: UploadedDocument[]) => void;
  /** Called when text is extracted from files */
  onTextExtracted?: (text: string) => void;
  /** Maximum number of files */
  maxFiles?: number;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Accepted file types (HTML accept attribute) */
  acceptedTypes?: string;
  /** Whether to auto-extract text from documents */
  extractText?: boolean;
  /** Disable the uploader */
  disabled?: boolean;
  /** Compact mode for embedding in other components */
  compact?: boolean;
  /** Title for the card */
  title?: string;
  /** Description text */
  description?: string;
  /** Existing files to display */
  existingFiles?: UploadedDocument[];
  /** Whether to save file records to database */
  saveToDatabase?: boolean;
  /** Shared with user IDs */
  sharedWith?: string[];
}

const CaseDocumentUploader = ({
  bucket = "platform-files",
  onFilesChange,
  onTextExtracted,
  maxFiles = 10,
  maxSize = CASE_DOCUMENT_MAX_SIZE,
  acceptedTypes = CASE_DOCUMENT_ACCEPTED_TYPES,
  extractText = false,
  disabled = false,
  compact = false,
  title = "رفع مستندات القضية",
  description = "ارفع المستندات والملفات المتعلقة بالقضية لتحليلها",
  existingFiles = [],
  saveToDatabase = true,
  sharedWith,
}: CaseDocumentUploaderProps) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadedDocument[]>(existingFiles);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string | null) => {
    if (!type) return <File className="w-5 h-5 text-muted-foreground" />;
    if (type.startsWith("image/")) return <Image className="w-5 h-5 text-blue-400" />;
    if (type.startsWith("video/")) return <Video className="w-5 h-5 text-purple-400" />;
    if (type.startsWith("audio/")) return <Music className="w-5 h-5 text-green-400" />;
    if (type.includes("pdf") || type.includes("document"))
      return <FileText className="w-5 h-5 text-red-400" />;
    if (type.includes("sheet") || type.includes("excel"))
      return <FileText className="w-5 h-5 text-emerald-400" />;
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  const getStatusBadge = (status: UploadedDocument["status"]) => {
    switch (status) {
      case "uploading":
        return (
          <Badge variant="outline" className="text-blue-400 border-blue-400/30">
            <Loader2 className="w-3 h-3 animate-spin ml-1" />
            جاري الرفع
          </Badge>
        );
      case "scanning":
        return (
          <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
            <ShieldCheck className="w-3 h-3 ml-1" />
            جاري الفحص
          </Badge>
        );
      case "ready":
        return (
          <Badge variant="outline" className="text-green-400 border-green-400/30">
            <CheckCircle className="w-3 h-3 ml-1" />
            جاهز
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 ml-1" />
            خطأ
          </Badge>
        );
    }
  };

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputFiles = e.target.files;
      if (!inputFiles || inputFiles.length === 0) return;

      if (!user) {
        toast.error("يرجى تسجيل الدخول لرفع الملفات");
        return;
      }

      if (files.length + inputFiles.length > maxFiles) {
        toast.error(`الحد الأقصى ${maxFiles} ملفات`);
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);
      const totalFiles = inputFiles.length;
      let completed = 0;

      const newFiles: UploadedDocument[] = [];

      for (const file of Array.from(inputFiles)) {
        // Add placeholder entry
        const placeholder: UploadedDocument = {
          name: file.name,
          path: "",
          size: file.size,
          type: file.type,
          status: "uploading",
        };
        setFiles((prev) => [...prev, placeholder]);

        // Validate file security
        const validationResult = await validateFile(file, maxSize);

        if (!validationResult.isValid) {
          toast.error(`${file.name}: ${validationResult.error}`);
          setFiles((prev) =>
            prev.map((f) =>
              f === placeholder
                ? { ...f, status: "error" as const, error: validationResult.error }
                : f
            )
          );
          completed++;
          setUploadProgress((completed / totalFiles) * 100);
          continue;
        }

        if (validationResult.warning) {
          toast.warning(validationResult.warning);
        }

        // Update status to scanning
        setFiles((prev) =>
          prev.map((f) => (f === placeholder ? { ...f, status: "scanning" as const } : f))
        );

        const sanitizedName = sanitizeFileName(file.name);
        const fileExt = sanitizedName.split(".").pop()?.toLowerCase();
        const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

          if (uploadError) {
            throw uploadError;
          }

          let fileId: string | undefined;

          // Save to database if needed
          if (saveToDatabase) {
            const { data: fileRecord, error: dbError } = await supabase
              .from("files")
              .insert({
                name: sanitizedName,
                file_path: filePath,
                file_type: file.type,
                file_size: file.size,
                uploaded_by: user.id,
                is_public: false,
                shared_with: sharedWith || null,
              })
              .select("id")
              .single();

            if (dbError) {
              console.error("DB error:", dbError);
            } else {
              fileId = fileRecord?.id;
            }
          }

          const uploadedDoc: UploadedDocument = {
            id: fileId,
            name: sanitizedName,
            path: filePath,
            size: file.size,
            type: file.type,
            status: "ready",
          };

          newFiles.push(uploadedDoc);

          setFiles((prev) =>
            prev.map((f) => (f === placeholder ? uploadedDoc : f))
          );

          toast.success(`تم رفع ${file.name} بنجاح`);
        } catch (error) {
          console.error("Upload error:", error);
          setFiles((prev) =>
            prev.map((f) =>
              f === placeholder
                ? { ...f, status: "error" as const, error: "فشل في رفع الملف" }
                : f
            )
          );
          toast.error(`فشل رفع ${file.name}`);
        }

        completed++;
        setUploadProgress((completed / totalFiles) * 100);
      }

      if (newFiles.length > 0) {
        const allFiles = [...files.filter((f) => f.status === "ready"), ...newFiles];
        onFilesChange?.(allFiles);

        // Extract text if needed
        if (extractText && onTextExtracted) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.access_token) {
              const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
              const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

              const response = await fetch(
                `${SUPABASE_URL}/functions/v1/parse-document`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessionData.session.access_token}`,
                    apikey: SUPABASE_ANON_KEY,
                  },
                  body: JSON.stringify({
                    filePaths: allFiles.map((f) => f.path),
                  }),
                }
              );

              if (response.ok) {
                const data = await response.json();
                if (data.extractedText) {
                  onTextExtracted(data.extractedText);
                }
              }
            }
          } catch (error) {
            console.error("Text extraction error:", error);
          }
        }
      }

      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [user, files, maxFiles, maxSize, bucket, saveToDatabase, sharedWith, extractText, onFilesChange, onTextExtracted]
  );

  const removeFile = useCallback(
    async (index: number) => {
      const file = files[index];
      if (!file) return;

      try {
        // Remove from storage
        if (file.path) {
          await supabase.storage.from(bucket).remove([file.path]);
        }

        // Remove from database
        if (file.id) {
          await supabase.from("files").delete().eq("id", file.id);
        }
      } catch (error) {
        console.error("Error removing file:", error);
      }

      const updated = files.filter((_, i) => i !== index);
      setFiles(updated);
      onFilesChange?.(updated.filter((f) => f.status === "ready"));
      toast.success("تم حذف الملف");
    },
    [files, bucket, onFilesChange]
  );

  const handleDownload = useCallback(
    async (file: UploadedDocument) => {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .download(file.path);

        if (error) throw error;

        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Download error:", error);
        toast.error("فشل في تحميل الملف");
      }
    },
    [bucket]
  );

  const readyFiles = files.filter((f) => f.status === "ready");

  const content = (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          disabled
            ? "border-muted/30 bg-muted/5 cursor-not-allowed"
            : "border-primary/30 hover:border-primary/50 bg-primary/5 cursor-pointer"
        }`}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept={acceptedTypes}
          multiple
          className="hidden"
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">جاري رفع الملفات...</p>
            <Progress value={uploadProgress} className="h-2 max-w-xs mx-auto" />
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              اضغط أو اسحب الملفات هنا
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, Word, Excel, صور, فيديو, صوت — الحد الأقصى{" "}
              {formatFileSize(maxSize)} لكل ملف
            </p>
          </>
        )}
      </div>

      {/* Security Notice */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/10 rounded-md p-2">
        <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
        <span>يتم فحص جميع الملفات أمنياً للتأكد من خلوها من المحتوى الضار</span>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <ScrollArea className={compact ? "max-h-[200px]" : "max-h-[300px]"}>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50"
              >
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    {file.error && (
                      <span className="text-destructive">{file.error}</span>
                    )}
                  </div>
                </div>
                {getStatusBadge(file.status)}
                <div className="flex items-center gap-1">
                  {file.status === "ready" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file);
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Files count */}
      {readyFiles.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {readyFiles.length} / {maxFiles} ملفات مرفوعة
        </p>
      )}
    </div>
  );

  if (compact) {
    return content;
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Upload className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};

export default CaseDocumentUploader;
