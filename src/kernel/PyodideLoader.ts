import type { PyodideInterface } from "pyodide";
import { loadPyodide } from "pyodide";

export type { PyodideInterface };
import { useNotebookStore } from '../store/notebookStore';

let pyodide: PyodideInterface | undefined;
let pyodideReadyPromise: Promise<PyodideInterface> | undefined;

const KERNEL_CODE = `
import sys
import io
import base64
import matplotlib
import matplotlib.pyplot as plt
import pandas as pd
from pyodide.ffi import to_js

matplotlib.use('Agg') 
def do_nothing_show(*args, **kwargs):
    """A dummy function to replace plt.show()"""
    pass
plt.show = do_nothing_show

def run_code(code):
    """
    Executes user code and intelligently captures the output.
    This function maintains a persistent global state.
    """
    output = io.StringIO()
    error_output = io.StringIO()
    sys.stdout = output
    sys.stderr = error_output

    global_vars = sys.modules['__main__'].__dict__
    
    try:
        exec(code, global_vars)
        
        fig = plt.gcf()
        if fig.get_axes():
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight')
            plt.clf()
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            return to_js({'type': 'image', 'data': img_base64})

    except Exception as e:
        # If there's an execution error, return it
        return to_js({'type': 'error', 'data': str(e)})

    finally:
        # Restore stdout and stderr
        sys.stdout = sys.__stdout__
        sys.stderr = sys.__stderr__

    # If no plot, return the captured stdout/stderr
    stdout_val = output.getvalue()
    stderr_val = error_output.getvalue()

    if stderr_val:
        return to_js({'type': 'error', 'data': stderr_val})
    
    # Check if last line was a DataFrame and return it as HTML
    try:
        last_expr_val = eval(code.splitlines()[-1], global_vars)
        if isinstance(last_expr_val, pd.DataFrame):
            return to_js({'type': 'html', 'data': last_expr_val.to_html()})
    except:
        pass # Ignore errors from trying to eval the last line

    return to_js({'type': 'string', 'data': stdout_val})
`;

async function loadPyodideAndPackages(): Promise<PyodideInterface> {
    console.log("Starting Pyodide initialization...");
    if (pyodide) {
        console.log("Pyodide already initialized, returning existing instance");
        return pyodide;
    }
    
    try {
        const store = useNotebookStore.getState();
        const statusUpdate = (msg: string) => {
            console.log(`Status: ${msg}`);
            store.setStatus(msg);
        };
        
        statusUpdate('Downloading Python runtime...');
        console.log("Loading Pyodide from CDN...");
        
        // Use a CDN for Pyodide with detailed logging
        const pyodideOptions = { 
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.0/full/",
            stdout: (text: string) => console.log(`Pyodide: ${text}`),
            stderr: (text: string) => console.error(`Pyodide Error: ${text}`),
        };
        console.log("Pyodide options:", pyodideOptions);
        
        pyodide = await loadPyodide(pyodideOptions);
        console.log("Pyodide loaded successfully!");
        
        statusUpdate('Loading essential packages...');
        
        // Load packages one by one with progress updates
        const packages = ["numpy", "pandas", "matplotlib", "micropip"];
        
        for (const pkg of packages) {
            const msg = `Loading ${pkg}...`;
            statusUpdate(msg);
            console.time(`Package ${pkg} load time`);
            
            try {
                await pyodide.loadPackage(pkg);
                console.timeEnd(`Package ${pkg} load time`);
                console.log(`Successfully loaded package: ${pkg}`);
            } catch (pkgError) {
                console.error(`Failed to load package ${pkg}:`, pkgError);
                throw pkgError;
            }
        }
        
        statusUpdate('Initializing Python kernel...');
        console.log("Running Python kernel initialization code...");
        pyodide.runPython(KERNEL_CODE);
        
        statusUpdate('Ready');
        console.log('Pyodide and micropip are ready.');

        // Create a /content directory for user-generated files
        pyodide.FS.mkdirTree('/content');

        // Inject a helper function for saving files to the /content directory
        pyodide.runPython(`
          import shutil
          import os

          class PyNoteHelpers:
              def save(self, filename):
                  if not os.path.exists(filename):
                      print(f"Error: File '{filename}' not found.")
                      return
                  
                  destination = os.path.join('/content', os.path.basename(filename))
                  shutil.move(filename, destination)
                  print(f"File '{filename}' saved to /content.")

          pynote = PyNoteHelpers()
        `);

        useNotebookStore.getState().setKernelReady();
        useNotebookStore.getState().setStatus('Python kernel ready.');
        
        return pyodide;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error("Error initializing Pyodide:", error);
        useNotebookStore.getState().setStatus(`Error: ${errorMessage}`);
        throw error; // Re-throw to be handled by the caller
    }
}

