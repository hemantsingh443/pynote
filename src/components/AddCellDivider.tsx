import { Code, FileText } from 'lucide-react';
import { useNotebookStore } from '../store/notebookStore';

interface AddCellDividerProps {
  aboveCellId?: string | null;
  beforeCellId?: string | null;
}

export default function AddCellDivider({ aboveCellId, beforeCellId }: AddCellDividerProps) {
  // Use beforeCellId if provided, otherwise fall back to aboveCellId for backward compatibility
  // Ensure we're only passing string | null to addCell
  const targetCellId = beforeCellId !== undefined ? beforeCellId : aboveCellId;
  const addCell = useNotebookStore((state) => state.addCell);

  return (
    <div className="relative group h-8 -my-4 flex items-center justify-center z-10">
      {/* Visible line on hover */}
      <div className="w-full border-t border-accent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Buttons appear on hover */}
      <div className="absolute flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button 
          onClick={() => addCell('code', targetCellId || null)} 
          className="flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-md bg-surface border border-border text-secondary hover:bg-surface-hover hover:border-accent transition-all"
          title="Add code cell"
        >
          <Code className="h-3.5 w-3.5" />
          <span>Code</span>
        </button>
        <button 
          onClick={() => addCell('markdown', targetCellId || null)} 
          className="flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-md bg-surface border border-border text-secondary hover:bg-surface-hover hover:border-accent transition-all"
          title="Add markdown cell"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Text</span>
        </button>
      </div>
    </div>
  );
}