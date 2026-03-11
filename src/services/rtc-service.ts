// RTC Service for Jitsi video/voice calls

export const RTC_CONFIG = {
  // JaaS App ID from environment variable or fallback
  appId: import.meta.env.VITE_JAAS_APP_ID || 'vpaas-magic-cookie-c3525befe4e64bc68cc2f8db37f527c3/0035b6',
  // In production, JWT should be fetched from server
  useJwt: true 
};

interface ConnectionResult {
  success: boolean;
  error?: string;
  connectionId?: string;
  roomName?: string;
}

export const initializeRTC = async (partnerId: string): Promise<ConnectionResult> => {
  // Generates a unique secure room name
  const uniqueRoomId = `consultation-${Math.random().toString(36).substr(2, 9)}`;
  
  // For JaaS, the full room name includes the tenant prefix
  // The Jitsi SDK handles this when appId is provided
  const roomName = uniqueRoomId;

  return {
    success: true,
    connectionId: uniqueRoomId,
    roomName: roomName
  };
};

export const cleanupRTC = async (connectionId: string): Promise<void> => {
  // Cleanup connection resources
  console.log(`Cleaning up RTC connection: ${connectionId}`);
};

export const getJitsiConfig = () => ({
  configOverwrite: {
    disableDeepLinking: true,
    prejoinPageEnabled: false,
    startWithAudioMuted: false,
    startWithVideoMuted: false,
    enableClosePage: false,
    disableModeratorIndicator: true,
    enableEmailInStats: false,
    disableThirdPartyRequests: true,
    enableNoAudioDetection: true,
    enableNoisyMicDetection: true,
    p2p: {
      enabled: true
    }
  },
  interfaceConfigOverwrite: {
    DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
    MOBILE_APP_PROMO: false,
    SHOW_CHROME_EXTENSION_BANNER: false,
    SHOW_JITSI_WATERMARK: false,
    SHOW_WATERMARK_FOR_GUESTS: false,
    DEFAULT_BACKGROUND: '#0A0E27',
    TOOLBAR_BUTTONS: [
      'microphone',
      'camera',
      'closedcaptions',
      'desktop',
      'fullscreen',
      'hangup',
      'chat',
      'settings',
      'videoquality',
      'tileview'
    ]
  },
  userInfo: {
    displayName: ''
  }
});
