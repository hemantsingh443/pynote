import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { getPyodide } from '../kernel/PyodideLoader';

export interface CellOutput {
  type: 'string' | 'html' | 'image' | 'error';
  data: string; // Can be text, HTML string, or base64 image data
}

export type CellType = 'code' | 'markdown';

export interface Cell {
  id: string;
  type: CellType;
  content: string;
  output?: CellOutput;
  isExecuting?: boolean;
}

interface NotebookState {
  cells: Cell[];
  status: string; // To display messages like "Installing..." or "Ready"
  isKernelReady: boolean; // Tracks if Python kernel is ready
  setStatus: (status: string) => void; // Method to update status
  addCell: (type: CellType, aboveCellId: string | null) => void;
  deleteCell: (id: string) => void;
  moveCell: (id: string, direction: 'up' | 'down') => void;
  updateCell: (id: string, content: string) => void;
  executeCode: (id: string) => Promise<void>;
  installPackage: (packageName: string) => Promise<void>;
  saveNotebook: () => Promise<void>;
  loadNotebook: () => Promise<void>;
  setKernelReady: () => void; // New: Sets kernel as ready
}

export const useNotebookStore = create<NotebookState>((set, get) => ({
  isKernelReady: false,
  status: 'Initializing...',
  // Initialize with a welcome message and a sample code cell.
  cells: [
    {
      id: uuidv4(),
      type: 'markdown',
      content: '# Welcome to PyNote!\n\nThis is a Python notebook that runs in your browser.\n\n- Click the + buttons to add new code or markdown cells\n- Type your Python code in the code cells and press Shift+Enter to run\n- Use markdown cells to add explanations and documentation',
    },
    {
      id: uuidv4(),
      type: 'code',
      content: 'import numpy as np\nimport matplotlib.pyplot as plt\n\n# Sample code - try running this!\nx = np.linspace(0, 2*np.pi, 100)\ny = np.sin(x)\nplt.plot(x, y)\nplt.title("Sine Wave")\nplt.show()',
    },
  ],
  
  setStatus: (status: string) => set({ status }),

  // Action to add a new cell
  addCell: (type, aboveCellId) => {
    const newCell: Cell = { 
      id: uuidv4(), 
      type, 
      content: type === 'code' ? '' : 'New Markdown...' 
    };
    const { cells } = get();
    
    if (!aboveCellId) {
      set({ cells: [...cells, newCell] });
      return;
    }
    
    const index = cells.findIndex(c => c.id === aboveCellId);
    if (index === -1) {
      set({ cells: [...cells, newCell] }); // Add to the end if target not found
    } else {
      const newCells = [...cells];
      newCells.splice(index + 1, 0, newCell); // Insert after the target cell
      set({ cells: newCells });
    }
  },

  // Action to delete a cell
  deleteCell: (id) => {
    set((state) => ({
      cells: state.cells.filter((cell) => cell.id !== id),
    }));
  },

  // Action to move a cell up or down
  moveCell: (id, direction) => {
    const { cells } = get();
    const index = cells.findIndex((c) => c.id === id);
    if ((direction === 'up' && index <= 0) || (direction === 'down' && index >= cells.length - 1)) {
      return; // Can't move further
    }
    
    const newCells = [...cells];
    const cellToMove = newCells.splice(index, 1)[0];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    newCells.splice(newIndex, 0, cellToMove);
    set({ cells: newCells });
  },

  // Action to update the content of a cell
  updateCell: (id, content) => {
    set((state) => ({
      cells: state.cells.map((cell) =>
        cell.id === id ? { ...cell, content } : cell
      ),
    }));
  },

  // Action to execute Python code in a cell.
  executeCode: async (id) => {
    const pyodide = await getPyodide();
    const cell = get().cells.find(c => c.id === id);
    if (!cell || cell.type !== 'code' || !cell.content.trim()) {
      return; // Do nothing if cell is empty
    }

    try {
      // Reset output before execution
      set((state) => ({
        cells: state.cells.map(c => c.id === id ? { ...c, output: { type: 'string', data: 'Running...' } } : c)
      }));

      // Get our Python kernel function
      const runCodeKernel = pyodide.globals.get('run_code');
      // Execute the code using our robust kernel
      const outputFromPython = await runCodeKernel(cell.content);
      
      let output: CellOutput;
      
      // Check if the result is a Map (from to_js in Python)
      if (outputFromPython instanceof Map) {
        // Convert Map to plain object
        output = Object.fromEntries(outputFromPython);
      } 
      // Check if it's a PyProxy with toJs method
      else if (outputFromPython && typeof outputFromPython.toJs === 'function') {
        // Handle PyProxy objects (DataFrames, etc)
        output = outputFromPython.toJs();
        outputFromPython.destroy(); // Clean up the proxy
      } 
      // Handle other cases (strings, numbers, etc)
      else {
        output = { type: 'string', data: String(outputFromPython) };
      }

      set((state) => ({
        cells: state.cells.map((c) => c.id === id ? { ...c, output } : c),
      }));

    } catch (err: any) {
      set((state) => ({
        cells: state.cells.map((c) =>
          c.id === id ? { ...c, output: { type: 'error', data: err.message } } : c
        ),
      }));
    }
  },

  // Action to install a Python package using micropip
  installPackage: async (packageName) => {
    set({ status: `Installing '${packageName}'...` });
    try {
      const pyodide = await getPyodide();
      await pyodide.loadPackage('micropip');
      const micropip = pyodide.pyimport('micropip');
      await micropip.install(packageName);
      set({ status: `Successfully installed '${packageName}'` });
    } catch (err: any) {
      console.error('Error installing package:', err);
      set({ status: `Error installing '${packageName}': ${err.message}` });
    }
  },

  // ACTION TO SAVE THE NOTEBOOK TO A FILE
  saveNotebook: async () => {
    try {
      const cells = get().cells;
      const notebookData = JSON.stringify(cells, null, 2); // Pretty-print JSON
      const blob = new Blob([notebookData], { type: 'application/json' });
      
      // Check if the File System Access API is available
      if ('showSaveFilePicker' in window) {
        try {
          // Use the File System Access API if available
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: 'notebook.pynote.json',
            types: [{
              description: 'PyNote Notebook',
              accept: { 'application/json': ['.json'] },
            }],
          });
          
          // If we get here, user didn't cancel
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          set({ status: 'Notebook saved successfully!' });
          return;
        } catch (error: any) {
          // If user cancelled, return early
          if (error.name === 'AbortError' || error.name === 'NotAllowedError') {
            return;
          }
          console.warn('File System Access API error, falling back to download method:', error);
          // Continue to fallback method
        }
      }
      
      // Fallback for browsers that don't support the File System Access API
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'notebook.pynote.json';
      
      // For the fallback method, we can't prevent the download dialog,
      // but we can clean up after ourselves
      const cleanup = () => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };
      
      // Add a small delay to ensure the click handler is properly set up
      setTimeout(() => {
        document.body.appendChild(a);
        a.click();
        // Use a small timeout to ensure the click is processed before cleanup
        setTimeout(cleanup, 100);
      }, 0);
      
      set({ status: 'Notebook download started...' });
    } catch (err: any) {
      // Only show error if it's not a cancellation
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        console.error("Error saving notebook:", err);
        set({ status: `Error: ${err.message}` });
      }
    }
  },

  // ACTION TO LOAD A NOTEBOOK FROM A JSON FILE
  // Set kernel as ready
  setKernelReady: () => set({ isKernelReady: true, status: 'Ready' }),

  loadNotebook: async () => {
    try {
      // Check if the File System Access API is available
      if (!('showOpenFilePicker' in window)) {
        throw new Error('File System Access API is not supported in this browser');
      }

      // Type assertion to handle the File System Access API
      const fileHandles = await (window as any).showOpenFilePicker({
        types: [{
          description: 'PyNote Notebook',
          accept: { 'application/json': ['.json'] },
        }],
      });
      
      if (!fileHandles || fileHandles.length === 0) {
        return; // User cancelled the file picker
      }
      
      const file = await fileHandles[0].getFile();
      const content = await file.text();
      const cells = JSON.parse(content);
      
      // Basic validation
      if (Array.isArray(cells) && cells.every(c => c.id && c.type && c.content !== undefined)) {
        set({ cells, status: 'Notebook loaded successfully!' });
      } else {
        throw new Error('Invalid notebook file format.');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Error loading notebook:", err);
        set({ status: `Error: ${err.message}` });
      }
    }
  },
}));