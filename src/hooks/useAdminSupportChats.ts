import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

export interface SupportChat {
  id: string;
  user_id: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

export const useAdminSupportChats = () => {
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchChats = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("support_chats")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each chat
      const chatsWithUsers = await Promise.all(
        (data || []).map(async (chat) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", chat.user_id)
            .maybeSingle();

          // Get user email via RPC function
          let userEmail = "";
          try {
            const { data: email } = await supabase.rpc("get_user_email_for_admin", {
              target_user_id: chat.user_id,
            });
            userEmail = email || "";
          } catch {
            userEmail = "";
          }

          return {
            ...chat,
            messages: (chat.messages as any[]) || [],
            user_name: profile?.full_name || "مستخدم",
            user_email: userEmail,
          };
        })
      );

      setChats(chatsWithUsers);
    } catch (error) {
      console.error("Error fetching support chats:", error);
      toast({
        title: "خطأ في تحميل المحادثات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const deleteChat = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from("support_chats")
        .delete()
        .eq("id", chatId);

      if (error) throw error;

      setChats((prev) => prev.filter((c) => c.id !== chatId));
      toast({ title: "تم حذف المحادثة بنجاح" });
      return true;
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast({
        title: "خطأ في حذف المحادثة",
        variant: "destructive",
      });
      return false;
    }
  };

  const addAdminReply = async (chatId: string, replyText: string) => {
    try {
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) return false;

      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `[رد المسؤول] ${replyText}`,
        isUser: false,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...chat.messages, newMessage];

      // Convert to JSON-compatible format
      const messagesForDb = updatedMessages.map(m => ({
        id: m.id,
        text: m.text,
        isUser: m.isUser,
        timestamp: m.timestamp,
      }));

      const { error } = await supabase
        .from("support_chats")
        .update({ messages: messagesForDb as unknown as any })
        .eq("id", chatId);

      if (error) throw error;

      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, messages: updatedMessages, updated_at: new Date().toISOString() }
            : c
        )
      );

      toast({ title: "تم إضافة الرد بنجاح" });
      return true;
    } catch (error) {
      console.error("Error adding reply:", error);
      toast({
        title: "خطأ في إضافة الرد",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  return {
    chats,
    isLoading,
    fetchChats,
    deleteChat,
    addAdminReply,
  };
};
