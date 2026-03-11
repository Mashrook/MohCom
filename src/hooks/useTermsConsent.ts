import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TermsVersion {
  document_type: string;
  version: string;
  effective_date: string;
  summary_ar: string | null;
}

export interface UserConsent {
  terms_version: string;
  privacy_version: string;
  consented_at: string;
}

export const useTermsConsent = () => {
  const { user } = useAuth();
  const [currentVersions, setCurrentVersions] = useState<{ terms: string; privacy: string }>({ terms: '1.0', privacy: '1.0' });
  const [userConsent, setUserConsent] = useState<UserConsent | null>(null);
  const [needsReConsent, setNeedsReConsent] = useState(false);
  const [updatedDocuments, setUpdatedDocuments] = useState<TermsVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current terms versions
  const fetchCurrentVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('terms_versions')
        .select('document_type, version, effective_date, summary_ar')
        .order('effective_date', { ascending: false });

      if (error) throw error;

      const termsVersion = data?.find(d => d.document_type === 'terms')?.version || '1.0';
      const privacyVersion = data?.find(d => d.document_type === 'privacy')?.version || '1.0';
      
      setCurrentVersions({ terms: termsVersion, privacy: privacyVersion });
      return { terms: termsVersion, privacy: privacyVersion };
    } catch (error) {
      console.error('Error fetching terms versions:', error);
      return { terms: '1.0', privacy: '1.0' };
    }
  };

  // Fetch user's last consent
  const fetchUserConsent = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('terms_consent_log')
        .select('terms_version, privacy_version, consented_at')
        .eq('user_id', user.id)
        .order('consented_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      setUserConsent(data);
      return data;
    } catch (error) {
      console.error('Error fetching user consent:', error);
      return null;
    }
  };

  // Check if user needs to re-consent
  const checkReConsentNeeded = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const versions = await fetchCurrentVersions();
      const consent = await fetchUserConsent();

      if (!consent) {
        // New user without consent record (might be existing user before feature)
        setNeedsReConsent(false);
        setIsLoading(false);
        return;
      }

      const termsUpdated = consent.terms_version !== versions.terms;
      const privacyUpdated = consent.privacy_version !== versions.privacy;

      if (termsUpdated || privacyUpdated) {
        setNeedsReConsent(true);
        
        // Fetch details of updated documents
        const { data: updatedDocs } = await supabase
          .from('terms_versions')
          .select('document_type, version, effective_date, summary_ar')
          .or(`and(document_type.eq.terms,version.gt.${consent.terms_version}),and(document_type.eq.privacy,version.gt.${consent.privacy_version})`)
          .order('effective_date', { ascending: false });

        setUpdatedDocuments(updatedDocs || []);
      }
    } catch (error) {
      console.error('Error checking re-consent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Record user consent
  const recordConsent = async (consentType: string = 'signup') => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('terms_consent_log')
        .insert({
          user_id: user.id,
          terms_version: currentVersions.terms,
          privacy_version: currentVersions.privacy,
          consent_type: consentType,
          user_agent: navigator.userAgent,
        });

      if (error) throw error;

      setUserConsent({
        terms_version: currentVersions.terms,
        privacy_version: currentVersions.privacy,
        consented_at: new Date().toISOString(),
      });
      setNeedsReConsent(false);
      setUpdatedDocuments([]);
      
      return true;
    } catch (error) {
      console.error('Error recording consent:', error);
      return false;
    }
  };

  useEffect(() => {
    checkReConsentNeeded();
  }, [user]);

  return {
    currentVersions,
    userConsent,
    needsReConsent,
    updatedDocuments,
    isLoading,
    recordConsent,
    fetchCurrentVersions,
  };
};
