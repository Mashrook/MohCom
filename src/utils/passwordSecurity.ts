/**
 * Check if a password has been exposed in data breaches using HaveIBeenPwned API
 * Uses k-anonymity model - only sends first 5 characters of SHA-1 hash
 */

async function sha1(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export async function checkPasswordLeaked(password: string): Promise<{ isLeaked: boolean; count: number }> {
  try {
    const hash = await sha1(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'Add-Padding': 'true' // Helps prevent timing attacks
      }
    });

    if (!response.ok) {
      console.error('HIBP API error:', response.status);
      return { isLeaked: false, count: 0 }; // Fail open - don't block registration on API errors
    }

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return { isLeaked: true, count: parseInt(count.trim(), 10) };
      }
    }

    return { isLeaked: false, count: 0 };
  } catch (error) {
    console.error('Error checking password:', error);
    return { isLeaked: false, count: 0 }; // Fail open
  }
}
