import { useState, useEffect } from 'react';
import { secureStorage } from '@/utils/secureStorage';

interface UserPreferences {
  splashSoundEnabled: boolean;
  pageTransitionsEnabled: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  splashSoundEnabled: true,
  pageTransitionsEnabled: true,
};

const STORAGE_KEY = 'user_preferences';

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const stored = await secureStorage.getPreferences();
        if (stored) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...(stored as UserPreferences) });
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPreferences();
  }, []);

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    secureStorage.setPreferences(newPreferences).catch(error => {
      console.error('Error saving preferences:', error);
    });
  };

  const setSplashSoundEnabled = (enabled: boolean) => {
    updatePreference('splashSoundEnabled', enabled);
  };

  const setPageTransitionsEnabled = (enabled: boolean) => {
    updatePreference('pageTransitionsEnabled', enabled);
  };

  return {
    preferences,
    loading,
    setSplashSoundEnabled,
    setPageTransitionsEnabled,
  };
}

// Utility function to check preference without hook (for SplashScreen)
// Returns default value since async storage can't be accessed synchronously
export function getSplashSoundEnabled(): boolean {
  // For synchronous access, we can only return default
  // The actual preference will be loaded async by the component
  return true;
}
