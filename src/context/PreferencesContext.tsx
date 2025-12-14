import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ARCHITECTURE: Type definition for global preferences context.
 * Defines the shape of shared application state accessible throughout the component tree.
 */
interface PreferencesContextType {
  isDarkMode: boolean;
  launchWithFlashlightOn: boolean;
  toggleDarkMode: () => void;
  toggleLaunchWithFlashlightOn: () => void;
}

/**
 * ARCHITECTURE: React Context instance for global preferences state management.
 * Using Context API to avoid prop drilling and enable any component to access
 * user preferences without passing props through intermediate components.
 */
const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

/**
 * ARCHITECTURE: AsyncStorage key constants for persistence layer.
 * Using namespaced keys (@preferences:*) prevents collisions with other app data
 * and follows React Native AsyncStorage best practices.
 */
const STORAGE_KEYS = {
  DARK_MODE: '@preferences:darkMode',
  LAUNCH_FLASHLIGHT: '@preferences:launchFlashlight',
};

/**
 * ARCHITECTURE: Context Provider component managing global application preferences.
 * 
 * STATE MANAGEMENT: Implements React Context API pattern to provide global state
 * for theme preferences and user settings. This eliminates prop drilling and enables
 * any component to access preferences via the usePreferences hook.
 * 
 * PERSISTENCE LAYER: Uses AsyncStorage as the asynchronous persistence mechanism to
 * save user preferences locally. Preferences are loaded on mount and saved immediately
 * on change, ensuring state persists across app restarts.
 * 
 * PERFORMANCE: Uses Promise.all for parallel loading of multiple preferences to
 * minimize initialization latency.
 * 
 * @param {ReactNode} children - Child components that will have access to preferences context
 * @returns {JSX.Element} Context provider wrapping the application
 */
export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [launchWithFlashlightOn, setLaunchWithFlashlightOn] = useState(false);

  /**
   * ARCHITECTURE: Effect hook to load persisted preferences on component mount.
   * Runs once on mount to restore user's saved preferences from AsyncStorage,
   * ensuring app state matches user's last configuration.
   */
  useEffect(() => {
    loadPreferences();
  }, []);

  /**
   * PERSISTENCE LAYER: Asynchronous function to load user preferences from AsyncStorage.
   * 
   * PERFORMANCE: Uses Promise.all to load multiple preferences in parallel, reducing
   * total load time compared to sequential loading.
   * 
   * ERROR HANDLING: Gracefully handles storage errors by logging and falling back to
   * default values, ensuring app remains functional even if storage is unavailable.
   * 
   * @returns {Promise<void>} Resolves when preferences are loaded (or on error)
   */
  const loadPreferences = async () => {
    try {
      const [darkMode, launchFlashlight] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DARK_MODE),
        AsyncStorage.getItem(STORAGE_KEYS.LAUNCH_FLASHLIGHT),
      ]);

      if (darkMode !== null) {
        setIsDarkMode(darkMode === 'true');
      }

      if (launchFlashlight !== null) {
        setLaunchWithFlashlightOn(launchFlashlight === 'true');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  /**
   * STATE MANAGEMENT: Toggle function for dark mode preference.
   * 
   * PERSISTENCE: Immediately persists the new preference to AsyncStorage after
   * updating local state, ensuring changes survive app restarts. Uses optimistic
   * UI update pattern (state first, then persistence).
   * 
   * @returns {Promise<void>} Resolves when preference is saved
   */
  const toggleDarkMode = async () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DARK_MODE, newValue.toString());
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
  };

  /**
   * STATE MANAGEMENT: Toggle function for launch flashlight preference.
   * 
   * PERSISTENCE: Immediately persists the new preference to AsyncStorage after
   * updating local state. This preference is consumed by FlashlightScreen to
   * automatically enable torch on app launch if user has enabled this option.
   * 
   * @returns {Promise<void>} Resolves when preference is saved
   */
  const toggleLaunchWithFlashlightOn = async () => {
    const newValue = !launchWithFlashlightOn;
    setLaunchWithFlashlightOn(newValue);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAUNCH_FLASHLIGHT, newValue.toString());
    } catch (error) {
      console.error('Error saving launch flashlight preference:', error);
    }
  };

  const value: PreferencesContextType = {
    isDarkMode,
    launchWithFlashlightOn,
    toggleDarkMode,
    toggleLaunchWithFlashlightOn,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

/**
 * ARCHITECTURE: Custom hook to access preferences context.
 * 
 * ERROR HANDLING: Throws descriptive error if used outside PreferencesProvider,
 * helping developers catch context usage mistakes during development.
 * 
 * @throws {Error} If hook is used outside PreferencesProvider
 * @returns {PreferencesContextType} Current preferences state and toggle functions
 */
export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

