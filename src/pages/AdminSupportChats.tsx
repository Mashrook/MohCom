import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowRight,
  MessageCircle,
  Search,
  Trash2,
  Eye,
  Send,
  User,
  Bot,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useAdminSupportChats, SupportChat } from "@/hooks/useAdminSupportChats";
import { cn } from "@/lib/utils";

const AdminSupportChats = () => {
  const navigate = useNavigate();
  const { chats, isLoading, fetchChats, deleteChat, addAdminReply } = useAdminSupportChats();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const filteredChats = chats.filter((chat) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      chat.user_name?.toLowerCase().includes(searchLower) ||
      chat.user_email?.toLowerCase().includes(searchLower) ||
      chat.messages.some((m) => m.text.toLowerCase().includes(searchLower))
    );
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLastMessage = (chat: SupportChat) => {
    const lastMsg = chat.messages[chat.messages.length - 1];
    return lastMsg?.text?.substring(0, 50) + (lastMsg?.text?.length > 50 ? "..." : "") || "لا توجد رسائل";
  };

  const handleDelete = async () => {
    if (chatToDelete) {
      await deleteChat(chatToDelete);
      setChatToDelete(null);
      if (selectedChat?.id === chatToDelete) {
        setSelectedChat(null);
      }
    }
  };

  const handleSendReply = async () => {
    if (!selectedChat || !replyText.trim()) return;
    
    setIsSending(true);
    const success = await addAdminReply(selectedChat.id, replyText);
    if (success) {
      setReplyText("");
      // Update selected chat with new message
      const updatedChat = chats.find((c) => c.id === selectedChat.id);
      if (updatedChat) setSelectedChat(updatedChat);
    }
    setIsSending(false);
  };

  return (
    <Layout>
      <SEO
        title="إدارة محادثات الدعم - لوحة التحكم"
        description="إدارة ومراجعة محادثات الدعم الفني"
        noindex={true}
      />

      <div className="container mx-auto px-4 py-8" dir="rtl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">إدارة محادثات الدعم الفني</h1>
            <p className="text-muted-foreground">مراجعة والرد على محادثات المستخدمين</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chats List */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  المحادثات ({filteredChats.length})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={fetchChats} disabled={isLoading}>
                  <RefreshCw className={cn("h-4 w-4 ml-2", isLoading && "animate-spin")} />
                  تحديث
                </Button>
              </div>
              <div className="relative mt-4">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في المحادثات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  لا توجد محادثات
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المستخدم</TableHead>
                        <TableHead>آخر رسالة</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead className="w-24">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredChats.map((chat) => (
                        <TableRow
                          key={chat.id}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            selectedChat?.id === chat.id && "bg-muted"
                          )}
                          onClick={() => setSelectedChat(chat)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{chat.user_name}</p>
                              <p className="text-xs text-muted-foreground">{chat.user_email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                            {getLastMessage(chat)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(chat.updated_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedChat(chat);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setChatToDelete(chat.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
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

          {/* Chat Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {selectedChat ? "تفاصيل المحادثة" : "اختر محادثة"}
              </CardTitle>
              {selectedChat && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{selectedChat.user_name}</Badge>
                  <Badge variant="outline">{selectedChat.messages.length} رسالة</Badge>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {selectedChat ? (
                <div className="space-y-4">
                  {/* Messages */}
                  <div className="h-[350px] overflow-y-auto border rounded-lg p-4 space-y-3 bg-muted/30">
                    {selectedChat.messages.map((message, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex gap-2 items-start",
                          message.isUser ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                            message.isUser
                              ? "bg-primary/20 text-primary"
                              : "bg-green-500/20 text-green-600"
                          )}
                        >
                          {message.isUser ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Bot className="w-4 h-4" />
                          )}
                        </div>
                        <div
                          className={cn(
                            "max-w-[80%] rounded-xl px-4 py-2 text-sm",
                            message.isUser
                              ? "bg-primary text-primary-foreground"
                              : "bg-background border"
                          )}
                        >
                          <p>{message.text}</p>
                          <p className="text-[10px] mt-1 opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString("ar-SA")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply Input */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="اكتب ردك هنا..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || isSending}
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        ) : (
                          <Send className="h-4 w-4 ml-2" />
                        )}
                        إرسال الرد
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>اختر محادثة من القائمة للمراجعة والرد</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={!!chatToDelete} onOpenChange={() => setChatToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف المحادثة</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذه المحادثة؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default AdminSupportChats;
