import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCommunicationSettings } from "@/hooks/useCommunicationSettings";
import { VideoCall } from "@/components/VideoCall";
import { Send, Paperclip, File, Download, User, Search, MessageCircle, X, Video, Phone, VideoOff, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content_encrypted: string | null;
  file_id: string | null;
  is_read: boolean;
  created_at: string;
  file?: {
    id: string;
    name: string;
    file_path: string;
    file_type: string | null;
    file_size: number | null;
  } | null;
}

interface Conversation {
  user: Profile;
  lastMessage: Message | null;
  unreadCount: number;
}

export default function Messages() {
  const { user, isAdmin, isLawyer } = useAuth();
  const { toast } = useToast();
  const communicationSettings = useCommunicationSettings();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callType, setCallType] = useState<"video" | "voice">("video");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCall = (type: "video" | "voice") => {
    if (!selectedUser) return;
    setCallType(type);
    setIsCallOpen(true);
  };

  // Fetch all users for search
  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;

      let query = supabase.from("profiles").select("*");
      
      // Only admins can see all users
      if (!isAdmin) {
        // For lawyers/clients, we need a different approach
        // Fetch users they've had conversations with
        const { data: sentMessages } = await supabase
          .from("messages")
          .select("receiver_id")
          .eq("sender_id", user.id);
        
        const { data: receivedMessages } = await supabase
          .from("messages")
          .select("sender_id")
          .eq("receiver_id", user.id);

        const userIds = new Set<string>();
        sentMessages?.forEach(m => userIds.add(m.receiver_id));
        receivedMessages?.forEach(m => userIds.add(m.sender_id));
        
        if (userIds.size > 0) {
          query = supabase.from("profiles").select("*").in("id", Array.from(userIds));
        } else {
          setAllUsers([]);
          return;
        }
      }

      const { data, error } = await query.neq("id", user.id);
      if (!error && data) {
        setAllUsers(data);
      }
    };

    fetchUsers();
  }, [user, isAdmin]);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;
      setLoading(true);

      try {
        // Get all messages involving this user
        const { data: allMessages, error } = await supabase
          .from("messages")
          .select(`
            *,
            file:files(id, name, file_path, file_type, file_size)
          `)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Group by conversation partner
        const conversationMap = new Map<string, { messages: Message[]; unreadCount: number }>();
        
        allMessages?.forEach((msg) => {
          const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          if (!conversationMap.has(partnerId)) {
            conversationMap.set(partnerId, { messages: [], unreadCount: 0 });
          }
          conversationMap.get(partnerId)!.messages.push(msg);
          if (!msg.is_read && msg.receiver_id === user.id) {
            conversationMap.get(partnerId)!.unreadCount++;
          }
        });

        // Fetch profiles for conversation partners
        const partnerIds = Array.from(conversationMap.keys());
        if (partnerIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("*")
            .in("id", partnerIds);

          const convs: Conversation[] = [];
          profiles?.forEach((profile) => {
            const conv = conversationMap.get(profile.id);
            if (conv) {
              convs.push({
                user: profile,
                lastMessage: conv.messages[0] || null,
                unreadCount: conv.unreadCount,
              });
            }
          });

          // Sort by last message time
          convs.sort((a, b) => {
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
          });

          setConversations(convs);
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user]);

  // Fetch messages for selected conversation
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user || !selectedUser) return;

      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          file:files(id, name, file_path, file_type, file_size)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
        
        // Mark messages as read
        const unreadIds = data
          .filter(m => m.receiver_id === user.id && !m.is_read)
          .map(m => m.id);
        
        if (unreadIds.length > 0) {
          await supabase
            .from("messages")
            .update({ is_read: true })
            .in("id", unreadIds);
        }
      }
    };

    fetchMessages();
  }, [user, selectedUser]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("messages-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // Fetch file if attached
          if (newMsg.file_id) {
            const { data: file } = await supabase
              .from("files")
              .select("id, name, file_path, file_type, file_size")
              .eq("id", newMsg.file_id)
              .maybeSingle();
            newMsg.file = file || undefined;
          }

          if (selectedUser && newMsg.sender_id === selectedUser.id) {
            setMessages(prev => [...prev, newMsg]);
            // Mark as read
            await supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", newMsg.id);
          }

          toast({
            title: "رسالة جديدة",
            description: "لديك رسالة جديدة",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedUser]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!user || !selectedUser || (!newMessage.trim() && !selectedFile)) return;

    setSendingMessage(true);
    try {
      let fileId: string | null = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("platform-files")
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        // Create file record
        const { data: fileRecord, error: fileRecordError } = await supabase
          .from("files")
          .insert({
            name: selectedFile.name,
            file_path: fileName,
            file_type: selectedFile.type,
            file_size: selectedFile.size,
            uploaded_by: user.id,
            shared_with: [selectedUser.id],
          })
          .select()
          .single();

        if (fileRecordError) throw fileRecordError;
        fileId = fileRecord.id;
      }

      // Send message via encrypted RPC
      const { error: messageError } = await supabase.rpc('insert_encrypted_message', {
        p_sender_id: user.id,
        p_receiver_id: selectedUser.id,
        p_content: newMessage.trim() || `📎 ${selectedFile?.name}`,
        p_file_id: fileId,
      });

      if (messageError) throw messageError;

      setNewMessage("");
      setSelectedFile(null);

      // Refetch messages
      const { data } = await supabase
        .from("messages")
        .select(`
          *,
          file:files(id, name, file_path, file_type, file_size)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (data) setMessages(data);

      toast({
        title: "تم الإرسال",
        description: "تم إرسال الرسالة بنجاح",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "خطأ",
        description: "فشل في إرسال الرسالة",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("platform-files")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
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

  const selectUserForConversation = (profile: Profile) => {
    setSelectedUser(profile);
    setShowUserSearch(false);
    setSearchQuery("");
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "اليوم";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "أمس";
    } else {
      return date.toLocaleDateString("ar-SA");
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Conversations List */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    المحادثات
                  </CardTitle>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowUserSearch(!showUserSearch)}
                    >
                      <User className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                {showUserSearch && (
                  <div className="relative mt-3">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث عن مستخدم..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-320px)]">
                  {showUserSearch && searchQuery ? (
                    <div className="p-2 space-y-1">
                      {filteredUsers.map((profile) => (
                        <button
                          key={profile.id}
                          onClick={() => selectUserForConversation(profile)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-right"
                        >
                        <Avatar className="w-10 h-10">
                            <AvatarImage src={profile.avatar_url || ""} />
                            <AvatarFallback>
                              {profile.full_name?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {profile.full_name || "بدون اسم"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {conversations.map((conv) => (
                        <button
                          key={conv.user.id}
                          onClick={() => setSelectedUser(conv.user)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-right",
                            selectedUser?.id === conv.user.id
                              ? "bg-primary/10 border border-primary/20"
                              : "hover:bg-muted/50"
                          )}
                        >
                        <Avatar className="w-12 h-12">
                            <AvatarImage src={conv.user.avatar_url || ""} />
                            <AvatarFallback>
                              {conv.user.full_name?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">
                                {conv.user.full_name || "بدون اسم"}
                              </p>
                              {conv.unreadCount > 0 && (
                                <Badge variant="default" className="mr-2">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                            {conv.lastMessage && (
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.lastMessage.content_encrypted ? "[رسالة]" : ""}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                      {conversations.length === 0 && !loading && (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>لا توجد محادثات بعد</p>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-border/50 flex flex-col">
              {selectedUser ? (
                <>
                  {/* Chat Header */}
                  <CardHeader className="border-b border-border/50 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={selectedUser.avatar_url || ""} />
                          <AvatarFallback>
                            {selectedUser.full_name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">
                            {selectedUser.full_name || "بدون اسم"}
                          </p>
                        </div>
                      </div>

                      {/* Call Buttons */}
                      <div className="flex items-center gap-2">
                        {communicationSettings.voiceCallsEnabled ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startCall("voice")}
                            title="مكالمة صوتية"
                          >
                            <Phone className="w-5 h-5 text-primary" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" disabled title="المكالمات الصوتية معطلة">
                            <PhoneOff className="w-5 h-5 text-muted-foreground" />
                          </Button>
                        )}
                        
                        {communicationSettings.videoCallsEnabled ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startCall("video")}
                            title="مكالمة فيديو"
                          >
                            <Video className="w-5 h-5 text-primary" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" disabled title="مكالمات الفيديو معطلة">
                            <VideoOff className="w-5 h-5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {/* Messages */}
                  <CardContent className="flex-1 p-0 overflow-hidden">
                    <ScrollArea className="h-[calc(100vh-420px)] p-4">
                      <div className="space-y-4">
                        {messages.map((msg, index) => {
                          const isMe = msg.sender_id === user?.id;
                          const showDate =
                            index === 0 ||
                            new Date(msg.created_at).toDateString() !==
                              new Date(messages[index - 1].created_at).toDateString();

                          return (
                            <div key={msg.id}>
                              {showDate && (
                                <div className="text-center my-4">
                                  <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
                                    {formatDate(msg.created_at)}
                                  </span>
                                </div>
                              )}
                              <div
                                className={cn(
                                  "flex",
                                  isMe ? "justify-start" : "justify-end"
                                )}
                              >
                                <div
                                  className={cn(
                                    "max-w-[70%] rounded-2xl px-4 py-2",
                                    isMe
                                      ? "bg-primary text-primary-foreground rounded-br-sm"
                                      : "bg-muted rounded-bl-sm"
                                  )}
                                >
                                  <p className="whitespace-pre-wrap">{msg.content_encrypted || ""}</p>
                                  
                                  {msg.file && (
                                    <button
                                      onClick={() =>
                                        handleFileDownload(msg.file!.file_path, msg.file!.name)
                                      }
                                      className={cn(
                                        "flex items-center gap-2 mt-2 p-2 rounded-lg transition-colors",
                                        isMe
                                          ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                                          : "bg-background/50 hover:bg-background"
                                      )}
                                    >
                                      <File className="w-4 h-4" />
                                      <span className="text-sm truncate max-w-[150px]">
                                        {msg.file.name}
                                      </span>
                                      <Download className="w-4 h-4" />
                                    </button>
                                  )}
                                  
                                  <p
                                    className={cn(
                                      "text-xs mt-1",
                                      isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                                    )}
                                  >
                                    {formatTime(msg.created_at)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                  </CardContent>

                  {/* Message Input */}
                  <div className="p-4 border-t border-border/50">
                    {selectedFile && (
                      <div className="flex items-center gap-2 mb-3 p-2 bg-muted rounded-lg">
                        <File className="w-4 h-4 text-primary" />
                        <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="w-5 h-5" />
                      </Button>
                      <Input
                        placeholder="اكتب رسالتك..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={sendingMessage || (!newMessage.trim() && !selectedFile) || !communicationSettings.chatMessagesEnabled}
                      >
                        <Send className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">اختر محادثة للبدء</p>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Disabled Chat Warning */}
          {!communicationSettings.chatMessagesEnabled && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                خدمة المراسلة معطلة حالياً. لا يمكن إرسال رسائل جديدة.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Video/Voice Call Modal */}
      {selectedUser && (
        <VideoCall
          targetUserId={selectedUser.id}
          targetUserName={selectedUser.full_name || "بدون اسم"}
          isOpen={isCallOpen}
          onClose={() => setIsCallOpen(false)}
          callType={callType}
        />
      )}
    </Layout>
  );
}