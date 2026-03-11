import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  Star,
  MessageSquare,
  Calendar,
  Clock,
  Video,
  FileText,
  TrendingUp,
  Upload,
  Send,
  Bot,
  Loader2,
  Download,
  Eye,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface FileRecord {
  id: string;
  name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface LawyerStats {
  activeClients: number;
  activeCases: number;
  monthlyRevenue: number;
  rating: number;
}

interface ContractTemplate {
  id: string;
  title: string;
  category: string;
  downloads_count: number;
}

const LawyerFullDashboard = () => {
  const { user, isLawyer, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  
  // AI Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Files State
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [uploading, setUploading] = useState(false);

  // Real Stats State
  const [stats, setStats] = useState<LawyerStats>({
    activeClients: 0,
    activeCases: 0,
    monthlyRevenue: 0,
    rating: 0
  });
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // السماح للأدمن أو المحامين بالوصول
  const hasAccess = isLawyer || isAdmin;

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      toast({
        title: "غير مصرح",
        description: "هذه الصفحة مخصصة للمحامين فقط",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    if (hasAccess && user) {
      fetchFiles();
      fetchRealData();
    }
  }, [hasAccess, authLoading, navigate, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchRealData = async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      // Fetch lawyer profile for rating
      const { data: lawyerProfile } = await supabase
        .from("lawyer_profiles")
        .select("rating, reviews_count")
        .eq("user_id", user.id)
        .maybeSingle();

      // Count unique clients
      const { data: clientsData } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("receiver_id", user.id);
      
      const uniqueClients = new Set(clientsData?.map(m => m.sender_id) || []);

      setStats({
        activeClients: uniqueClients.size,
        activeCases: 0,
        monthlyRevenue: 0,
        rating: lawyerProfile?.rating || 0
      });

      // Fetch contract templates
      const { data: templates } = await supabase
        .from("contract_templates")
        .select("id, title, category, downloads_count")
        .limit(8);

      setContractTemplates(templates || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .eq("uploaded_by", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop() || 'file';
      const filePath = `${user.id}/${Date.now()}_file.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("platform-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("files")
        .insert({
          name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
          is_public: false
        });

      if (dbError) throw dbError;

      toast({ title: "تم الرفع", description: "تم رفع الملف بنجاح" });
      fetchFiles();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({ title: "خطأ", description: "فشل في رفع الملف", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lawyer-ai-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: [...messages, userMessage] }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "فشل في الحصول على الرد");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let assistantContent = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const parsed = JSON.parse(line.slice(6));
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return prev.map((m, i) => 
                      i === prev.length - 1 ? { ...m, content: assistantContent } : m
                    );
                  }
                  return [...prev, { role: "assistant", content: assistantContent }];
                });
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "غير معروف";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-golden" />
        </div>
      </Layout>
    );
  }

  if (!hasAccess) return null;

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              لوحة تحكم <span className="text-gradient-golden">المحامي</span>
            </h1>
            <p className="text-muted-foreground">مرحباً بك، إليك أدوات العمل الخاصة بك</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="border border-border/60 bg-muted/60 backdrop-blur-sm">
              <TabsTrigger value="overview" className="data-[state=active]:bg-golden/20">
                <TrendingUp className="w-4 h-4 ml-2" />
                نظرة عامة
              </TabsTrigger>
              <TabsTrigger value="ai-assistant" className="data-[state=active]:bg-golden/20">
                <Bot className="w-4 h-4 ml-2" />
                المساعد الذكي
              </TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-golden/20">
                <Upload className="w-4 h-4 ml-2" />
                الملفات
              </TabsTrigger>
              <TabsTrigger value="contracts" className="data-[state=active]:bg-golden/20">
                <FileText className="w-4 h-4 ml-2" />
                نماذج العقود
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="glass-card border-golden/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-golden/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-golden" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">العملاء النشطين</p>
                        <p className="text-xl font-bold text-foreground">{stats.activeClients}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card border-golden/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-golden/20 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-golden" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">القضايا الجارية</p>
                        <p className="text-xl font-bold text-foreground">{stats.activeCases}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card border-golden/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-golden/20 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-golden" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">الإيرادات الشهرية</p>
                        <p className="text-xl font-bold text-foreground">{stats.monthlyRevenue.toLocaleString()} ر.س</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card border-golden/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-golden/20 flex items-center justify-center">
                        <Star className="w-5 h-5 text-golden" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">التقييم</p>
                        <p className="text-xl font-bold text-foreground">{stats.rating > 0 ? stats.rating.toFixed(1) : "جديد"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Empty State for Appointments */}
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-golden">
                    <Calendar className="w-5 h-5" />
                    المواعيد القادمة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Calendar className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">لا توجد مواعيد قادمة</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      ستظهر هنا المواعيد عند حجزها من قبل العملاء
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Assistant Tab */}
            <TabsContent value="ai-assistant">
              <Card className="glass-card border-golden/20 h-[600px] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-golden">
                    <Bot className="w-5 h-5" />
                    المساعد القانوني الذكي
                    <Badge className="bg-golden/20 text-golden mr-2">خاص بالمحامين</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ScrollArea className="mb-4 flex-1 rounded-lg border border-border/60 bg-muted/40 p-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <Bot className="w-16 h-16 mx-auto mb-4 text-golden/50" />
                        <p className="text-lg">مرحباً! أنا مساعدك القانوني الذكي</p>
                        <p className="text-sm mt-2">يمكنني مساعدتك في صياغة العقود، تحليل القضايا، والبحث في الأنظمة السعودية</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg, index) => (
                          <div
                            key={index}
                            className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
                          >
                            <div
                              className={`max-w-[80%] p-3 rounded-lg ${
                                msg.role === "user"
                                  ? "bg-golden/20 text-foreground"
                                  : "border border-border/60 bg-card text-foreground shadow-sm"
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                        {isLoading && (
                          <div className="flex justify-end">
                            <div className="rounded-lg border border-border/60 bg-card p-3 shadow-sm">
                              <Loader2 className="w-5 h-5 animate-spin text-golden" />
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      placeholder="اكتب سؤالك القانوني هنا..."
                      className="border-golden/30 bg-background/80 text-foreground"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={isLoading || !inputMessage.trim()}
                      className="bg-golden hover:bg-golden/90"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files">
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-golden">
                    <span className="flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      ملفاتي
                    </span>
                    <label className="cursor-pointer">
                      <Input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <Button asChild disabled={uploading}>
                        <span>
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Upload className="w-4 h-4 ml-2" />}
                          رفع ملف
                        </span>
                      </Button>
                    </label>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-golden/20">
                        <TableHead className="text-right">اسم الملف</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">الحجم</TableHead>
                        <TableHead className="text-right">تاريخ الرفع</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map(file => (
                        <TableRow key={file.id} className="border-golden/10">
                          <TableCell className="font-medium">{file.name}</TableCell>
                          <TableCell>{file.file_type || "غير معروف"}</TableCell>
                          <TableCell>{formatFileSize(file.file_size)}</TableCell>
                          <TableCell>{new Date(file.created_at).toLocaleDateString('ar-SA')}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" className="text-blue-400">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-green-400">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {files.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">لا توجد ملفات</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contract Templates Tab */}
            <TabsContent value="contracts">
              <Card className="glass-card border-golden/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-golden">
                    <FileText className="w-5 h-5" />
                    نماذج العقود الجاهزة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {contractTemplates.length === 0 ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
                        <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground">لا توجد نماذج عقود</p>
                      </div>
                    ) : (
                      contractTemplates.map((template) => (
                        <div key={template.id} className="rounded-lg border border-golden/20 bg-card/80 p-4 transition-colors hover:border-golden/40 hover:bg-muted/40">
                          <FileText className="w-10 h-10 text-golden mb-3" />
                          <h3 className="font-medium text-foreground mb-1">{template.title}</h3>
                          <p className="text-xs text-muted-foreground mb-3">{template.category}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{template.downloads_count || 0} تحميل</span>
                            <Button size="sm" variant="ghost" className="text-golden">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default LawyerFullDashboard;
