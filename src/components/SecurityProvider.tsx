/**
 * Security Provider Component
 * يوفر حماية أمان على مستوى التطبيق
 */

import React, { useEffect } from 'react';
import { useSecurityMonitor } from '@/hooks/useSecurityMonitor';
import { sessionManager } from '@/utils/secureStorage';

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const { resetActivityTimer, clearSensitiveData } = useSecurityMonitor();

  useEffect(() => {
    // تهيئة مراقب النشاط
    resetActivityTimer();

    // التحقق من انتهاء الجلسة عند التحميل
    if (sessionManager.isSessionExpired()) {
      clearSensitiveData();
    }

    // منع النسخ واللصق للبيانات الحساسة في وضع الإنتاج
    if (import.meta.env.PROD) {
      const handleCopy = (e: ClipboardEvent) => {
        const selection = window.getSelection()?.toString() || '';
        // منع نسخ أرقام البطاقات والبيانات الحساسة
        const sensitivePatterns = [
          /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/, // Credit card
          /\d{3}[\s-]?\d{2}[\s-]?\d{4}/, // SSN-like
        ];
        
        for (const pattern of sensitivePatterns) {
          if (pattern.test(selection)) {
            e.preventDefault();
            console.warn('محاولة نسخ بيانات حساسة');
            return;
          }
        }
      };

      document.addEventListener('copy', handleCopy);
      
      return () => {
        document.removeEventListener('copy', handleCopy);
      };
    }
  }, [resetActivityTimer, clearSensitiveData]);

  // منع فتح قائمة السياق على العناصر الحساسة
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('[data-sensitive]') ||
        target.closest('input[type="password"]') ||
        target.closest('.payment-form')
      ) {
        e.preventDefault();
      }
    };

    if (import.meta.env.PROD) {
      document.addEventListener('contextmenu', handleContextMenu);
      return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
      };
    }
  }, []);

  // تنظيف البيانات عند إغلاق الصفحة
  useEffect(() => {
    const handleBeforeUnload = () => {
      // مسح البيانات المؤقتة الحساسة
      sessionStorage.removeItem('temp_payment_data');
      sessionStorage.removeItem('temp_token');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return <>{children}</>;
};

export default SecurityProvider;
