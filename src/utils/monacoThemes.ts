import type * as monaco from 'monaco-editor';
import { type ThemeDefinition } from '../store/themeStore';

// Function to define a Monaco theme based on a theme definition
export const defineMonacoTheme = (monacoInstance: typeof monaco, themeDef: ThemeDefinition) => {
  const { monacoTheme, type, colors } = themeDef;

  const defaultRules: monaco.editor.ITokenThemeRule[] = [
    { token: 'keyword', foreground: colors.syntax?.keywords || colors.primary, fontStyle: 'bold' },
    { token: 'string', foreground: colors.syntax?.strings || colors.success },
    { token: 'number', foreground: colors.syntax?.numbers || colors.warning },
    { token: 'source.python', foreground: colors.text },
    { token: 'identifier', foreground: colors.text },
    { token: 'function', foreground: colors.syntax?.functions || colors.accent },
    { token: 'variable', foreground: colors.syntax?.variables || colors.text },
    { token: 'comment', foreground: colors.syntax?.comments || colors.textSecondary, fontStyle: 'italic' },
    { token: 'type', foreground: colors.syntax?.types || colors.primary },
    { token: 'constant', foreground: colors.syntax?.constants || colors.warning },
    { token: 'operator', foreground: colors.syntax?.operators || colors.accent },
  ];

  monacoInstance.editor.defineTheme(monacoTheme, {
    base: type === 'light' ? 'vs' : 'vs-dark',
    inherit: true,
    rules: themeDef.monacoRules || defaultRules,
    colors: {
      'editor.background': colors.background,
      'editor.foreground': colors.text,
      'editor.lineHighlightBackground': colors.lineHighlight || (type === 'dark' ? '#2c313a' : '#eeeeee'),
      'editor.selectionBackground': colors.selection || (type === 'dark' ? '#3e4451' : '#d7d7d7'),
      'editorCursor.foreground': colors.cursor || colors.accent,
      'editor.lineNumber.foreground': colors.textSecondary,
      'editorGutter.background': colors.gutter || colors.background,
    },
  });
};

// Function to register all themes with Monaco
export const registerAllThemes = (monacoInstance: typeof monaco, themes: Record<string, ThemeDefinition>) => {
  Object.values(themes).forEach(themeDef => {
    // Don't redefine built-in themes like 'vs' or 'vs-dark'
    if (!['vs', 'vs-dark', 'hc-black', 'hc-light'].includes(themeDef.monacoTheme)) {
      defineMonacoTheme(monacoInstance, themeDef);
    }
  });
};
