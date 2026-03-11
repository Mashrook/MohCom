import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { ServiceGuard } from "@/components/ServiceGuard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Sparkles, Upload, FileText, X, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useServiceTrial } from "@/hooks/useServiceTrial";
import { useAuth } from "@/contexts/AuthContext";
import { TrialBanner } from "@/components/TrialBanner";
import { validateFile, sanitizeFileName } from "@/utils/fileSecurityValidator";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UploadedFile {
  name: string;
  path: string;
  size: number;
}

const suggestedQuestions = [
  "ما هي حقوقي في حالة الفصل التعسفي؟",
  "كيف يمكنني تسجيل علامة تجارية؟",
  "ما هي إجراءات رفع دعوى قضائية؟",
  "ما هي شروط عقد الإيجار؟",
];

const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const Consultation = () => {
  const { toast } = useToast();
  const { subscription, user, session } = useAuth();
  const { hasUsedTrial, canAccessService, useTrial, loading: trialLoading } =
    useServiceTrial("consultation");
  
  const [trialActive, setTrialActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "مرحباً بك في محامي كوم للاستشارات القانونية! أنا مستشارك القانوني الذكي، كيف يمكنني مساعدتك اليوم؟ يمكنك أيضاً رفع مستندات لتحليلها.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const scrollToBottom = (smooth = true) => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? "smooth" : "instant",
      });
    }
  };

  const lastMessageCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      scrollToBottom();
      lastMessageCountRef.current = messages.length;
    }
  }, [messages.length]);

  const handleUseTrial = async () => {
    const success = await useTrial();
    if (success) {
      setTrialActive(true);
      toast({
        title: "تم تفعيل التجربة المجانية",
        description: "يمكنك الآن استخدام خدمة الاستشارات لمرة واحدة",
      });
    }
  };

  const canUseService = subscription.subscribed || trialActive || (!hasUsedTrial && user);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!user) {
      toast({
        title: "يرجى تسجيل الدخول",
        description: "يجب تسجيل الدخول لرفع الملفات",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const newFiles: UploadedFile[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file security (size, type, magic bytes)
        const validationResult = await validateFile(file, MAX_FILE_SIZE);
        
        if (!validationResult.isValid) {
          toast({
            title: "ملف غير صالح",
            description: `${file.name}: ${validationResult.error}`,
            variant: "destructive",
          });
          continue;
        }

        if (validationResult.warning) {
          toast({
            title: "تنبيه",
            description: validationResult.warning,
          });
        }

        const sanitizedName = sanitizeFileName(file.name);
        const fileExt = sanitizedName.split('.').pop()?.toLowerCase();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("prediction-files")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast({
            title: "خطأ في رفع الملف",
            description: `فشل رفع ${file.name}`,
            variant: "destructive",
          });
          continue;
        }

        newFiles.push({
          name: file.name,
          path: fileName,
          size: file.size,
        });
      }

      if (newFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...newFiles]);
        toast({
          title: "تم رفع الملفات",
          description: `تم رفع ${newFiles.length} ملف بنجاح`,
        });

        // Extract text from uploaded files
        await extractTextFromFiles([...uploadedFiles, ...newFiles]);
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء رفع الملفات",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const extractTextFromFiles = async (files: UploadedFile[]) => {
    if (files.length === 0) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) return;

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          filePaths: files.map(f => f.path),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.extractedText) {
          setExtractedText(data.extractedText);
          toast({
            title: "تم استخراج النص",
            description: `تم تحليل ${data.filesProcessed} ملف`,
          });
        }
      }
    } catch (error) {
      console.error("Text extraction error:", error);
    }
  };

  const removeFile = async (index: number) => {
    const file = uploadedFiles[index];
    
    try {
      await supabase.storage.from("prediction-files").remove([file.path]);
    } catch (error) {
      console.error("Error removing file:", error);
    }

    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    
    if (newFiles.length === 0) {
      setExtractedText("");
    } else {
      extractTextFromFiles(newFiles);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !extractedText) || isLoading) return;

    if (!subscription.subscribed && !trialActive && !hasUsedTrial && user) {
      const success = await useTrial();
      if (success) {
        setTrialActive(true);
      } else {
        toast({
          title: "يرجى الاشتراك",
          description: "لقد استخدمت التجربة المجانية. يرجى الاشتراك للمتابعة.",
          variant: "destructive",
        });
        return;
      }
    } else if (!subscription.subscribed && hasUsedTrial && !trialActive) {
      toast({
        title: "يرجى الاشتراك",
        description: "لقد استخدمت التجربة المجانية. يرجى الاشتراك للمتابعة.",
        variant: "destructive",
      });
      return;
    }

    // Combine user input with extracted text from files
    let fullContent = input.trim();
    if (extractedText) {
      fullContent = `${fullContent}\n\n--- محتوى الملفات المرفقة ---\n${extractedText}`;
    }

    const displayContent = uploadedFiles.length > 0 
      ? `${input.trim()}\n\n📎 ملفات مرفقة: ${uploadedFiles.map(f => f.name).join(', ')}`
      : input.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: displayContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = fullContent;
    setInput("");
    setIsLoading(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error getting session:", sessionError);
      }

      const accessToken = sessionData?.session?.access_token;
      const userId = sessionData?.session?.user?.id;

      if (!accessToken || !userId) {
        toast({
          title: "خطأ",
          description: "يرجى تسجيل الدخول مرة أخرى",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const apiMessages = messages
        .filter((m) => m.id !== "1")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));
      apiMessages.push({ role: "user", content: currentInput });

      const response = await fetch(`${SUPABASE_URL}/functions/v1/legal-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          type: "consultation",
          messages: apiMessages,
        }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({}));
        console.error("AI Error:", response.status, errorData);
        toast({
          title: "خطأ",
          description:
            errorData?.error || "حدث خطأ في التحليل، يرجى المحاولة مرة أخرى",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const contentType = response.headers.get("Content-Type") || "";
      const isStreaming = contentType.includes("text/event-stream");

      if (!isStreaming) {
        const data = await response.json();
        const content = data?.content || data?.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error("لم يتم استلام رد من خدمة الذكاء الاصطناعي");
        }

        const assistantMessage: Message = {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let streamDone = false;
        let assistantSoFar = "";

        const upsertAssistantMessage = (deltaText: string) => {
          assistantSoFar += deltaText;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
              );
            }
            return [
              ...prev,
              {
                id: `${Date.now()}-assistant`,
                role: "assistant",
                content: assistantSoFar,
                timestamp: new Date(),
              },
            ];
          });
        };

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          const lines = textBuffer.split("\n");
          textBuffer = lines.pop() || "";

          for (const rawLine of lines) {
            let line = rawLine;
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              streamDone = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (delta) {
                upsertAssistantMessage(delta);
              }
            } catch {
              console.warn("Failed to parse SSE line");
            }
          }
        }

        if (textBuffer.trim()) {
          const remainingLines = textBuffer.split("\n");
          for (let raw of remainingLines) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (delta) {
                upsertAssistantMessage(delta);
              }
            } catch {
              // تجاهل البيانات غير الصالحة
            }
          }
        }
      }

      // Clear files after successful send
      setUploadedFiles([]);
      setExtractedText("");
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "خطأ",
        description:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع أثناء الاتصال بالخدمة",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  return (
    <Layout>
      <SEO 
        title="الاستشارات القانونية"
        description="احصل على استشارة قانونية فورية من المستشار القانوني الذكي. إجابات مدعومة بالأنظمة واللوائح السعودية على مدار الساعة."
        url="/consultation"
        keywords="استشارة قانونية, مستشار قانوني ذكي, استشارات قانونية فورية, محامي اونلاين, استشارة قانونية سعودية"
      />
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-[2fr,1fr] gap-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-golden flex items-center justify-center">
                  <Bot className="w-6 h-6 text-navy-900" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 font-cairo">
                    المستشار القانوني الذكي
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground font-tajawal">
                      <Sparkles className="w-4 h-4 text-golden" />
                      مدعوم بالذكاء الاصطناعي
                    </span>
                  </h1>
                  <p className="text-muted-foreground text-sm font-tajawal">
                    اطلب استشارتك القانونية في أي وقت واحصل على إجابة فورية مدعومة بالأنظمة واللوائح السعودية
                  </p>
                </div>
              </div>

              {user && !trialLoading && (
                <div className="mb-4">
                  <TrialBanner
                    hasUsedTrial={hasUsedTrial}
                    isSubscribed={subscription.subscribed}
                    onUseTrial={handleUseTrial}
                  />
                </div>
              )}

              <div className="border border-golden/20 rounded-2xl bg-navy-900/40 backdrop-blur-sm overflow-hidden flex flex-col h-[70vh]">
                <div className="px-4 py-3 border-b border-golden/10 flex items-center justify-between bg-navy-900/60">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-golden flex items-center justify-center">
                      <Bot className="w-4 h-4 text-navy-900" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground font-tajawal">مستشارك القانوني</p>
                      <p className="text-xs text-muted-foreground font-tajawal">يرد خلال ثوانٍ معدودة</p>
                    </div>
                  </div>
                  {isLoading && (
                    <div className="flex items-center gap-2 text-xs text-golden font-tajawal">
                      <span className="w-2 h-2 rounded-full bg-golden animate-pulse" />
                      جاري التحليل...
                    </div>
                  )}
                </div>

                {/* Messages Area */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn("flex gap-3", {
                        "flex-row-reverse text-right": message.role === "user",
                      })}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          message.role === "user"
                            ? "bg-gradient-golden text-navy-900"
                            : "bg-navy-800 text-golden"
                        )}
                      >
                        {message.role === "user" ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>
                      <div
                        className={cn("max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed font-tajawal", {
                          "bg-gradient-golden text-navy-900 rounded-br-none": message.role === "user",
                          "bg-navy-800/80 text-foreground border border-golden/10 rounded-bl-none":
                            message.role === "assistant",
                        })}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="mt-1 text-[10px] opacity-70">
                          {message.timestamp.toLocaleTimeString("ar-SA", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input Area */}
                <div className="border-t border-golden/10 bg-navy-900/80 p-3">
                  {!canUseService && (
                    <div className="mb-2 text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2 font-tajawal">
                      لقد استخدمت التجربة المجانية لهذه الخدمة. يرجى الاشتراك للمتابعة.
                    </div>
                  )}

                  {/* Uploaded Files Display */}
                  {uploadedFiles.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 bg-navy-800/60 border border-golden/20 rounded-lg px-3 py-1.5 text-xs"
                        >
                          <FileText className="w-3 h-3 text-golden" />
                          <span className="text-foreground font-tajawal max-w-[150px] truncate">{file.name}</span>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="message" className="text-xs text-muted-foreground font-tajawal">
                          اكتب سؤالك القانوني أو ارفق مستنداً لتحليله
                        </Label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleSuggestedQuestion(suggestedQuestions[0])}
                            className="text-[10px] text-golden hover:underline font-tajawal"
                          >
                            مثال سريع
                          </button>
                        </div>
                      </div>
                      <Textarea
                        id="message"
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                          canUseService
                            ? "اكتب استشارتك القانونية هنا..."
                            : "تحتاج إلى تفعيل التجربة أو الاشتراك لاستخدام الخدمة"
                        }
                        disabled={!canUseService || isLoading}
                        className="min-h-[60px] max-h-[120px] bg-navy-900/80 border-golden/30 text-foreground text-base resize-none font-tajawal"
                        rows={3}
                        autoComplete="off"
                        autoCorrect="on"
                        autoCapitalize="sentences"
                        spellCheck={true}
                        inputMode="text"
                        style={{
                          fontSize: "16px",
                          WebkitAppearance: "none",
                          WebkitUserSelect: "text",
                          userSelect: "text",
                          touchAction: "manipulation",
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                      />
                    </div>

                    {/* File Upload Button */}
                    <div className="flex flex-col gap-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept={ACCEPTED_FILE_TYPES}
                        multiple
                        className="hidden"
                        disabled={!canUseService || isLoading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!canUseService || isLoading || isUploading}
                        className="h-9 w-9 border-golden/30 text-golden hover:bg-golden/10"
                        title="رفع ملف"
                      >
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    <Button
                      onClick={handleSend}
                      disabled={!canUseService || isLoading || (!input.trim() && !extractedText)}
                      className="h-9 w-20 bg-gradient-golden text-navy-900 hover:opacity-90 font-tajawal"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-navy-900 animate-ping" />
                          جاري
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          إرسال
                          <Send className="w-3 h-3" />
                        </span>
                      )}
                    </Button>
                  </div>

                  {/* Suggested Questions */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggestedQuestions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => handleSuggestedQuestion(question)}
                        className="text-xs px-3 py-1 rounded-full bg-navy-800/70 border border-golden/20 text-golden hover:bg-navy-700/80 transition-colors font-tajawal"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Side Panel */}
            <aside className="space-y-4">
              <div className="rounded-2xl border border-golden/20 bg-navy-900/60 p-4">
                <h2 className="text-sm font-semibold text-golden mb-2 flex items-center gap-2 font-cairo">
                  <Sparkles className="w-4 h-4" />
                  نصائح لكتابة استشارة فعالة
                </h2>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pr-4 font-tajawal">
                  <li>اذكر نوع القضية (عملية، تجارية، عقارية، أحوال شخصية، إلخ)</li>
                  <li>وضح الوقائع بالتسلسل الزمني مع ذكر التواريخ المهمة إن أمكن</li>
                  <li>بيّن ما إذا كانت هناك عقود أو مستندات متعلقة بالموضوع</li>
                  <li>اذكر ما ترغب في الوصول إليه (تعويض، فسخ عقد، شكوى، إلخ)</li>
                  <li>يمكنك رفع مستندات (PDF, Word, صور) لتحليلها</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-golden/20 bg-navy-900/60 p-4">
                <h2 className="text-sm font-semibold text-golden mb-2 flex items-center gap-2 font-cairo">
                  <Upload className="w-4 h-4" />
                  الملفات المدعومة
                </h2>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pr-4 font-tajawal">
                  <li>PDF (مستندات ممسوحة ضوئياً مدعومة)</li>
                  <li>Word (DOC, DOCX)</li>
                  <li>ملفات نصية (TXT)</li>
                  <li>صور (JPG, PNG, GIF, WEBP)</li>
                  <li>الحد الأقصى: 10 ميجابايت لكل ملف</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-golden/20 bg-navy-900/60 p-4 text-xs text-muted-foreground space-y-2 font-tajawal">
                <p className="font-semibold text-golden font-cairo">تنبيه مهم</p>
                <p>
                  هذه الخدمة تقدم استشارات قانونية مبدئية مبنية على الأنظمة واللوائح السعودية. لا تغني عن الاستشارة المباشرة مع محامٍ
                  مرخص خاصة في القضايا المعقدة أو التي تتطلب تمثيلاً أمام الجهات القضائية.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export const ConsultationPage = () => (
  <ServiceGuard sectionKey="consultation">
    <Consultation />
  </ServiceGuard>
);

export default ConsultationPage;
