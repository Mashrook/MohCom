import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, ExternalLink, Loader2, Bot, User, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatHistory {
  id: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

const WHATSAPP_NUMBER = "+966531099732";
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;

const INITIAL_MESSAGE: Message = {
  id: "1",
  text: "مرحباً! 👋 أنا مساعدك الذكي في محامي كوم. كيف يمكنني مساعدتك اليوم؟",
  isUser: false,
  timestamp: new Date(),
};

export const SupportChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load chat history for logged-in users
  useEffect(() => {
    if (user && isOpen) {
      loadChatHistory();
    }
  }, [user, isOpen]);

  const loadChatHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("support_chats")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setChatHistory(data.map(chat => ({
        ...chat,
        messages: (chat.messages as any[]).map(m => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
      })));
    }
  };

  const saveChat = async (updatedMessages: Message[]) => {
    if (!user) return;

    const messagesToSave = updatedMessages.map(m => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    }));

    if (currentChatId) {
      await supabase
        .from("support_chats")
        .update({ messages: messagesToSave })
        .eq("id", currentChatId);
    } else {
      const { data } = await supabase
        .from("support_chats")
        .insert({ user_id: user.id, messages: messagesToSave })
        .select()
        .single();
      
      if (data) {
        setCurrentChatId(data.id);
      }
    }
  };

  const loadChat = (chat: ChatHistory) => {
    setMessages(chat.messages);
    setCurrentChatId(chat.id);
    setShowHistory(false);
  };

  const startNewChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setCurrentChatId(null);
    setShowHistory(false);
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from("support_chats")
      .delete()
      .eq("id", chatId);

    if (!error) {
      setChatHistory(prev => prev.filter(c => c.id !== chatId));
      if (currentChatId === chatId) {
        startNewChat();
      }
      toast({ title: "تم حذف المحادثة" });
    }
  };

  const streamChat = async (userMessages: { role: string; content: string }[]) => {
    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ messages: userMessages }),
    });

    if (!response.ok || !response.body) {
      throw new Error("فشل الاتصال بالمساعد الذكي");
    }

    return response;
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setIsLoading(true);

    const apiMessages = messages
      .filter((m) => m.id !== "1")
      .map((m) => ({
        role: m.isUser ? "user" : "assistant",
        content: m.text,
      }));
    apiMessages.push({ role: "user", content: inputValue });

    try {
      const response = await streamChat(apiMessages);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantText = "";
      const assistantId = (Date.now() + 1).toString();

      const newMessages = [
        ...updatedMessages,
        { id: assistantId, text: "", isUser: false, timestamp: new Date() },
      ];
      setMessages(newMessages);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantText += content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, text: assistantText } : m
                )
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantText += content;
            }
          } catch {}
        }
      }

      // Save final messages
      const finalMessages = updatedMessages.concat({
        id: assistantId,
        text: assistantText,
        isUser: false,
        timestamp: new Date(),
      });
      setMessages(finalMessages);
      
      if (user) {
        await saveChat(finalMessages);
        await loadChatHistory();
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "عذراً، حدث خطأ في الاتصال. يمكنك التواصل مع الدعم الفني عبر الواتساب.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppTransfer = () => {
    const conversationSummary = messages
      .slice(-5)
      .map((m) => `${m.isUser ? "أنا" : "المساعد"}: ${m.text}`)
      .join("\n");

    const whatsappMessage = encodeURIComponent(
      `مرحباً، أحتاج مساعدة من فريق الدعم الفني 🆘\n\n--- ملخص المحادثة ---\n${conversationSummary}`
    );

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER.replace("+", "")}?text=${whatsappMessage}`,
      "_blank"
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-SA", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-xl",
          isOpen && "scale-0 opacity-0"
        )}
        aria-label="فتح الدردشة"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-6 left-6 z-50 w-[360px] h-[520px] bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden transition-all duration-300",
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">المساعد الذكي</h3>
              <p className="text-white/80 text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                متصل الآن
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                title="سجل المحادثات"
              >
                <History className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* WhatsApp Banner */}
        <button
          onClick={handleWhatsAppTransfer}
          className="bg-green-50 dark:bg-green-900/20 px-4 py-2.5 flex items-center justify-center gap-2 text-green-700 dark:text-green-400 text-sm hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors border-b border-border"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <span>تحتاج مساعدة بشرية؟ تواصل مع الدعم</span>
          <ExternalLink className="w-4 h-4" />
        </button>

        {/* History Panel */}
        {showHistory && user && (
          <div className="absolute inset-0 top-[120px] bg-card z-10 flex flex-col">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h4 className="font-bold text-sm">سجل المحادثات</h4>
              <Button size="sm" variant="outline" onClick={startNewChat}>
                محادثة جديدة
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
              {chatHistory.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm p-4">
                  لا توجد محادثات سابقة
                </p>
              ) : (
                chatHistory.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => loadChat(chat)}
                    className={cn(
                      "w-full p-3 text-right border-b border-border hover:bg-muted/50 transition-colors flex items-center justify-between group",
                      currentChatId === chat.id && "bg-muted"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {chat.messages.find(m => m.isUser)?.text || "محادثة جديدة"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(chat.updated_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteChat(chat.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded text-destructive transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="p-3 text-center text-sm text-primary hover:bg-muted/50 border-t border-border"
            >
              إغلاق السجل
            </button>
          </div>
        )}

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2 items-end",
                message.isUser ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
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
                  "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  message.isUser
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                )}
              >
                {message.text || (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    جاري الكتابة...
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-background">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="اكتب رسالتك..."
              className="flex-1 text-sm rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              size="icon"
              className="rounded-full bg-primary hover:bg-primary/90 w-10 h-10"
              disabled={!inputValue.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
