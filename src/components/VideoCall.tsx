import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Video, Phone, PhoneOff, X, Loader2 } from "lucide-react";
import { useCallNotifications } from "@/hooks/useCallNotifications";

interface VideoCallProps {
  targetUserId: string;
  targetUserName: string;
  isOpen: boolean;
  onClose: () => void;
  callType: "video" | "voice";
  callNotificationId?: string; // Optional: if joining an existing call
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export function VideoCall({ targetUserId, targetUserName, isOpen, onClose, callType, callNotificationId }: VideoCallProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const { createCallNotification, endCall } = useCallNotifications();
  const [currentCallId, setCurrentCallId] = useState<string | null>(callNotificationId || null);

  useEffect(() => {
    if (!isOpen || !user || !targetUserId) return;

    const initJitsi = async () => {
      setLoading(true);
      setError(null);

      try {
        // Create call notification if not joining an existing call
        if (!callNotificationId) {
          const roomIds = [user.id, targetUserId].sort().join("-");
          const roomName = `mohamie-${roomIds}`;
          const notification = await createCallNotification(targetUserId, callType, roomName);
          if (notification) {
            setCurrentCallId(notification.id);
          }
        }

        // Get session for authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error("No active session");
        }

        // Generate unique room name
        const roomIds = [user.id, targetUserId].sort().join("-");
        const roomName = `mohamie-${roomIds}`;

        // Get Jitsi token from edge function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jitsi-token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              roomName,
              targetUserId,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get call token");
        }

        const { token, domain, appId } = await response.json();

        // Load Jitsi API script if not already loaded
        if (!window.JitsiMeetExternalAPI) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://8x8.vc/external_api.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Jitsi script"));
            document.head.appendChild(script);
          });
        }

        // Initialize Jitsi Meet
        if (jitsiContainerRef.current) {
          apiRef.current = new window.JitsiMeetExternalAPI(domain, {
            roomName: `${appId}/${roomName}`,
            jwt: token,
            parentNode: jitsiContainerRef.current,
            width: "100%",
            height: "100%",
            configOverwrite: {
              startWithAudioMuted: false,
              startWithVideoMuted: callType === "voice",
              disableModeratorIndicator: true,
              enableWelcomePage: false,
              prejoinPageEnabled: false,
              disableDeepLinking: true,
              lang: "ar",
            },
            interfaceConfigOverwrite: {
              TOOLBAR_BUTTONS: [
                "microphone",
                "camera",
                "closedcaptions",
                "desktop",
                "fullscreen",
                "fodeviceselection",
                "hangup",
                "chat",
                "settings",
                "raisehand",
                "videoquality",
                "tileview",
              ],
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
              DEFAULT_BACKGROUND: "#0A0E27",
              DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
              MOBILE_APP_PROMO: false,
            },
          });

          apiRef.current.addListener("readyToClose", () => {
            onClose();
          });

          apiRef.current.addListener("videoConferenceLeft", () => {
            onClose();
          });
        }

        setLoading(false);
      } catch (err) {
        console.error("Error initializing Jitsi:", err);
        setError(err instanceof Error ? err.message : "حدث خطأ في بدء المكالمة");
        setLoading(false);
        toast({
          title: "خطأ",
          description: "فشل في بدء المكالمة",
          variant: "destructive",
        });
      }
    };

    initJitsi();

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [isOpen, user, targetUserId, callType, toast, onClose, callNotificationId, createCallNotification]);

  const handleEndCall = async () => {
    if (currentCallId) {
      await endCall(currentCallId);
    }
    if (apiRef.current) {
      apiRef.current.executeCommand("hangup");
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0">
        <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            {callType === "video" ? (
              <Video className="w-5 h-5 text-primary" />
            ) : (
              <Phone className="w-5 h-5 text-primary" />
            )}
            {callType === "video" ? "مكالمة فيديو" : "مكالمة صوتية"} مع {targetUserName}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndCall}
              className="flex items-center gap-2"
            >
              <PhoneOff className="w-4 h-4" />
              إنهاء المكالمة
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 relative bg-background" style={{ height: "calc(80vh - 80px)" }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">جاري بدء المكالمة...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-center">
                <PhoneOff className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={onClose}>إغلاق</Button>
              </div>
            </div>
          )}

          <div ref={jitsiContainerRef} className="w-full h-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
