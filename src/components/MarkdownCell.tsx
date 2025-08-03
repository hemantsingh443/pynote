import { useState, useRef, useEffect, type MouseEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // Styles for LaTeX
import { useNotebookStore, type Cell } from '../store/notebookStore';
import { Code, Trash2 } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';

interface MarkdownCellProps {
  cell: Cell;
  cellNumber: number;
  onConvertToCode: () => void;
}

export default function MarkdownCell({ cell, cellNumber, onConvertToCode }: MarkdownCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const updateCell = useNotebookStore((state) => state.updateCell);
  const deleteCell = useNotebookStore((state) => state.deleteCell);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea to fit its content
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [cell.content, isEditing]);

  const handleToolbarClick = (e: MouseEvent, action: () => void) => {
    e.stopPropagation(); // Prevent triggering the edit mode
    action();
  };

  const startEditing = () => setIsEditing(true);
  const stopEditing = () => setIsEditing(false);

  return (
    <div className="group relative flex items-start my-1.5 space-x-3">
      {/* Cell number indicators */}
      <div className="flex-shrink-0 w-16 text-right font-mono text-xs text-secondary select-none pt-2 pr-2">
        <div className="whitespace-nowrap">[{cellNumber}]</div>
      </div>

      {/* Main cell content */}
      <div className="flex-grow min-w-0">
        <div className="relative bg-surface rounded border border-transparent group-hover:border-border transition-colors focus-within:ring-1 focus-within:ring-accent focus-within:ring-opacity-50">
          {/* Toolbar */}
          <div className="absolute right-1 -top-5 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 z-10 bg-surface rounded-t border border-b-0 border-border px-1 py-0.5">
            <button
              onClick={(e) => handleToolbarClick(e, onConvertToCode)}
              className="p-1 text-secondary hover:text-accent rounded hover:bg-surface-hover transition-colors"
              title="Convert to Code Cell"
            >
              <Code className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => handleToolbarClick(e, () => setShowDeleteConfirm(true))}
              className="p-1 text-secondary hover:text-error rounded hover:bg-surface-hover transition-colors"
              title="Delete cell"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          <ConfirmationDialog
            isOpen={showDeleteConfirm}
            title="Delete Cell"
            message="Are you sure you want to delete this cell? This action cannot be undone."
            onConfirm={() => deleteCell(cell.id)}
            onCancel={() => setShowDeleteConfirm(false)}
          />

          <div className="w-full px-4 py-2 min-h-[60px]" onClick={startEditing}>
            {isEditing ? (
              <textarea
                ref={textareaRef}
                className="w-full h-full bg-transparent focus:outline-none resize-none font-mono text-base text-foreground"
                value={cell.content}
                onChange={(e) => updateCell(cell.id, e.target.value)}
                onBlur={stopEditing}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    stopEditing();
                  }
                }}
              />
            ) : (
              // Conditionally render a placeholder or the markdown content
              // This fixes the TypeScript error and rendering issue
              cell.content ? (
                <div className="markdown-body max-w-none w-full">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {cell.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-secondary cursor-text select-none">
                  Click to edit markdown
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}