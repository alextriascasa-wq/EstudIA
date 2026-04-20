import { useCallback, useEffect, useState } from 'react';
import type { Theme } from '@/types';
import { LEGACY_DARK_KEY, THEME_KEY } from '@/store/defaults';

function resolveInitialTheme(): Theme {
  try {
    const v2 = localStorage.getItem(THEME_KEY);
    if (v2 === 'dark' || v2 === 'light') return v2;
    const legacy = localStorage.getItem(LEGACY_DARK_KEY);
    if (legacy === 'dark' || legacy === 'light') return legacy;
  } catch {
    // ignore
  }
  return 'light';
}

export function useTheme(): {
  theme: Theme;
  toggle: () => void;
} {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggle };
}
