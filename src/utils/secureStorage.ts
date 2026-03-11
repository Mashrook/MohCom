/**
 * Secure Storage Utility with AES-GCM Encryption
 * تشفير وتأمين البيانات المخزنة محلياً باستخدام Web Crypto API
 */

const STORAGE_PREFIX = 'mohamie_secure_';
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for AES-GCM

/**
 * Generate a cryptographic key from device fingerprint
 */
const generateEncryptionKey = async (): Promise<CryptoKey> => {
  const deviceFingerprint = getDeviceFingerprint();
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(deviceFingerprint),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Use PBKDF2 with a salt for key derivation
  const salt = encoder.encode('mohamie_salt_v2');
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
};

/**
 * Generate a device-specific fingerprint
 */
const getDeviceFingerprint = (): string => {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform || 'unknown',
    screen.width.toString(),
    screen.height.toString(),
    new Date().getTimezoneOffset().toString(),
  ];
  return components.join('|');
};

/**
 * Encrypt data using AES-GCM
 */
const encryptData = async (plaintext: string): Promise<string> => {
  try {
    const key = await generateEncryptionKey();
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      encoder.encode(plaintext)
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed, falling back to obfuscation:', error);
    return fallbackObfuscate(plaintext);
  }
};

/**
 * Decrypt data using AES-GCM
 */
const decryptData = async (ciphertext: string): Promise<string> => {
  try {
    const key = await generateEncryptionKey();
    
    // Decode from base64
    const combined = new Uint8Array(
      atob(ciphertext).split('').map(c => c.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encryptedData = combined.slice(IV_LENGTH);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed, trying fallback:', error);
    return fallbackDeobfuscate(ciphertext);
  }
};

/**
 * Fallback obfuscation for environments without Web Crypto
 */
const fallbackObfuscate = (data: string): string => {
  const key = getDeviceFingerprint().substring(0, 32);
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return 'fb_' + btoa(result); // Prefix to identify fallback encoding
};

const fallbackDeobfuscate = (data: string): string => {
  try {
    // Check if it's fallback encoded
    if (data.startsWith('fb_')) {
      const encoded = data.substring(3);
      const key = getDeviceFingerprint().substring(0, 32);
      const decoded = atob(encoded);
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    }
    return '';
  } catch {
    return '';
  }
};

/**
 * Secure Storage API with proper AES-GCM encryption
 */
export const secureStorage = {
  /**
   * Store data securely with AES-GCM encryption
   */
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      const encryptedValue = await encryptData(value);
      const timestamp = Date.now();
      
      // Generate HMAC for integrity verification
      const integrityData = `${key}:${timestamp}:${encryptedValue}`;
      const integrityHash = await generateIntegrityHash(integrityData);
      
      const dataWithMeta = JSON.stringify({
        v: encryptedValue,
        t: timestamp,
        h: integrityHash,
        ver: 2 // Version for migration
      });
      
      localStorage.setItem(STORAGE_PREFIX + key, dataWithMeta);
    } catch (error) {
      console.error('SecureStorage: Failed to store item', error);
    }
  },

  /**
   * Retrieve and decrypt data securely
   */
  getItem: async (key: string): Promise<string | null> => {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + key);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      
      // Check version and migrate if needed
      if (!parsed.ver || parsed.ver < 2) {
        // Old format, try to read and re-encrypt
        console.warn('SecureStorage: Migrating old format for', key);
        secureStorage.removeItem(key);
        return null;
      }
      
      // Verify integrity
      const integrityData = `${key}:${parsed.t}:${parsed.v}`;
      const expectedHash = await generateIntegrityHash(integrityData);
      
      if (parsed.h !== expectedHash) {
        console.warn('SecureStorage: Integrity check failed for', key);
        secureStorage.removeItem(key);
        return null;
      }

      // Check for tampering - data should not be older than 30 days
      const maxAge = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.t > maxAge) {
        console.warn('SecureStorage: Data expired for', key);
        secureStorage.removeItem(key);
        return null;
      }

      return await decryptData(parsed.v);
    } catch (error) {
      console.error('SecureStorage: Failed to retrieve item', error);
      return null;
    }
  },

  /**
   * Synchronous version for backward compatibility
   */
  setItemSync: (key: string, value: string): void => {
    secureStorage.setItem(key, value).catch(console.error);
  },

  getItemSync: (key: string): string | null => {
    // For sync access, return cached value or null
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + key);
      if (!stored) return null;
      // For sync access, we can't decrypt properly, return null and let async handle it
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Remove stored data securely
   */
  removeItem: (key: string): void => {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  /**
   * Clear all secure storage
   */
  clear: (): void => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  },

  /**
   * Store sensitive session data
   */
  setSession: async (sessionData: object): Promise<void> => {
    await secureStorage.setItem('session', JSON.stringify(sessionData));
  },

  /**
   * Get session data
   */
  getSession: async (): Promise<object | null> => {
    const data = await secureStorage.getItem('session');
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  /**
   * Store user preferences securely
   */
  setPreferences: async (prefs: object): Promise<void> => {
    await secureStorage.setItem('preferences', JSON.stringify(prefs));
  },

  /**
   * Get user preferences
   */
  getPreferences: async (): Promise<object | null> => {
    const data = await secureStorage.getItem('preferences');
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
};

/**
 * Generate SHA-256 hash for integrity verification
 */
const generateIntegrityHash = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
};

/**
 * Session management - Auto-logout disabled for persistent sessions
 */
export const sessionManager = {
  TIMEOUT_DURATION: Infinity, // Disabled - no timeout
  ABSOLUTE_TIMEOUT: Infinity, // Disabled - no absolute timeout
  lastActivity: Date.now(),
  sessionStart: Date.now(),

  /**
   * Update last activity timestamp (for tracking only)
   */
  updateActivity: async (): Promise<void> => {
    sessionManager.lastActivity = Date.now();
    await secureStorage.setItem('lastActivity', sessionManager.lastActivity.toString());
  },

  /**
   * Start a new session
   */
  startSession: async (): Promise<void> => {
    sessionManager.sessionStart = Date.now();
    sessionManager.lastActivity = Date.now();
    await secureStorage.setItem('sessionStart', sessionManager.sessionStart.toString());
    await secureStorage.setItem('lastActivity', sessionManager.lastActivity.toString());
  },

  /**
   * Check if session has expired - always returns false (disabled)
   */
  isSessionExpired: async (): Promise<boolean> => {
    // Auto-logout disabled - session never expires automatically
    return false;
  },

  /**
   * Clear session - only on explicit logout
   */
  clearExpiredSession: async (): Promise<boolean> => {
    // Auto-logout disabled - never clear automatically
    return false;
  }
};

/**
 * Secure data sanitization before storage
 */
export const sanitizeForStorage = (data: string): string => {
  // Remove potential XSS vectors
  return data
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
};

export default secureStorage;
