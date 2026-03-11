import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { ServiceGuard } from "@/components/ServiceGuard";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Star, 
  MessageSquare, 
  Phone, 
  Video,
  Filter,
  MapPin,
  Briefcase,
  Award,
  Clock,
  ChevronLeft,
  X,
  Send,
  Paperclip,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Loader2,
  Users,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLawyers } from "@/hooks/useLawyers";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Lawyer {
  id: string;
  name: string;
  specialty: string;
  experience: number;
  rating: number;
  reviews: number;
  hourlyRate: number;
  location: string;
  available: boolean;
  avatar: string;
  badges: string[];
  userId: string;
}

// No more dummy lawyers - only real lawyers from database

const specialties = [
  "الكل",
  "القانون التجاري",
  "قانون الأسرة",
  "القانون الجنائي",
  "قانون العمل",
  "القانون العقاري",
  "الملكية الفكرية",
];

const locations = ["الكل", "الرياض", "جدة", "الدمام", "مكة"];

type ChatMode = "text" | "voice" | "video" | null;

interface Message {
  id: string;
  sender: "user" | "lawyer";
  content: string;
  timestamp: Date;
}

const Lawyers = () => {
  const { toast } = useToast();
  const { isLawyer, isAdmin } = useAuth();
  
  // Handle availability change notifications
  const handleAvailabilityChange = useCallback((change: { lawyerName: string; isAvailable: boolean }) => {
    toast({
      title: change.isAvailable ? "🟢 محامي متصل" : "⚪ محامي غير متصل",
      description: change.isAvailable 
        ? `${change.lawyerName} أصبح متاحاً الآن`
        : `${change.lawyerName} لم يعد متاحاً`,
      duration: 4000,
    });
  }, [toast]);
  
  const { lawyers: realLawyers, loading, error } = useLawyers(handleAvailabilityChange);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("الكل");
  const [selectedLocation, setSelectedLocation] = useState("الكل");
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState<string | null>(null);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast({
        title: "خطأ",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Only use real lawyers from database
  const lawyers = realLawyers;
  const onlineLawyers = lawyers.filter(l => l.available);

  const filteredLawyers = lawyers.filter((lawyer) => {
    const matchesSearch = lawyer.name.includes(searchQuery) || lawyer.specialty.includes(searchQuery);
    const matchesSpecialty = selectedSpecialty === "الكل" || lawyer.specialty === selectedSpecialty;
    const matchesLocation = selectedLocation === "الكل" || lawyer.location === selectedLocation;
    return matchesSearch && matchesSpecialty && matchesLocation;
  });

  const handleToggleAvailability = async (userId: string, currentStatus: boolean) => {
    setTogglingAvailability(userId);
    try {
      const { error } = await supabase
        .from("lawyer_profiles")
        .update({ is_available: !currentStatus })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: !currentStatus ? "تم تفعيل توفر المحامي" : "تم إيقاف توفر المحامي",
      });
      
      // Refresh will happen via realtime subscription in useLawyers
    } catch (error) {
      console.error("Error toggling availability:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة التوفر",
        variant: "destructive",
      });
    } finally {
      setTogglingAvailability(null);
    }
  };

  const startChat = (lawyer: Lawyer, mode: ChatMode) => {
    if (!lawyer.available && mode !== "text") {
      toast({
        title: "المحامي غير متاح",
        description: "هذا المحامي غير متاح للمكالمات حالياً",
        variant: "destructive",
      });
      return;
    }
    setSelectedLawyer(lawyer);
    setChatMode(mode);
    setMessages([
      {
        id: "1",
        sender: "lawyer",
        content: `مرحباً، أنا ${lawyer.name}. كيف يمكنني مساعدتك اليوم؟`,
        timestamp: new Date(),
      },
    ]);
    if (mode === "voice" || mode === "video") {
      setIsCallActive(true);
      toast({
        title: mode === "voice" ? "جاري الاتصال الصوتي..." : "جاري اتصال الفيديو...",
        description: `الاتصال بـ ${lawyer.name}`,
      });
    }
  };

  const endChat = () => {
    if (isCallActive) {
      toast({
        title: "تم إنهاء المكالمة",
        description: `مدة المكالمة: ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, "0")}`,
      });
    }
    setSelectedLawyer(null);
    setChatMode(null);
    setMessages([]);
    setIsCallActive(false);
    setCallDuration(0);
  };

  const sendMessage = () => {
    if (!inputMessage.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      content: inputMessage,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");

    // Simulate lawyer response
    setTimeout(() => {
      const lawyerResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: "lawyer",
        content: "شكراً لسؤالك. دعني أوضح لك الأمر بالتفصيل...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, lawyerResponse]);
    }, 1500);
  };

  return (
    <Layout>
      <section className="py-12 min-h-screen">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              تجمع المحامين
            </span>
            <h1 className="font-cairo font-bold text-3xl md:text-4xl text-foreground mb-4">
              تواصل مع نخبة المحامين
            </h1>
            <p className="text-muted-foreground mb-6">
              اختر محاميك وتواصل معه مباشرة عبر الدردشة الكتابية أو الصوتية أو الفيديو
            </p>
            <Button
              variant="golden-outline"
              onClick={() => window.location.href = "/lawyer-apply"}
            >
              <Briefcase className="w-4 h-4 ml-2" />
              هل أنت محامي؟ انضم إلينا
            </Button>
          </div>

          {!selectedLawyer ? (
            <>
              {/* Search & Filters */}
              <div className="bg-card rounded-2xl border border-border p-6 mb-8">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث عن محامي..."
                      className="w-full bg-muted/50 border border-border rounded-xl pr-12 pl-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  {/* Specialty Filter */}
                  <div className="flex gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Filter className="w-4 h-4" />
                      <span className="text-sm">التخصص:</span>
                    </div>
                    <select
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                      className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {specialties.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div className="flex gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">المدينة:</span>
                    </div>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {locations.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Online Lawyers Panel - Visible only to lawyers */}
              {isLawyer && onlineLawyers.length > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="font-semibold text-foreground">
                      المحامون المتصلون الآن ({onlineLawyers.length})
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {onlineLawyers.map((lawyer) => (
                      <div
                        key={lawyer.id}
                        className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border border-border"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-golden flex items-center justify-center text-sm font-bold text-primary-foreground">
                          {lawyer.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{lawyer.name}</p>
                          <p className="text-xs text-muted-foreground">{lawyer.specialty}</p>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Availability Controls */}
              {isAdmin && lawyers.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-4 mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">
                      تحكم الأدمن - حالة توفر المحامين
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {lawyers.map((lawyer) => (
                      <div
                        key={lawyer.id}
                        className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 border border-border"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-golden flex items-center justify-center text-sm font-bold text-primary-foreground">
                            {lawyer.avatar}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{lawyer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {lawyer.available ? "متوفر" : "غير متوفر"}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAvailability(lawyer.userId, lawyer.available)}
                          disabled={togglingAvailability === lawyer.userId}
                          className={cn(
                            "gap-1",
                            lawyer.available ? "text-emerald-500" : "text-muted-foreground"
                          )}
                        >
                          {togglingAvailability === lawyer.userId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : lawyer.available ? (
                            <ToggleRight className="w-5 h-5" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lawyers Grid */}
              {loading ? (
                <div className="col-span-full flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : lawyers.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <div className="max-w-md mx-auto">
                    <div className="w-24 h-24 rounded-full bg-gradient-golden/20 flex items-center justify-center mx-auto mb-6">
                      <Briefcase className="w-12 h-12 text-primary" />
                    </div>
                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                      قريباً
                    </span>
                    <h3 className="text-2xl font-bold text-foreground mb-3">
                      نعمل على توفير نخبة من المحامين المرخصين
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      سيتم إطلاق قسم المحامين قريباً مع مجموعة من أفضل المحامين المرخصين في المملكة العربية السعودية
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Award className="w-4 h-4 text-primary" />
                      <span>محامون معتمدون ومرخصون</span>
                    </div>
                  </div>
                </div>
              ) : filteredLawyers.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    لا توجد نتائج
                  </h3>
                  <p className="text-muted-foreground">
                    جرب تغيير معايير البحث
                  </p>
                </div>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {!loading && filteredLawyers.map((lawyer) => (
                  <div
                    key={lawyer.id}
                    className="bg-card rounded-2xl border border-border p-6 hover:border-primary/50 transition-all duration-300 hover-lift"
                  >
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-golden flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-golden">
                        {lawyer.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-cairo font-semibold text-lg text-foreground">
                            {lawyer.name}
                          </h3>
                          {lawyer.available ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                          )}
                        </div>
                        <p className="text-primary text-sm font-medium">{lawyer.specialty}</p>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {lawyer.badges.map((badge) => (
                        <span
                          key={badge}
                          className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{lawyer.experience} سنة خبرة</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="w-4 h-4 text-primary fill-primary" />
                        <span className="text-foreground">{lawyer.rating} ({lawyer.reviews})</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{lawyer.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{lawyer.hourlyRate} ر.س/ساعة</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="golden"
                        size="sm"
                        className="flex-1"
                        onClick={() => startChat(lawyer, "text")}
                      >
                        <MessageSquare className="w-4 h-4" />
                        دردشة
                      </Button>
                      <Button
                        variant="golden-outline"
                        size="icon"
                        onClick={() => startChat(lawyer, "voice")}
                        disabled={!lawyer.available}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="golden-outline"
                        size="icon"
                        onClick={() => startChat(lawyer, "video")}
                        disabled={!lawyer.available}
                      >
                        <Video className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Chat/Call Interface */
            <div className="max-w-4xl mx-auto">
              <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-card">
                {/* Chat Header */}
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={endChat}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-foreground" />
                    </button>
                    <div className="w-12 h-12 rounded-xl bg-gradient-golden flex items-center justify-center text-lg font-bold text-primary-foreground">
                      {selectedLawyer.avatar}
                    </div>
                    <div>
                      <h3 className="font-cairo font-semibold text-foreground">
                        {selectedLawyer.name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          selectedLawyer.available ? "bg-emerald-500" : "bg-muted-foreground"
                        )} />
                        {selectedLawyer.available ? "متصل الآن" : "غير متصل"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {chatMode === "text" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startChat(selectedLawyer, "voice")}
                          disabled={!selectedLawyer.available}
                        >
                          <Phone className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startChat(selectedLawyer, "video")}
                          disabled={!selectedLawyer.available}
                        >
                          <Video className="w-5 h-5" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" onClick={endChat}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Video/Voice Call Area */}
                {(chatMode === "voice" || chatMode === "video") && (
                  <div className="relative bg-navy-primary aspect-video flex items-center justify-center">
                    {chatMode === "video" && !isVideoOff ? (
                      <div className="absolute inset-0 bg-gradient-to-br from-navy-secondary to-navy-primary flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-32 h-32 rounded-full bg-gradient-golden flex items-center justify-center text-5xl font-bold text-primary-foreground mx-auto mb-4 shadow-golden-lg animate-pulse-golden">
                            {selectedLawyer.avatar}
                          </div>
                          <p className="text-foreground font-cairo font-semibold text-xl">
                            {selectedLawyer.name}
                          </p>
                          <p className="text-muted-foreground">جاري الاتصال...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="w-32 h-32 rounded-full bg-gradient-golden flex items-center justify-center text-5xl font-bold text-primary-foreground mx-auto mb-4 shadow-golden-lg animate-pulse-golden">
                          {selectedLawyer.avatar}
                        </div>
                        <p className="text-foreground font-cairo font-semibold text-xl">
                          {selectedLawyer.name}
                        </p>
                        <p className="text-primary text-lg">
                          {chatMode === "voice" ? "مكالمة صوتية" : "مكالمة فيديو"}
                        </p>
                      </div>
                    )}

                    {/* Call Controls */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
                      <Button
                        variant={isMuted ? "destructive" : "secondary"}
                        size="lg"
                        className="rounded-full w-14 h-14"
                        onClick={() => setIsMuted(!isMuted)}
                      >
                        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                      </Button>
                      {chatMode === "video" && (
                        <Button
                          variant={isVideoOff ? "destructive" : "secondary"}
                          size="lg"
                          className="rounded-full w-14 h-14"
                          onClick={() => setIsVideoOff(!isVideoOff)}
                        >
                          {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="lg"
                        className="rounded-full w-14 h-14"
                        onClick={endChat}
                      >
                        <PhoneOff className="w-6 h-6" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Messages Area */}
                {chatMode === "text" && (
                  <div className="h-[400px] overflow-y-auto p-6 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          message.sender === "user" ? "flex-row-reverse" : ""
                        )}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold",
                            message.sender === "lawyer"
                              ? "bg-gradient-golden text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {message.sender === "lawyer" ? selectedLawyer.avatar : "أ"}
                        </div>
                        <div
                          className={cn(
                            "max-w-[75%] p-4 rounded-2xl",
                            message.sender === "lawyer"
                              ? "bg-muted/50 rounded-tr-none"
                              : "bg-primary/10 rounded-tl-none"
                          )}
                        >
                          <p className="text-foreground leading-relaxed">{message.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {message.timestamp.toLocaleTimeString("ar-SA", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input Area (for text chat) */}
                {chatMode === "text" && (
                  <div className="p-4 border-t border-border bg-background/50">
                    <div className="flex gap-3">
                      <button className="p-3 rounded-xl bg-muted/50 text-muted-foreground hover:bg-muted transition-colors">
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <button className="p-3 rounded-xl bg-muted/50 text-muted-foreground hover:bg-muted transition-colors">
                        <Mic className="w-5 h-5" />
                      </button>
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="اكتب رسالتك..."
                        className="flex-1 bg-muted/50 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim()}
                        variant="golden"
                        size="lg"
                        className="px-6"
                      >
                        <Send className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lawyer Info Card (during chat) */}
              <div className="mt-6 p-6 bg-card rounded-2xl border border-border">
                <h4 className="font-cairo font-semibold text-foreground mb-4">معلومات المحامي</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-xl bg-muted/30">
                    <Briefcase className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{selectedLawyer.experience}</p>
                    <p className="text-sm text-muted-foreground">سنوات الخبرة</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/30">
                    <Star className="w-6 h-6 text-primary fill-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{selectedLawyer.rating}</p>
                    <p className="text-sm text-muted-foreground">التقييم</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/30">
                    <Award className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{selectedLawyer.reviews}</p>
                    <p className="text-sm text-muted-foreground">تقييم</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/30">
                    <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{selectedLawyer.hourlyRate}</p>
                    <p className="text-sm text-muted-foreground">ر.س/ساعة</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

const LawyersPage = () => (
  <ServiceGuard sectionKey="lawyers">
    <Lawyers />
  </ServiceGuard>
);

export default LawyersPage;