/**
 * Mount a local directory to the Pyodide filesystem
 * @param directoryHandle A directory handle from the File System Access API
 */
export async function mountLocalDirectory(directoryHandle: FileSystemDirectoryHandle) {
    const pyodide = await getPyodide();
    
    // Create a directory in the Pyodide filesystem
    const mountPath = `/mnt/${directoryHandle.name}`;
    pyodide.FS.mkdirTree(mountPath);
    
    // Recursively read the directory and mount files
    const mountDirectory = async (dirHandle: FileSystemDirectoryHandle, path: string) => {
        for await (const entry of (dirHandle as any).values()) {
            const entryPath = `${path}/${entry.name}`;
            
            if (entry.kind === 'file' && 'getFile' in entry) {
                const file = await (entry as FileSystemFileHandle).getFile();
                const data = await file.arrayBuffer();
                pyodide.FS.writeFile(entryPath, new Uint8Array(data));
            } else if (entry.kind === 'directory') {
                pyodide.FS.mkdirTree(entryPath);
                await mountDirectory(entry as FileSystemDirectoryHandle, entryPath);
            }
        }
    };
    
    await mountDirectory(directoryHandle, mountPath);
    return mountPath;
}

export async function loadLocalFileOrDirectory(): Promise<{ success: boolean, path?: string, error?: string }> {
    try {
        if (!window.showDirectoryPicker) {
            return { 
                success: false, 
                error: 'File System Access API is not supported in this browser. Please use a modern browser like Chrome/Edge 86+ or Firefox 111+.' 
            };
        }

        if (!window.showDirectoryPicker) {
            return { success: false, error: 'File System Access API not supported' };
        }
        
        try {
            const handle = await window.showDirectoryPicker({
                id: 'pyodide-fs',
                mode: 'read',
                startIn: 'documents'
            });
            
            const mountPath = await mountLocalDirectory(handle);
            return { success: true, path: mountPath };
        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error.name === 'AbortError' || error.name === 'SecurityError') {
                    return { success: false, error: 'Directory selection was cancelled or not allowed' };
                }
            }
            throw error; // Re-throw other errors to be caught by the outer try-catch
        }
        return { success: false, error: 'No directory selected' };
    } catch (error) {
        console.error('Error loading local directory:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to load directory' 
        };
    }
}

let isPyodideInitialized = false;

export function getPyodide(): Promise<PyodideInterface> {
    if (!pyodideReadyPromise) {
        pyodideReadyPromise = loadPyodideAndPackages().then(instance => {
            isPyodideInitialized = true;
            return instance;
        });
    }
    return pyodideReadyPromise;
}

export async function cleanupPyodide(): Promise<void> {
    if (pyodide) {
        try {
            await pyodide.runPythonAsync('import sys; sys.modules.clear()');
            pyodide = undefined;
            pyodideReadyPromise = undefined;
            isPyodideInitialized = false;
            console.log('Pyodide instance cleaned up');
        } catch (error) {
            console.error('Error cleaning up Pyodide:', error);
        }
    }
}

// Clean up on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        if (isPyodideInitialized) {
            cleanupPyodide().catch(console.error);
        }
    });
}