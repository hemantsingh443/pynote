import { loadPyodide, type PyodideInterface } from 'pyodide';

let pyodide: PyodideInterface | null = null;

// Recursively convert Map objects to plain objects to ensure postMessage compatibility
function sanitizeForPostMessage(obj: any): any {
    if (obj instanceof Map) {
        const plainObj: any = {};
        for (const [key, value] of obj.entries()) {
            plainObj[key] = sanitizeForPostMessage(value);
        }
        return plainObj;
    } else if (obj instanceof Set) {
        return Array.from(obj).map(sanitizeForPostMessage);
    } else if (Array.isArray(obj)) {
        return obj.map(sanitizeForPostMessage);
    } else if (obj && typeof obj === 'object' && obj.constructor === Object) {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeForPostMessage(value);
        }
        return sanitized;
    } else if (obj && typeof obj === 'object') {
        // Handle other object types by converting to string if they can't be serialized
        try {
            JSON.stringify(obj);
            return obj;
        } catch (e) {
            return String(obj);
        }
    }
    return obj;
}

// Python kernel code (same as your existing one)
const KERNEL_CODE = `
import sys
import io
import base64
import warnings
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from pyodide.ffi import to_js

# Suppress matplotlib warnings about non-interactive backend
warnings.filterwarnings('ignore', message='.*FigureCanvasAgg is non-interactive.*')

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
    
    outputs = []
    
    try:
        exec(code, global_vars)
        
        # Get any stdout output first
        stdout_val = output.getvalue().strip()
        if stdout_val:
            outputs.append({'type': 'text', 'data': stdout_val})
        
        # Check for matplotlib figures
        fig = plt.gcf()
        if fig.get_axes():
            buf = io.BytesIO()
            plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
            plt.clf()
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            outputs.append({'type': 'image', 'data': img_base64})

    except Exception as e:
        error_msg = str(e)
        if error_output.getvalue():
            error_msg = error_output.getvalue().strip() + "\\n" + error_msg
        return to_js({'type': 'error', 'data': error_msg})
    finally:
        sys.stdout = sys.__stdout__
        sys.stderr = sys.__stderr__
    
    # Check for any errors in stderr
    stderr_val = error_output.getvalue().strip()
    if stderr_val:
        return to_js({'type': 'error', 'data': stderr_val})
    
    # Try to evaluate the last expression for DataFrames, strings, etc.
    try:
        lines = code.strip().split('\\n')
        if lines:
            last_line = lines[-1].strip()
            if last_line and not last_line.startswith(('print', 'plt.', 'import', 'from', 'def', 'class', 'if', 'for', 'while', 'with', 'try', '#', '=')):
                last_expr_val = eval(last_line, global_vars)
                if last_expr_val is not None:
                    # Handle DataFrame HTML output
                    if hasattr(last_expr_val, 'to_html'):
                        outputs.append({'type': 'html', 'data': last_expr_val.to_html()})
                    # Handle other expressions (strings, numbers, etc.)
                    else:
                        outputs.append({'type': 'text', 'data': str(last_expr_val)})
    except:
        pass
    
    # Return outputs based on what we have
    if len(outputs) > 1:
        return to_js(outputs)
    elif len(outputs) == 1:
        return to_js(outputs[0])
    else:
        # No outputs captured, return empty string
        return to_js({'type': 'string', 'data': ''})
`;

