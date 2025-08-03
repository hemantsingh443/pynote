import { useEffect, useState, type ReactNode } from 'react';
import { useThemeStore, themes as allThemes, type ThemeDefinition } from '../store/themeStore';
import { registerAllThemes } from '../utils/monacoThemes';

// Function to convert hex to an "R G B" string
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '';
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `${r} ${g} ${b}`;
};

// Function to convert theme colors to CSS variables
const applyThemeVariables = (colors: ThemeDefinition['colors']) => {
  const root = document.documentElement;
  Object.keys(colors).forEach((key) => {
    const value = (colors as any)[key];
    if (typeof value === 'string' && value.startsWith('#')) {
      root.style.setProperty(`--color-${key}`, hexToRgb(value));
    } else if (key === 'syntax' && typeof value === 'object' && value !== null) {
      Object.keys(value).forEach((subKey) => {
        const subValue = (value as any)[subKey];
        if (typeof subValue === 'string' && subValue.startsWith('#')) {
          const varName = `--color-syntax-${subKey}`.replace(/([A-Z])/g, '-$1').toLowerCase();
          root.style.setProperty(varName, hexToRgb(subValue));
        }
      });
    }
  });

  // Special handling for keys that don't match Tailwind config directly
  if (colors.text) root.style.setProperty('--color-foreground', hexToRgb(colors.text));
  if (colors.textSecondary) root.style.setProperty('--color-text-secondary', hexToRgb(colors.textSecondary));
  if (colors.surface) root.style.setProperty('--color-surface', hexToRgb(colors.surface));
  if (colors.codeBackground) root.style.setProperty('--color-code-bg', hexToRgb(colors.codeBackground));
  if (colors.codeText) root.style.setProperty('--color-code-text', hexToRgb(colors.codeText));
};

// Import the theme definition functions from our utility
import { defineMonacoTheme } from '../utils/monacoThemes';


function applyThemeToDOM(theme: ThemeDefinition) {
  const root = window.document.documentElement;
  root.className = theme.id;
  
  // Apply all theme colors as CSS variables
  applyThemeVariables(theme.colors);
  
  // Set theme color for browser UI
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme.colors.background);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, currentTheme } = useThemeStore();
  const [isInitialized, setIsInitialized] = useState(false);

  // Apply theme immediately on first render (synchronously)
  useEffect(() => {
    const themeDef = allThemes[currentTheme as keyof typeof allThemes] || allThemes.light;
    applyThemeToDOM(themeDef);
  }, []);

  // Effect to register all Monaco themes and set up theme switching
  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      try {
        // Register all themes with Monaco
        const monaco = await import('monaco-editor');
        if (!isMounted) return;
        
        // Register all themes
        registerAllThemes(monaco, allThemes);
        
        // Apply the current theme to Monaco
        const themeDef = allThemes[currentTheme as keyof typeof allThemes] || allThemes.light;
        defineMonacoTheme(monaco, themeDef);
        monaco.editor.setTheme(themeDef.monacoTheme);
        
        // Ensure DOM is updated with the latest theme
        applyThemeToDOM(themeDef);
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing Monaco themes:', error);
      }
    };
    
    initialize();
    return () => { isMounted = false; };
  }, [currentTheme]);

  // Effect to handle theme changes after initialization
  useEffect(() => {
    if (!isInitialized) return;
    
    // Apply theme to DOM
    applyThemeToDOM(theme);
    
    // Apply theme to Monaco editor
    import('monaco-editor').then(monaco => {
      defineMonacoTheme(monaco, theme);
      monaco.editor.setTheme(theme.monacoTheme);
    }).catch(error => {
      console.error('Error applying Monaco theme:', error);
    });
  }, [theme, isInitialized]);

  return <>{children}</>;
}

