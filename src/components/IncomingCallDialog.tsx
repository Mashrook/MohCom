import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video, User } from "lucide-react";

interface IncomingCallDialogProps {
  isOpen: boolean;
  callerName: string;
  callerAvatar?: string;
  callType: 'video' | 'voice';
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({
  isOpen,
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onReject
}) => {
  const [isRinging, setIsRinging] = useState(true);

  // Pulse animation for ringing effect
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      setIsRinging(prev => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md bg-gradient-to-b from-card to-background border-primary/20"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center py-8 space-y-6">
          {/* Caller Avatar with Pulse Effect */}
          <div className={`relative ${isRinging ? 'animate-pulse' : ''}`}>
            <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" />
            <Avatar className="w-24 h-24 border-4 border-primary/50">
              <AvatarImage src={callerAvatar} alt={callerName} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                <User className="w-12 h-12" />
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Caller Info */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">{callerName}</h3>
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              {callType === 'video' ? (
                <>
                  <Video className="w-4 h-4" />
                  <span>مكالمة فيديو واردة</span>
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  <span>مكالمة صوتية واردة</span>
                </>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-8">
            {/* Reject Button */}
            <Button
              variant="destructive"
              size="lg"
              className="w-16 h-16 rounded-full p-0 bg-red-500 hover:bg-red-600"
              onClick={onReject}
            >
              <PhoneOff className="w-8 h-8" />
            </Button>

            {/* Accept Button */}
            <Button
              size="lg"
              className="w-16 h-16 rounded-full p-0 bg-green-500 hover:bg-green-600"
              onClick={onAccept}
            >
              {callType === 'video' ? (
                <Video className="w-8 h-8" />
              ) : (
                <Phone className="w-8 h-8" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallDialog;
