import { useEffect } from 'react';
import { useNotebookStore, type Cell } from './store/notebookStore';
import CodeCell from './components/CodeCell';
import MarkdownCell from './components/MarkdownCell';
import AddCellDivider from './components/AddCellDivider';
import { getPyodide } from './kernel/PyodideLoader';
import AppLayout from './components/layout/AppLayout';
import { ThemeProvider } from './components/ThemeProvider';


function KernelLoadingOverlay() {
  const status = useNotebookStore((state) => state.status);
  
  // Log when the status changes
  useEffect(() => {
    console.log('Kernel status changed:', status);
  }, [status]);

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 bg-opacity-80 flex items-center justify-center z-50">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-800 dark:text-white">
          {status || 'Initializing Python Kernel...'}
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          This may take a moment on first load.
        </p>
      </div>
    </div>
  );
}

function AppContent() {
  console.log('AppContent component rendering...');
  
  const cells = useNotebookStore((state) => state.cells);
  const isKernelReady = useNotebookStore((state) => state.isKernelReady);
  const status = useNotebookStore((state) => state.status);
  const setStatus = useNotebookStore((state) => state.setStatus);
  
  // Initialize Pyodide when the app loads
  useEffect(() => {
    console.log('App mounted, initializing Pyodide...');
    
    const initPyodide = async () => {
      try {
        console.log('Starting Pyodide initialization from App...');
        await getPyodide();
        console.log('Pyodide initialization completed in App');
      } catch (error) {
        console.error('Failed to initialize Pyodide in App:', error);
        setStatus(`Error: ${error instanceof Error ? error.message : 'Failed to initialize Python'}`);
      }
    };

    if (!isKernelReady) {
      initPyodide();
    }
  }, [isKernelReady, setStatus]);

  console.log('App render - isKernelReady:', isKernelReady, 'status:', status);

  const { addCell, deleteCell, updateCell } = useNotebookStore();

  const renderCell = (cell: Cell, index: number) => {
    const cellNumber = index + 1;
    
    const handleConvertCell = (targetType: 'code' | 'markdown', cellId: string, content: string) => {
      const cellIndex = cells.findIndex(c => c.id === cellId);
      const prevCellId = cellIndex > 0 ? cells[cellIndex - 1].id : null;
      
      // Delete the current cell
      deleteCell(cellId);
      
      // Add new cell of target type
      addCell(targetType, prevCellId);
      
      // Find the new cell (should be at the same position)
      const newCellIndex = prevCellId 
        ? cells.findIndex(c => c.id === prevCellId) + 1
        : 0;
      
      // Update the new cell's content
      if (cells[newCellIndex]) {
        updateCell(cells[newCellIndex].id, content);
      }
    };
    
    switch (cell.type) {
      case 'code':
        return (
          <CodeCell 
            key={cell.id}
            cell={cell}
            cellNumber={cellNumber}
            onConvertToMarkdown={() => handleConvertCell('markdown', cell.id, cell.content)}
          />
        );
      case 'markdown':
        return (
          <MarkdownCell 
            key={cell.id}
            cell={cell}
            cellNumber={cellNumber}
            onConvertToCode={() => handleConvertCell('code', cell.id, cell.content)}
          />
        );
      default:
        return null;
    }
  };

 


  return (
    <AppLayout>
      {!isKernelReady && <KernelLoadingOverlay />}
      
      <div className="w-full max-w-6xl mx-auto pb-96">
          {cells.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="mb-4">No cells in this notebook</p>
            <button
              onClick={() => {
                const { addCell } = useNotebookStore.getState();
                addCell('code', null);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add your first cell
            </button>
          </div>
        ) : (
          <>
            <AddCellDivider beforeCellId={null} />
            {cells.map((cell, index) => (
              <div key={cell.id} className="relative">
                {renderCell(cell, index)}
                <AddCellDivider beforeCellId={cell.id} />
              </div>
            ))}
          </>
        )}
</div>
    </AppLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}