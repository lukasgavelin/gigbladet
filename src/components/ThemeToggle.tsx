import React from 'react';
import { Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from '../hooks/useTheme.ts';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Växla till ljust läge' : 'Växla till mörkt backstage-läge'}
      aria-label={isDark ? 'Växla till ljust läge' : 'Växla till mörkt läge'}
      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
    >
      {isDark ? (
        <>
          <Sun weight="duotone" className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Ljust</span>
        </>
      ) : (
        <>
          <Moon weight="duotone" className="w-3.5 h-3.5 text-zinc-600" />
          <span className="hidden sm:inline">Mörkt</span>
        </>
      )}
    </button>
  );
};
