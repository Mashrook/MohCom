import React, { useState } from "react";
import { useCallNotifications } from "@/hooks/useCallNotifications";
import IncomingCallDialog from "@/components/IncomingCallDialog";
import { VideoCall } from "@/components/VideoCall";

const CallNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { incomingCall, acceptCall, rejectCall } = useCallNotifications();
  const [activeCall, setActiveCall] = useState<{
    targetUserId: string;
    targetUserName: string;
    callType: 'video' | 'voice';
    callNotificationId: string;
  } | null>(null);

  const handleAcceptCall = async () => {
    if (incomingCall) {
      await acceptCall(incomingCall.id);
      setActiveCall({
        targetUserId: incomingCall.caller_id,
        targetUserName: incomingCall.caller_name || 'مستخدم',
        callType: incomingCall.call_type,
        callNotificationId: incomingCall.id
      });
    }
  };

  const handleRejectCall = async () => {
    if (incomingCall) {
      await rejectCall(incomingCall.id);
    }
  };

  const handleCloseCall = () => {
    setActiveCall(null);
  };

  return (
    <>
      {children}
      
      {/* Incoming Call Dialog */}
      {incomingCall && !activeCall && (
        <IncomingCallDialog
          isOpen={true}
          callerName={incomingCall.caller_name || 'مستخدم'}
          callerAvatar={incomingCall.caller_avatar}
          callType={incomingCall.call_type}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {/* Active Call */}
      {activeCall && (
        <VideoCall
          targetUserId={activeCall.targetUserId}
          targetUserName={activeCall.targetUserName}
          isOpen={true}
          onClose={handleCloseCall}
          callType={activeCall.callType}
          callNotificationId={activeCall.callNotificationId}
        />
      )}
    </>
  );
};

export default CallNotificationProvider;
