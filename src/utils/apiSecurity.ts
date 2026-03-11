/**
 * API Security Utilities
 * حماية اتصالات API
 */

import { supabase } from "@/integrations/supabase/client";

// قائمة النطاقات المسموح بها ✅
const ALLOWED_ORIGINS = [
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

// SSL/TLS Certificate fingerprints for certificate pinning (production)
// يجب تعبئة هذه البصمات عند تفعيل التحقق الأمني
const CERTIFICATE_FINGERPRINTS = {
  // 'mohamie.com': [
  //   'sha256/PLACEHOLDER_FINGERPRINT_1',
  //   'sha256/PLACEHOLDER_FINGERPRINT_2',
  // ],
  'qgddjrfvwopkskye...supabase.co': [
    'sha256/PLACEHOLDER_SUPABASE_FINGERPRINT'
  ]
};

/**
 * Security headers for API requests
 */
export const getSecurityHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache'
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  // Add API key header
  headers['apikey'] = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return headers;
};
