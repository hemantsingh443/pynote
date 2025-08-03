import { useThemeStore, themeOptions } from '../store/themeStore';
import { Sun, Moon, Flame, Cloudy, Sparkles, Leaf, Mountain, Snowflake } from 'lucide-react';
import { useEffect, useState } from 'react';

const themeIcons = {
  light: Sun,
  dark: Moon,
  warm: Flame,
  ayuMirage: Cloudy,
  palenightWarm: Sparkles,
  earthsong: Leaf,
  firewatch: Mountain,
  warmWinter: Snowflake,
} as const;

export function ThemeSelector() {
  const { currentTheme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  // Only render on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-8 w-8 rounded-full bg-surface animate-pulse"></div>
    );
  }

  const ThemeIcon = themeIcons[currentTheme as keyof typeof themeIcons] || Sun;
  const nextTheme = themeOptions[
    (themeOptions.findIndex((t) => t.id === currentTheme) + 1) % themeOptions.length
  ].id;

  return (
    <div className="relative group">
      <button
        onClick={() => setTheme(nextTheme)}
        className="p-1.5 rounded-md hover:bg-surface-hover transition-colors"
        aria-label="Toggle theme"
        title={`Switch to ${nextTheme} theme`}
      >
        <ThemeIcon className="w-5 h-5 text-secondary" />
      </button>
      
      <div className="absolute right-0 mt-2 w-48 bg-surface rounded-md shadow-lg py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
        {themeOptions.map(({ id, name }) => {
          const Icon = themeIcons[id as keyof typeof themeIcons] || Sun;
          return (
            <button
              key={id}
              onClick={() => setTheme(id as any)}
              className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                currentTheme === id
                  ? 'bg-accent/10 text-accent'
                  : 'text-secondary hover:bg-surface-hover'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {name}
              {currentTheme === id && (
                <span className="ml-auto">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
