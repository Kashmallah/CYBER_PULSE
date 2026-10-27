import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'system' | 'light' | 'cyberpunk' | 'matrix' | 'crimson' | 'nordic';

export const THEME_STORAGE_KEY = 'cp_theme';

/**
 * Detect whether the host OS currently prefers dark mode
 */
export function getSystemIsDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return true; // Default fallback to dark
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Resolve the effective active theme name based on user preference and OS setting
 */
export function resolveEffectiveTheme(mode: ThemeMode, systemIsDark: boolean): string {
  if (mode === 'system') {
    return systemIsDark ? 'cyberpunk' : 'light';
  }
  return mode;
}

/**
 * Apply the theme to the HTML document root element
 */
export function applyThemeToDOM(effectiveTheme: string): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute('data-theme', effectiveTheme);

  if (effectiveTheme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
  }
}

/**
 * Custom React Hook to manage theme state, synchronization, and system preference changes
 */
export function useTheme() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && ['system', 'light', 'cyberpunk', 'matrix', 'crimson', 'nordic'].includes(stored)) {
      return stored as ThemeMode;
    }
    return 'system';
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(getSystemIsDark);

  // Listen to OS system color scheme changes in real-time
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  // Listen to theme changes from other windows or tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        setThemeModeState(e.newValue as ThemeMode);
      }
    };

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeMode>;
      if (customEvent.detail) {
        setThemeModeState(customEvent.detail);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cp_theme_change', handleCustomChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cp_theme_change', handleCustomChange);
    };
  }, []);

  const effectiveTheme = resolveEffectiveTheme(themeMode, systemIsDark);
  const isLight = effectiveTheme === 'light';

  // Apply effective theme to DOM whenever mode or system preference changes
  useEffect(() => {
    applyThemeToDOM(effectiveTheme);
  }, [effectiveTheme]);

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setThemeModeState(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
    window.dispatchEvent(new CustomEvent('cp_theme_change', { detail: newMode }));
  }, []);

  // Quick toggle helper for Navbar: cycles between Light, Dark, or System
  const toggleLightDark = useCallback(() => {
    if (themeMode === 'system') {
      // If currently following system, toggle to the opposite of current OS
      const next = systemIsDark ? 'light' : 'cyberpunk';
      setThemeMode(next);
    } else if (themeMode === 'light') {
      setThemeMode('cyberpunk');
    } else {
      setThemeMode('light');
    }
  }, [themeMode, systemIsDark, setThemeMode]);

  return {
    themeMode,
    effectiveTheme,
    isLight,
    isSystem: themeMode === 'system',
    systemIsDark,
    setThemeMode,
    toggleLightDark
  };
}