// Initialize Pyodide
async function initializePyodide() {
    if (pyodide) return;
    
    try {
        self.postMessage({ type: 'status', data: 'Loading Python runtime...' });
        
        pyodide = await loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.28.0/full/',
        });
        
        self.postMessage({ type: 'status', data: 'Loading packages...' });
        
        // Load essential packages
        const packages = ['numpy', 'matplotlib', 'scikit-learn', 'micropip'];
        for (const pkg of packages) {
            try {
                await pyodide.loadPackage(pkg);
                self.postMessage({ type: 'status', data: `Loaded ${pkg}` });
            } catch (error) {
                console.warn(`Failed to load package ${pkg}:`, error);
            }
        }
        
        self.postMessage({ type: 'status', data: 'Initializing Python kernel...' });
        pyodide.runPython(KERNEL_CODE);
        
        // Create directories to match main thread
        console.log('Creating initial directories...');
        try {
            pyodide.FS.mkdirTree('/content');
            pyodide.FS.mkdirTree('/mnt');
            pyodide.FS.mkdirTree('/mnt/content');
            console.log('Directories created successfully');
        } catch (e) {
            console.error('Error creating directories:', e);
            // Don't throw - directories might already exist
            console.log('Continuing despite directory creation errors...');
        }
        
        // Add helper to check file system state
        pyodide.runPython(`
import os
import shutil

class PyNoteHelpers:
    def save_to_content(self, filename):
        """Save a file from the current directory to /content"""
        if not os.path.exists(filename):
            print(f"Error: File '{filename}' not found.")
            return
        
        destination = os.path.join('/content', os.path.basename(filename))
        shutil.move(filename, destination)
        print(f"File '{filename}' saved to /content.")
    
    def check_filesystem(self):
        """Check the current file system state"""
        for path in ['/mnt', '/mnt/content', '/content']:
            if os.path.exists(path):
                print(f"✅ {path} exists")
                try:
                    items = os.listdir(path)
                    print(f"  Contents: {items}")
                except:
                    print(f"  Cannot list contents")
            else:
                print(f"❌ {path} does not exist")

pynote = PyNoteHelpers()
`);
        
        // Send file system status
        self.postMessage({ type: 'status', data: 'Checking file system...' });
        
        self.postMessage({ type: 'ready' });
        
    } catch (error) {
        self.postMessage({ 
            type: 'error', 
            data: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
}

// Handle messages from main thread
self.onmessage = async (event) => {
    const { type, data, id } = event.data;
    
    try {
        switch (type) {
            case 'init':
                await initializePyodide();
                break;
                
            case 'execute':
                if (!pyodide) {
                    await initializePyodide();
                }
                
                if (!pyodide) {
                    throw new Error('Failed to initialize Pyodide');
                }
                
                const runCodeKernel = pyodide.globals.get('run_code');
                const result = await runCodeKernel(data.code);
                
                let output;
                if (result && typeof result.toJs === 'function') {
                    // Handle PyProxy objects from Python
                    const jsResult = result.toJs();
                    result.destroy();
                    
                    // Sanitize the result to remove any Map objects
                    const sanitizedResult = sanitizeForPostMessage(jsResult);
                    
                    // Check if it's an array of outputs
                    if (Array.isArray(sanitizedResult)) {
                        output = sanitizedResult;
                    }
                    // Ensure the result has the correct CellOutput format
                    else if (sanitizedResult && typeof sanitizedResult === 'object' && sanitizedResult.type && sanitizedResult.data !== undefined) {
                        output = sanitizedResult;
                    } else {
                        output = { type: 'string', data: JSON.stringify(sanitizedResult, null, 2) };
                    }
                } else {
                    // Sanitize any result to ensure no Map objects
                    const sanitizedResult = sanitizeForPostMessage(result);
                    
                    if (Array.isArray(sanitizedResult)) {
                        output = sanitizedResult;
                    } else if (sanitizedResult && typeof sanitizedResult === 'object' && sanitizedResult.type && sanitizedResult.data !== undefined) {
                        output = sanitizedResult;
                    } else if (sanitizedResult && typeof sanitizedResult === 'object') {
                        output = { type: 'string', data: JSON.stringify(sanitizedResult, null, 2) };
                    } else {
                        // Handle primitive types
                        output = { 
                            type: 'string', 
                            data: sanitizedResult !== undefined && sanitizedResult !== null ? String(sanitizedResult) : '' 
                        };
                    }
                }
                
                // Final safety check before postMessage
                const finalOutput = sanitizeForPostMessage(output);
                self.postMessage({ type: 'result', data: finalOutput, id });
                break;
                
            case 'install':
                if (!pyodide) {
                    await initializePyodide();
                }
                
                if (!pyodide) {
                    throw new Error('Failed to initialize Pyodide');
                }
                
                const micropip = pyodide.pyimport('micropip');
                await micropip.install(data.packageName);
                
                self.postMessage({ type: 'installed', data: data.packageName, id });
                break;
                
            case 'mount':
                if (!pyodide) await initializePyodide();
                if (!pyodide) throw new Error('Pyodide failed to initialize in worker');

                const { handle } = data;
                if (!handle) {
                    self.postMessage({ type: 'error', data: 'No directory handle provided to worker', id });
                    break;
                }

                console.log(`[Worker] Received mount request for directory: ${handle.name}`);

                try {
                    const pyodideFs = pyodide.FS as any;

                    // --- Start Debug Logging ---
                    console.log('[Worker] Checking FS state before mount...');
                    await pyodide.runPythonAsync(`
                        import os
                        print('[Worker] Pre-mount / exists:', os.path.exists('/'))
                        print('[Worker] Pre-mount /mnt exists:', os.path.exists('/mnt'))
                        if os.path.exists('/mnt'):
                            print('[Worker] Pre-mount /mnt contents:', os.listdir('/mnt'))
                    `);
                    // --- End Debug Logging ---

                    try {
                        console.log('[Worker] Attempting to unmount /mnt...');
                        pyodideFs.unmount('/mnt');
                        console.log('[Worker] Unmounted existing /mnt successfully.');
                    } catch (e) {
                        console.log('[Worker] No existing /mnt to unmount, which is okay.');
                    }

                    console.log('[Worker] Ensuring /mnt directory exists and is empty...');
                    await pyodide.runPythonAsync(`
                        import shutil, os
                        if os.path.exists('/mnt'):
                            shutil.rmtree('/mnt')
                        os.makedirs('/mnt')
                    `);

                    console.log('[Worker] Calling mountNativeFS...');
                    await (pyodide as any).mountNativeFS('/mnt', handle);
                    console.log('[Worker] mountNativeFS call completed.');

                    // --- Start Debug Logging ---
                    console.log('[Worker] Checking FS state after mount...');
                    await pyodide.runPythonAsync(`
                        import os
                        print('[Worker] Post-mount /mnt exists:', os.path.exists('/mnt'))
                        if os.path.exists('/mnt'):
                            contents = os.listdir('/mnt')
                            print('[Worker] Post-mount /mnt contents:', contents)
                    `);
                    // --- End Debug Logging ---

                    pyodideFs.mkdirTree('/mnt/content');

                    self.postMessage({ type: 'mounted', data: `Worker mounted ${handle.name}`, id });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error('[Worker] Mount operation failed:', errorMessage);
                    self.postMessage({ type: 'error', data: `Worker mount failed: ${errorMessage}`, id });
                }
                break;
        }
    } catch (error) {
        self.postMessage({ 
            type: 'error', 
            data: error instanceof Error ? error.message : 'Unknown error',
            id 
        });
    }
};
