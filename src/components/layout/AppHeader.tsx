import { Save, FolderOpen, FileInput, Package, Menu } from 'lucide-react';
import { ThemeSelector } from '../ThemeSelector';

interface AppHeaderProps {
  onSaveNotebook: () => void;
  onLoadNotebook: () => void;
  onImportLibrary: () => void;
  onOpenFolder: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function AppHeader({ 
  onSaveNotebook,
  onLoadNotebook,
  onImportLibrary,
  onOpenFolder,
  onToggleSidebar,
  isSidebarOpen,
}: AppHeaderProps) {
  return (
    <header className="bg-surface px-2 py-1 flex items-center justify-between border-b border-border">
      <div className="flex items-center space-x-0.5">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-secondary hover:text-foreground hover:bg-surface-hover rounded"
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>
      
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <h1 className="text-sm font-medium text-foreground">PyNote</h1>
      </div>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={onOpenFolder}
          className="p-1.5 text-secondary hover:text-accent hover:bg-accent/10 rounded"
          title="Open Folder"
        >
          <FolderOpen className="h-3.5 w-3.5" />
        </button>
        
        <div className="h-4 w-px bg-border mx-0.5" />
        
        <ThemeSelector />
        
        <div className="h-4 w-px bg-border mx-0.5" />
        
        <button
          onClick={onSaveNotebook}
          className="p-1.5 text-success hover:text-success/90 hover:bg-success/10 rounded"
          title="Save Notebook"
        >
          <Save className="h-3.5 w-3.5" />
        </button>
        
        <button
          onClick={onLoadNotebook}
          className="p-1.5 text-primary hover:text-primary/90 hover:bg-primary/10 rounded"
          title="Load Notebook"
        >
          <FileInput className="h-3.5 w-3.5" />
        </button>
        
        <button
          onClick={onImportLibrary}
          className="p-1.5 text-warning hover:text-warning/90 hover:bg-warning/10 rounded"
          title="Import Python Library"
        >
          <Package className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
