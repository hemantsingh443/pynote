import Editor from '@monaco-editor/react';
import { useState, useRef, useEffect } from 'react';
import { useNotebookStore, type Cell } from '../store/notebookStore';
import { useThemeStore, themes as allThemes } from '../store/themeStore';
import OutputPanel from './OutputPanel';
import { Play, Type, Trash2, Keyboard } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';
import { editorOptions } from '../utils/editorTheme';
import { defineMonacoTheme } from '../utils/monacoThemes';
import type * as monaco from 'monaco-editor';

// Extend Window interface for Monaco
interface CustomWindow extends Window {
  MonacoEnvironment?: {
    getWorker: any;
    getWorkerUrl?: any;
    globalAPI?: boolean;
    baseUrl?: string;
    createTrustedTypesPolicy?: any;
  };
}

declare const window: CustomWindow;

interface CodeCellProps {
  cell: Cell;
  onConvertToMarkdown: () => void;
  cellNumber: number;
}

export default function CodeCell({
  cell,
  onConvertToMarkdown,
  cellNumber,
}: CodeCellProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const updateCell = useNotebookStore((state) => state.updateCell);
  const executeCode = useNotebookStore((state) => state.executeCode);
  const deleteCell = useNotebookStore((state) => state.deleteCell);

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const { theme: currentTheme } = useThemeStore();

  // Handle editor mount
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
    
    // Set initial theme
    if (currentTheme.monacoTheme) {
      monacoInstance.editor.setTheme(currentTheme.monacoTheme);
    }

    // Add keyboard shortcut for Shift+Enter to run the cell
    editor.addCommand(
      monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.Enter,
      () => {
        executeCode(cell.id);
        // Prevent the default behavior of adding a new line
        return null;
      },
      '' // No condition
    );
  };

  // Update editor theme when theme changes
  useEffect(() => {
    if (monacoRef.current && currentTheme.monacoTheme) {
      // Ensure the theme is defined before setting it
      if (!monacoRef.current.editor.defineTheme) {
        console.warn('Monaco editor theme API not available');
        return;
      }
      
      // Find the theme definition
      const themeDef = Object.values(allThemes).find(
        (t) => t.monacoTheme === currentTheme.monacoTheme
      );
      
      if (themeDef) {
        // Make sure the theme is defined in Monaco
        defineMonacoTheme(monacoRef.current, themeDef);
        // Set the theme
        monacoRef.current.editor.setTheme(currentTheme.monacoTheme);
      } else {
        console.warn(`Theme ${currentTheme.monacoTheme} not found`);
      }
    }
  }, [currentTheme]);



  return (
    <div className="group relative my-1.5">
      {/* Input Row */}
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-16 text-right font-mono text-xs text-secondary select-none pt-2 pr-2">
          <div className="whitespace-nowrap">In [{cellNumber}]:</div>
        </div>
        <div className="flex-grow min-w-0">
          <div className="relative bg-surface rounded border border-transparent group-hover:border-border transition-colors focus-within:ring-1 focus-within:ring-accent focus-within:ring-opacity-50">
            {/* Toolbar - shown on hover */}
            <div className="absolute right-1 -top-5 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 z-10 bg-surface rounded-t border border-b-0 border-border px-1 py-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  executeCode(cell.id);
                }}
                disabled={cell.isExecuting}
                className="p-1 text-secondary hover:text-accent rounded hover:bg-surface-hover transition-colors"
                title="Run cell (Shift+Enter)"
              >
                <div className="relative">
                  <Play className="h-3 w-3" />
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 hidden group-hover/run:flex items-center gap-1 bg-surface border border-border text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    <span>Run cell</span>
                    <kbd className="inline-flex items-center justify-center h-5 px-1.5 text-xs font-mono font-medium text-foreground bg-surface-hover border border-border rounded">
                      <Keyboard className="w-3 h-3 mr-1" />
                      <span>Shift</span>
                      <span>+</span>
                      <span>Enter</span>
                    </kbd>
                  </div>
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConvertToMarkdown();
                }}
                className="p-1 text-secondary hover:text-accent rounded hover:bg-surface-hover transition-colors"
                title="Convert to Markdown"
              >
                <Type className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="p-1 text-secondary hover:text-error rounded hover:bg-surface-hover transition-colors"
                title="Delete cell"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              <ConfirmationDialog
                isOpen={showDeleteConfirm}
                title="Delete Cell"
                message="Are you sure you want to delete this cell? This action cannot be undone."
                onConfirm={() => {
                  deleteCell(cell.id);
                  setShowDeleteConfirm(false);
                }}
                onCancel={() => setShowDeleteConfirm(false)}
              />
            </div>
            <div className="relative w-full">
              <div className="rounded overflow-hidden">
                <div className="w-full min-h-[60px] rounded">
                  <Editor
                    height="auto"
                    defaultLanguage="python"
                    value={cell.content}
                    onChange={(value) => updateCell(cell.id, value || '')}
                    options={{
                      ...editorOptions,
                      scrollBeyondLastLine: false,
                      scrollbar: {
                        vertical: 'hidden',
                        horizontal: 'hidden',
                        handleMouseWheel: false,
                      },
                      lineNumbers: 'off',
                      minimap: { enabled: false },
                      folding: false,
                      glyphMargin: false,
                      lineDecorationsWidth: 0,
                      lineNumbersMinChars: 0,
                      automaticLayout: true,
                      padding: { top: 8, bottom: 8 },
                      renderLineHighlight: 'none',
                      contextmenu: false,
                      lineHeight: 20,
                      autoClosingBrackets: 'always' as const,
                      autoClosingQuotes: 'always' as const,
                    }}
                    onMount={(editor, monaco) => {
                      handleEditorDidMount(editor, monaco);
                      const updateHeight = () => {
                        const contentHeight = editor.getContentHeight();
                        const container = editor.getContainerDomNode();
                        container.style.height = `${contentHeight}px`;
                        editor.layout({
                          width: container.offsetWidth,
                          height: contentHeight
                        });
                      };
                      updateHeight();
                      const contentChangeListener = editor.onDidContentSizeChange(updateHeight);
                      const resizeObserver = new ResizeObserver(updateHeight);
                      resizeObserver.observe(editor.getContainerDomNode().parentElement!);
                      return () => {
                        resizeObserver.disconnect();
                        contentChangeListener.dispose();
                      };
                    }}
                    theme={currentTheme.monacoTheme}
                    loading={
                      <div className="h-12 w-full bg-surface-secondary animate-pulse rounded"></div>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Output Row */}
      {cell.output && (
        <div className="flex items-start space-x-3 mt-2">
          <div className="flex-shrink-0 w-16 text-right font-mono text-xs text-secondary select-none pt-2 pr-2">
            <div className="whitespace-nowrap">Out[{cellNumber}]:</div>
          </div>
          <div className="flex-grow min-w-0">
            <div className="bg-surface rounded border border-border">
              <div className="px-4 py-2">
                <OutputPanel output={cell.output} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}