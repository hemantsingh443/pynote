import type { ReactNode } from 'react';
import { useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronRight, File, Image as ImageIcon, Package, RefreshCw, Download, ArrowRightSquare, Copy } from 'lucide-react';
import { useFileSystemStore } from '../../store/fileSystemStore';
import type { FileNode } from '../../utils/file-tree';
import { useNotebookStore } from '../../store/notebookStore';
import { AppHeader } from './AppHeader';
import Modal from '../common/Modal';
import PackageInstaller from '../PackageInstaller';
import ImagePreviewModal from '../ImagePreviewModal';
import TerminalPanel from '../TerminalPanel';

interface AppLayoutProps {
  children: ReactNode;
  onFileSelect?: (path: string) => void;
}

// Supported image extensions for preview
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg']);

export default function AppLayout({ 
  children, 
  onFileSelect,
}: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const [showPackageInstaller, setShowPackageInstaller] = useState(false);
  const { saveNotebook, loadNotebook } = useNotebookStore();
  


  // File system state from Zustand store
  const {
    fileTree,
    isMounted,
    directoryHandle,
    initFileSystem,
    refreshFileTree,
    openDirectory,
    downloadFile,
    moveFileToMnt,
  } = useFileSystemStore();

  useEffect(() => {
    initFileSystem();
  }, [initFileSystem]);
  
  // Handle saving the notebook
  const handleSaveNotebook = useCallback(async () => {
    try {
      await saveNotebook();
      console.log('Notebook saved successfully');
    } catch (error) {
      console.error('Error saving notebook:', error);
    }
  }, [saveNotebook]);

  const handleLoadNotebook = useCallback(async () => {
    try {
      await loadNotebook();
      console.log('Notebook loaded successfully');
      // You might want to show a success message here
    } catch (error) {
      console.error('Error loading notebook:', error);
      // You might want to show an error message to the user here
    }
  }, [loadNotebook]);

  // Handle importing a library
  const handleImportLibrary = useCallback(() => {
    setShowPackageInstaller(true);
  }, []);
  
  const handleClosePackageInstaller = useCallback(() => {
    setShowPackageInstaller(false);
  }, []);

  // Handle loading a directory
  const handleLoadDirectory = useCallback(async () => {
    try {
      setIsLoading(true);
      await openDirectory();
    } catch (error) {
      console.error('Error loading directory:', error);
    } finally {
      setIsLoading(false);
    }
  }, [openDirectory]);

  // Toggle directory expansion
  const toggleDirectory = (path: string) => {
    setExpandedDirs(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Handle copying a path to the clipboard
  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path).then(() => {
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 1500); // Reset after 1.5 seconds
    }).catch(err => {
      console.error('Failed to copy path:', err);
    });
  };

  // Handle file click
  const handleFileClick = async (node: FileNode) => {
    if (!node.path) return;
    
    const extension = node.name.slice(node.name.lastIndexOf('.')).toLowerCase();
    
    if (IMAGE_EXTENSIONS.has(extension)) {
      try {
        // For images, read the file content and create a data URL
        const pyodide = await import('../../kernel/PyodideLoader').then(m => m.getPyodide());
        
        // Read the file as binary data using the proper FS API
        const data = (pyodide.FS as any).readFile(node.path, { encoding: 'binary' }) as Uint8Array;
        
        // Convert binary data to base64
        const binaryString = Array.from(data)
          .map(byte => String.fromCharCode(byte))
          .join('');
        
        const base64 = btoa(binaryString);
        const mimeType = getMimeType(extension);
        const dataUrl = `data:${mimeType};base64,${base64}`;
        
        setPreviewImage(dataUrl);
      } catch (error) {
        console.error('Error loading image:', error);
        // Fallback to just showing the path if we can't load the image
        setPreviewImage(node.path);
      }
    } else if (onFileSelect) {
      // For other files, use the provided onFileSelect handler
      onFileSelect(node.path);
    }
  };
  
  // Helper function to get MIME type from file extension
  const getMimeType = (extension: string): string => {
    switch (extension) {
      case '.png': return 'image/png';
      case '.jpg':
      case '.jpeg': return 'image/jpeg';
      case '.gif': return 'image/gif';
      case '.bmp': return 'image/bmp';
      case '.webp': return 'image/webp';
      case '.svg': return 'image/svg+xml';
      default: return 'application/octet-stream';
    }
  };

  // Render file tree recursively
  const renderFileTree = (nodes: FileNode[]) => {
    return nodes.map(node => {
      const isExpanded = expandedDirs[node.path];
      const isImage = IMAGE_EXTENSIONS.has(node.name.slice(node.name.lastIndexOf('.')).toLowerCase());

      return (
        <div key={node.path} className="text-xs text-secondary">
          <div className="flex items-center justify-between p-1 rounded group hover:bg-surface-hover">
            <div 
              className="flex items-center cursor-pointer flex-grow truncate"
              onClick={() => node.type === 'directory' ? toggleDirectory(node.path) : handleFileClick(node)}
            >
              {node.type === 'directory' ? (
                isExpanded ? <ChevronDown className="h-4 w-4 mr-1 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 mr-1 flex-shrink-0" />
              ) : (
                <File className="h-3.5 w-3.5 mr-1.5 text-secondary flex-shrink-0" />
              )}
              <span className="truncate" title={node.name}>{node.name}</span>
            </div>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-2">
              {isImage && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleFileClick(node); }}
                  className="p-1 text-secondary hover:text-accent"
                  title="Preview image"
                >
                  <ImageIcon className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); downloadFile(node.path); }}
                className="p-1 text-secondary hover:text-accent"
                title="Download file"
              >
                <Download className="h-3 w-3" />
              </button>
              {directoryHandle && (
                <button
                  onClick={(e) => { e.stopPropagation(); moveFileToMnt(node.path); }}
                  className="p-1 text-secondary hover:text-success"
                  title={`Move to ${directoryHandle.name}`}
                >
                  <ArrowRightSquare className="h-3 w-3" />
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); handleCopyPath(node.path); }}
                className="p-1 text-secondary hover:text-accent"
                title="Copy path"
              >
                {copiedPath === node.path ? <span className="text-xs text-success">Copied!</span> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>
          {node.type === 'directory' && isExpanded && node.children && (
            <div className="pl-4 border-l border-border ml-2">
              {renderFileTree(node.children)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <AppHeader 
        onSaveNotebook={handleSaveNotebook}
        onLoadNotebook={handleLoadNotebook}
        onImportLibrary={handleImportLibrary}
        onOpenFolder={handleLoadDirectory}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />
      
      {/* Main content area with sidebar and editor */}
      <div className="flex h-full overflow-hidden">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-surface p-4 rounded-lg shadow-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Loading files...</span>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <div 
          className={`h-full bg-surface border-r border-border transition-all duration-200 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-0'}`}
          style={{ minWidth: isSidebarOpen ? '16rem' : '0' }}
        >
          <div className="h-full flex flex-col">

            
            {/* File tree */}
            <div className="flex-1 overflow-y-auto p-1">
              {fileTree.length > 0 ? (
                <div className="p-1">
                  <div className="flex items-center justify-between p-1 mb-1 text-xs text-secondary">
                    <span>{isMounted ? (directoryHandle?.name || 'Mounted Folder') : 'Virtual Workspace'}</span>
                    <button
                      onClick={refreshFileTree}
                      className="p-0.5 text-secondary hover:text-accent"
                      title="Refresh file tree"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  </div>
                  {renderFileTree(fileTree)}
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-secondary mb-2">No folder open</p>
                  <button
                    onClick={openDirectory}
                    className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                  >
                    Open Folder
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Notebook cells */}
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
          {/* Terminal Panel */}
          <TerminalPanel />
        </main>
      </div>
      
      {/* Package Installer Modal */}
      <Modal 
        isOpen={showPackageInstaller} 
        onClose={handleClosePackageInstaller}
        title="Install Python Package"
      >
        <div className="space-y-4">
          <div className="flex items-center text-sm text-secondary">
            <Package className="h-4 w-4 mr-2" />
            <span>Enter a package name to install from PyPI</span>
          </div>
          <PackageInstaller onClose={handleClosePackageInstaller} />
        </div>
      </Modal>
      

      
      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal 
          imageUrl={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}