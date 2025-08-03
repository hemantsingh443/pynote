import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'warm' | 'ayuMirage' | 'palenightWarm' | 'earthsong' | 'firewatch' | 'warmWinter';

type ThemeColors = {
  primary: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  accent: string;
  error: string;
  warning: string;
  success: string;
  codeBackground: string;
  codeText: string;
  cursor?: string;
  selection?: string;
  lineHighlight?: string;
  gutter?: string;
  syntax?: {
    keywords: string;
    strings: string;
    numbers: string;
    functions: string;
    variables: string;
    comments: string;
    types: string;
    constants: string;
    operators: string;
  };
};

import type * as monaco from 'monaco-editor';

export type ThemeDefinition = {
  id: Theme;
  name: string;
  type: 'light' | 'dark';
  colors: ThemeColors;
  monacoTheme: string;
  monacoRules?: monaco.editor.ITokenThemeRule[];
};

export const themes: Record<Theme, ThemeDefinition> = {
  light: {
    id: 'light',
    name: 'Light',
    type: 'light',
    monacoTheme: 'light',
    monacoRules: [
      { token: 'keyword', foreground: '#0000FF', fontStyle: 'bold' },
      { token: 'string', foreground: '#A31515' },
      { token: 'number', foreground: '#098658' },
      { token: 'comment', foreground: '#008000' },
      { token: 'operator', foreground: '#000000' },
      { token: 'predefined', foreground: '#0000FF' },
      // Markdown specific
      { token: 'strong', fontStyle: 'bold' },
      { token: 'emphasis', fontStyle: 'italic' },
      { token: 'heading', foreground: '#000080', fontStyle: 'bold' },
      { token: 'quote', foreground: '#6A9955' },
      { token: 'link', foreground: '#0000FF', fontStyle: 'underline' },
      { token: 'code', foreground: '#A31515' },
    ],
    colors: {
      primary: '#2563eb',
      background: '#ffffff',
      surface: '#f8fafc',
      border: '#e2e8f0',
      text: '#0f172a',
      textSecondary: '#475569',
      accent: '#3b82f6',
      error: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981',
      codeBackground: '#f1f5f9',
      codeText: '#0f172a',
      syntax: {
        keywords: '#d946ef',
        strings: '#2563eb',
        numbers: '#f59e0b',
        functions: '#8b5cf6',
        variables: '#0f172a',
        comments: '#64748b',
        types: '#10b981',
        constants: '#f59e0b',
        operators: '#d946ef',
      },
    },
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    type: 'dark',
    monacoTheme: 'pynote-dark-theme',
    monacoRules: [
      { token: 'keyword', foreground: '#c084fc', fontStyle: 'bold' },
      { token: 'string', foreground: '#60a5fa' },
      { token: 'number', foreground: '#fbbf24' },
      { token: 'type', foreground: '#34d399' },
      { token: 'function', foreground: '#a78bfa' },
      { token: 'variable', foreground: '#e2e8f0' },
      { token: 'comment', foreground: '#64748b', fontStyle: 'italic' },
      { token: 'constant', foreground: '#fbbf24' },
      { token: 'operator', foreground: '#c084fc' },
      { token: 'identifier', foreground: '#e2e8f0' },
      // Python specific
      { token: 'keyword.flow.python', foreground: '#c084fc', fontStyle: 'bold' },
      { token: 'string.doc.python', foreground: '#64748b', fontStyle: 'italic' },
      { token: 'string.escape.python', foreground: '#fbbf24' },
      // Markdown specific
      { token: 'emphasis', fontStyle: 'italic' },
      { token: 'strong', fontStyle: 'bold' },
      { token: 'header', foreground: '#3b82f6', fontStyle: 'bold' },
      { token: 'keyword.md', foreground: '#c084fc', fontStyle: 'bold' },
      { token: 'string.link.md', foreground: '#60a5fa', fontStyle: 'underline' },
      { token: 'string.md', foreground: '#e2e8f0' },
      { token: 'variable.md', foreground: '#a78bfa' },
      { token: 'comment.md', foreground: '#64748b', fontStyle: 'italic' },
      { token: 'variable.source.md', foreground: '#34d399' },
    ],
    colors: {
      primary: '#3b82f6',
      background: '#0f172a',
      surface: '#1e293b',
      border: '#334155',
      text: '#f8fafc',
      textSecondary: '#94a3b8',
      accent: '#60a5fa',
      error: '#f87171',
      warning: '#fbbf24',
      success: '#34d399',
      codeBackground: '#1e293b',
      codeText: '#e2e8f0',
      syntax: {
        keywords: '#c084fc',
        strings: '#60a5fa',
        numbers: '#fbbf24',
        functions: '#a78bfa',
        variables: '#e2e8f0',
        comments: '#64748b',
        types: '#34d399',
        constants: '#fbbf24',
        operators: '#c084fc',
      },
    },
  },
  warm: {
    id: 'warm',
    name: 'Warm',
    type: 'dark',
    monacoTheme: 'pynote-warm-theme',
    colors: {
      primary: '#d4a373',
      background: '#2a1e1a',
      surface: '#40332e',
      border: '#463631',
      text: '#e7caa3',
      textSecondary: '#c4a484',
      accent: '#f28f3b',
      error: '#e87461',
      warning: '#f4b860',
      success: '#d4a373',
      codeBackground: '#332723',
      codeText: '#e7caa3',
      cursor: '#f28f3b',
      selection: '#40332e',
      lineHighlight: '#332723',
      gutter: '#463631',
      syntax: {
        keywords: '#f97583',
        strings: '#a5d6ff',
        numbers: '#79c0ff',
        functions: '#d2a8ff',
        variables: '#e6e1cf',
        comments: '#8b949e',
        types: '#ffab70',
        constants: '#79c0ff',
        operators: '#f97583',
      },
    },
  },
  ayuMirage: {
    id: 'ayuMirage',
    name: 'Ayu Mirage',
    type: 'dark',
    monacoTheme: 'ayu-mirage-theme',
    colors: {
      primary: '#ffcc66',
      background: '#0f1419',
      surface: '#1a1f2c',
      border: '#2a3541',
      text: '#e6e1cf',
      textSecondary: '#a6b3cc',
      accent: '#ffb454',
      error: '#ff3333',
      warning: '#ff8f40',
      success: '#b8cc52',
      codeBackground: '#1a1f2c',
      codeText: '#e6e1cf',
      cursor: '#ffcc66',
      selection: '#2a3541',
      lineHighlight: '#1a1f2c',
      gutter: '#2a3541',
      syntax: {
        keywords: '#ffa759',
        strings: '#b8cc52',
        numbers: '#ff9959',
        functions: '#ffc580',
        variables: '#e6e1cf',
        comments: '#6f7b87',
        types: '#ffc580',
        constants: '#ffa759',
        operators: '#f29e74',
      },
    },
  },
  palenightWarm: {
    id: 'palenightWarm',
    name: 'Palenight Warm',
    type: 'dark',
    monacoTheme: 'palenight-warm-theme',
    colors: {
      primary: '#c792ea',
      background: '#211d2b',
      surface: '#2d283e',
      border: '#3e3a4d',
      text: '#d9d7e0',
      textSecondary: '#a6a1b8',
      accent: '#ffcb6b',
      error: '#ff5370',
      warning: '#f78c6c',
      success: '#c3e88d',
      codeBackground: '#2d283e',
      codeText: '#d9d7e0',
      cursor: '#ffcb6b',
      selection: '#3e3a4d',
      lineHighlight: '#2d283e',
      gutter: '#3e3a4d',
      syntax: {
        keywords: '#c792ea',
        strings: '#c3e88d',
        numbers: '#f78c6c',
        functions: '#82aaff',
        variables: '#eeffff',
        comments: '#676e95',
        types: '#ffcb6b',
        constants: '#f78c6c',
        operators: '#89ddff',
      },
    },
  },
  earthsong: {
    id: 'earthsong',
    name: 'Earthsong',
    type: 'dark',
    monacoTheme: 'earthsong-theme',
    colors: {
      primary: '#c17e70',
      background: '#1e1a1a',
      surface: '#2a2424',
      border: '#3a3232',
      text: '#e0d4c0',
      textSecondary: '#b8a99a',
      accent: '#e6a971',
      error: '#e67e80',
      warning: '#e6a971',
      success: '#a5c88a',
      codeBackground: '#2a2424',
      codeText: '#e0d4c0',
      cursor: '#e6a971',
      selection: '#3a3232',
      lineHighlight: '#2a2424',
      gutter: '#3a3232',
      syntax: {
        keywords: '#e57869',
        strings: '#a5c88a',
        numbers: '#e6a971',
        functions: '#69a5e5',
        variables: '#e0d4c0',
        comments: '#8a7f78',
        types: '#e6a971',
        constants: '#e57869',
        operators: '#69a5e5',
      },
    },
  },
  firewatch: {
    id: 'firewatch',
    name: 'Firewatch',
    type: 'dark',
    monacoTheme: 'firewatch-theme',
    colors: {
      primary: '#f8b42c',
      background: '#1c232b',
      surface: '#2a3440',
      border: '#3c4a59',
      text: '#e6e1cf',
      textSecondary: '#a6b3cc',
      accent: '#f8b42c',
      error: '#ff4d4d',
      warning: '#f8b44c',
      success: '#b8cc52',
      codeBackground: '#2a3440',
      codeText: '#e6e1cf',
      cursor: '#f8b42c',
      selection: '#3c4a59',
      lineHighlight: '#2a3440',
      gutter: '#3c4a59',
      syntax: {
        keywords: '#f8b44c',
        strings: '#b8cc52',
        numbers: '#fc9354',
        functions: '#6699cc',
        variables: '#e6e1cf',
        comments: '#5c6773',
        types: '#f8b44c',
        constants: '#fc9354',
        operators: '#6699cc',
      },
    },
  },
  warmWinter: {
    id: 'warmWinter',
    name: 'Warm Winter Night',
    type: 'dark',
    monacoTheme: 'warm-winter-theme',
    colors: {
      primary: '#a5c88a',
      background: '#1e1e2e',
      surface: '#2e2e4e',
      border: '#3e3e5e',
      text: '#d0d0e0',
      textSecondary: '#a0a0c0',
      accent: '#a5c88a',
      error: '#ff79c6',
      warning: '#f1fa8c',
      success: '#50fa7b',
      codeBackground: '#2e2e4e',
      codeText: '#d0d0e0',
      cursor: '#a5c88a',
      selection: '#3e3e5e',
      lineHighlight: '#2e2e4e',
      gutter: '#3e3e5e',
      syntax: {
        keywords: '#ff79c6',
        strings: '#f1fa8c',
        numbers: '#bd93f9',
        functions: '#8be9fd',
        variables: '#d0d0e0',
        comments: '#6272a4',
        types: '#8be9fd',
        constants: '#bd93f9',
        operators: '#ff79c6',
      },
    },
  },
};

type ThemeState = {
  currentTheme: Theme;
  theme: ThemeDefinition;
  setTheme: (theme: Theme) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      currentTheme: 'light', // Default theme before hydration
      theme: themes.light,    // Default theme object
      setTheme: (themeId: Theme) => {
        const newTheme = themes[themeId];
        if (newTheme) {
          set({ currentTheme: themeId, theme: newTheme });
        }
      },
    }),
    {
      name: 'pynote-theme',
      // Only persist the theme ID
      partialize: (state) => ({ currentTheme: state.currentTheme }),
      // When rehydrating, update the full theme object based on the persisted ID
      onRehydrateStorage: () => (state) => {
        if (state) {
          const persistedThemeId = state.currentTheme;
          const persistedTheme = themes[persistedThemeId];
          if (persistedTheme) {
            state.theme = persistedTheme;
          }
        }
      },
    }
  )
);

// Export theme names for the theme selector
export const themeOptions = Object.values(themes).map(({ id, name }) => ({
  id,
  name,
}));
