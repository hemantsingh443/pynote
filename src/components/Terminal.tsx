import { useState, useRef, useEffect, useCallback } from 'react';
import { getPyodide, type PyodideInterface } from '../kernel/PyodideLoader';
import { useFileSystemStore } from '../store/fileSystemStore';
import { useThemeStore } from '../store/themeStore';


// Types
type CommandType = 'input' | 'output' | 'error';

interface Command {
  text: string;
  type: CommandType;
}

interface FileSystemEntry {
  name:string;
  isDirectory: boolean;
}

// Extend Pyodide FS types
declare global {
  interface Window {
    pyodide: {
      FS: {
        readdir(path: string): string[];
        stat(path: string): { mode: number; size: number };
        mkdirTree(path: string): void;
        writeFile(path: string, data: Uint8Array | string, options?: { encoding: string }): void;
        readFile(path: string, options: { encoding: 'utf8' }): string;
        readFile(path: string, options?: { encoding?: string }): Uint8Array;
      };
      runPythonAsync(code: string): Promise<any>;
      loadPackage(packages: string[]): Promise<void>;
    };
  }
}

const Terminal: React.FC = () => {
  // State
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Command[]>([]);
  const [cwd, setCwd] = useState('/');
  const [isLoading, setIsLoading] = useState(true);
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  const refreshFileTree = useFileSystemStore((state) => state.refreshFileTree);
  const { theme } = useThemeStore();

  // Refs
  const endOfTerminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  

  // Initialize Pyodide
  useEffect(() => {
    const initialize = async () => {
      try {
        const py = await getPyodide();
        setPyodide(py);

        // Initialize filesystem
        await py.runPythonAsync(`
          import os
          if not os.path.exists('/mnt'):
              os.mkdir('/mnt')
          if not os.path.exists('/content'):
              os.mkdir('/content')
        `);

        // Set initial directory
        setCwd('/');
        addToHistory('Terminal initialized. Type `help` for available commands.');
      } catch (error) {
        console.error('Failed to initialize terminal:', error);
        addToHistory('Error: Failed to initialize terminal', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    endOfTerminalRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Add a command to history
  const addToHistory = useCallback((text: string, type: CommandType = 'output') => {
    setHistory(prev => [...prev, { text, type }]);
  }, []);

  // Helper to resolve file paths
  const resolvePath = (path: string): string => {
    if (!path) return cwd;
    if (path.startsWith('/')) return path;
    if (path === '~') return '/home';
    if (path === '-') return '/';

    let currentPath = cwd;
    if (!currentPath.endsWith('/')) {
        currentPath += '/';
    }

    const parts = (currentPath + path).split('/').filter(p => p && p !== '.');
    const resolvedParts: string[] = [];

    for (const part of parts) {
        if (part === '..') {
            resolvedParts.pop();
        } else {
            resolvedParts.push(part);
        }
    }
    
    const result = '/' + resolvedParts.join('/');
    return result === '/' ? '/' : result.replace(/\/$/, '');
  };

  // Helper to read file as text
  const readFileAsText = (path: string): string | null => {
    if (!pyodide) return null;
    try {
      return (pyodide.FS as any).readFile(path, { encoding: 'utf8' });
    } catch (e) {
      console.error('Error reading file:', e);
      return null;
    }
  };
  
  // Command Handlers
  const handleLs = useCallback(async (args: string[]) => {
    if (!pyodide) return;
    
    try {
      const targetPath = args[0] ? resolvePath(args[0]) : cwd;
      
      try {
        const stat = pyodide.FS.stat(targetPath);
        if ((stat.mode & 0o040000) === 0) {
          const fileName = targetPath.split('/').pop() || targetPath;
          addToHistory(`-rw-r--r-- 1 user user ${stat.size} ${new Date().toLocaleDateString()} ${fileName}`);
          return;
        }
      } catch (e) {
        addToHistory(`ls: cannot access '${args[0] || targetPath}': No such file or directory`, 'error');
        return;
      }
      
      const files = pyodide.FS.readdir(targetPath);
      const entries: FileSystemEntry[] = [];
      
      for (const fileName of files) {
        if (fileName === '.' || fileName === '..') continue;
        
        try {
          const filePath = `${targetPath}${targetPath.endsWith('/') ? '' : '/'}${fileName}`;
          const stat = pyodide.FS.stat(filePath);
          entries.push({
            name: fileName,
            isDirectory: (stat.mode & 0o040000) !== 0
          });
        } catch (error) {
          console.error(`Error reading ${fileName}:`, error);
        }
      }
      
      const output = entries
        .sort((a, b) => {
          if (a.isDirectory === b.isDirectory) {
            return a.name.localeCompare(b.name);
          }
          return a.isDirectory ? -1 : 1;
        })
        .map(entry => `${entry.isDirectory ? '📁' : '📄'} ${entry.name}`)
        .join('\n');
      
      addToHistory(output || 'Empty directory');
    } catch (error) {
      addToHistory(`ls: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [pyodide, cwd, addToHistory, resolvePath]);

  const handleCd = useCallback((args: string[]) => {
    if (!pyodide) return;
    
    try {
      const targetPath = args[0] ? resolvePath(args[0]) : '/home';
      
      try {
        const stat = pyodide.FS.stat(targetPath);
        if ((stat.mode & 0o040000) === 0) {
          addToHistory(`cd: ${args[0] || '~'}: Not a directory`, 'error');
          return;
        }
        setCwd(targetPath || '/');
      } catch (error) {
        addToHistory(`cd: ${args[0] || '~'}: No such file or directory`, 'error');
      }
    } catch (error) {
      addToHistory(`cd: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [pyodide, addToHistory, resolvePath]);

  const handleCat = useCallback((args: string[]) => {
    if (!pyodide) return;
    
    if (!args[0]) {
      addToHistory('Usage: cat <file>', 'error');
      return;
    }
    
    try {
      const filePath = resolvePath(args[0]);
      const content = readFileAsText(filePath);
      
      if (content === null) {
        addToHistory(`cat: ${args[0]}: No such file or directory`, 'error');
        return;
      }
      
      addToHistory(content);
    } catch (error) {
      addToHistory(`cat: ${error instanceof Error ? error.message : 'Failed to read file'}`, 'error');
    }
  }, [pyodide, addToHistory, resolvePath]);

  const handleWget = useCallback(async (args: string[]) => {
    if (args.length === 0) {
      addToHistory('Usage: wget <url> [save_path]', 'error');
      return;
    }

    const url = args[0];
    const fileName = url.split('/').pop() || 'download';
    const savePath = args[1] ? resolvePath(args[1]) : `/mnt/content/${fileName}`;

    addToHistory(`Downloading from ${url}...`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.arrayBuffer();
      pyodide?.FS.writeFile(savePath, new Uint8Array(data));
      addToHistory(`Saved to ${savePath}`);
      await refreshFileTree();
    } catch (error) {
      addToHistory(`wget: ${error instanceof Error ? error.message : 'Failed to download'}`, 'error');
    }
  }, [pyodide, addToHistory, resolvePath, refreshFileTree]);

  const handleGitClone = useCallback(async (args: string[]) => {
    if (!pyodide) return;
    if (!args[0]) {
      addToHistory('Usage: git clone <url>', 'error');
      return;
    }

    let repoUrl = args[0];
    // Ensure it's a standard GitHub URL for zip download
    if (repoUrl.endsWith('.git')) {
      repoUrl = repoUrl.slice(0, -4);
    }
    if (!repoUrl.startsWith('https://github.com/')) {
        addToHistory('Error: Only GitHub repositories are supported for cloning.', 'error');
        return;
    }

    const repoName = repoUrl.split('/').pop() || 'repository';
    const clonePath = `/mnt/content`;
    const zipPath = `/tmp/${repoName}.zip`;

    addToHistory(`Cloning ${repoUrl} into ${clonePath}/${repoName}...`);

    try {
      // Use our Vercel serverless function to download the repository
      const response = await fetch('/api/clone-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoUrl })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to download repository: ${response.statusText}`);
      }
      
      const { data: base64Data } = await response.json();
      
      // Convert base64 back to binary data
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      (pyodide.FS as any).writeFile(zipPath, bytes, { encoding: 'binary' });

      // Extract the zip file
      await pyodide.runPythonAsync(`
        import zipfile
        import os

        zip_path = "${zipPath}"
        extract_path = "${clonePath}"

        os.makedirs(extract_path, exist_ok=True)

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # The files are often inside a directory like 'repo-main', let's move them up
            first_member = zip_ref.namelist()[0]
            root_dir_name = first_member.split('/')[0]
            zip_ref.extractall(extract_path)
            
            # Move contents from the extracted folder to the desired clone path
            extracted_root = os.path.join(extract_path, root_dir_name)
            final_repo_path = os.path.join(extract_path, "${repoName}")

            if os.path.exists(final_repo_path):
                # For simplicity, we are not handling merging. Remove if it exists.
                import shutil
                shutil.rmtree(final_repo_path)

            os.rename(extracted_root, final_repo_path)

        os.remove(zip_path)
      `);

      addToHistory(`Successfully cloned repository.`);
      await refreshFileTree();
    } catch (error) {
      addToHistory(`git clone: ${error instanceof Error ? error.message : 'Failed to clone'}`, 'error');
    }
  }, [pyodide, addToHistory, refreshFileTree]);

  const handlePython = useCallback(async (code: string) => {
    if (!pyodide) {
      addToHistory('Error: Pyodide not ready', 'error');
      return;
    }
    
    try {
      const trimmedCode = code.trim();
      const isFilePath = trimmedCode.startsWith('./') || trimmedCode.startsWith('/');

      if (isFilePath) {
        const filePath = resolvePath(trimmedCode);
        const fileContent = readFileAsText(filePath);
        
        if (fileContent === null) {
          addToHistory(`python: can't open file '${trimmedCode}': No such file or directory`, 'error');
          return;
        }
        
        const result = await pyodide.runPythonAsync(fileContent);
        if (result !== undefined) {
          addToHistory(String(result));
        }
      } else {
        const result = await pyodide.runPythonAsync(trimmedCode);
        if (result !== undefined) {
          addToHistory(String(result));
        }
      }
    } catch (error) {
      addToHistory(`Python error: ${error instanceof Error ? error.message : 'Execution failed'}`, 'error');
    }
  }, [pyodide, addToHistory, resolvePath]);

  const showHelp = useCallback(() => {
    const helpText = `
Available commands:
  ls [path]      - List directory contents
  cd [path]      - Change directory
  pwd            - Print working directory
  cat <file>     - Display file contents
  clear          - Clear the terminal
  help           - Show this help message
  
Git commands:
  git clone <url>  - Clone a git repository
  
Network commands:
  wget <url> [save_path] - Download a file from URL
  
Python execution:
  python <code>   - Execute Python code
`;
    addToHistory(helpText);
  }, [addToHistory]);

  // Execute command
  const executeCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;
    
    addToHistory(`$ ${command}`, 'input');
    
    const trimmedCommand = command.trim();
    const [cmd, ...args] = trimmedCommand.split(/\s+/);
    
    try {
      switch (cmd.toLowerCase()) {
        case 'ls':
          await handleLs(args);
          break;
        case 'cd':
          handleCd(args);
          break;
        case 'pwd':
          addToHistory(cwd);
          break;
        case 'clear':
          setHistory([]);
          break;
        case 'help':
          showHelp();
          break;
        case 'git':
          if (args[0] === 'clone') {
            await handleGitClone(args.slice(1));
          } else {
            addToHistory(`git: '${args[0] || ''}' is not a git command. See 'git --help'`, 'error');
          }
          break;
        case 'wget':
          await handleWget(args);
          break;
        case 'python':
          await handlePython(trimmedCommand.substring(7).trim());
          break;
        case 'cat':
          handleCat(args);
          break;
        default:
          addToHistory(`Command not found: ${cmd}. Type 'help' for available commands.`, 'error');
      }
    } catch (error) {
      addToHistory(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [
    addToHistory, 
    cwd, 
    handleLs, 
    handleCd, 
    handleGitClone, 
    handleWget, 
    handlePython, 
    showHelp,
    handleCat
  ]);

  // Handle key down events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = input.trim();
      executeCommand(cmd);
      setInput('');
    }
  };

  if (isLoading) {
    return (
      <div 
        className="h-full flex items-center justify-center p-4 bg-surface text-foreground"
      >
        <div className="animate-pulse">Initializing terminal...</div>
      </div>
    );
  }

  return (
    <div 
      className="h-full flex flex-col font-mono text-sm rounded-lg overflow-hidden"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        border: `1px solid ${theme.colors.border}`
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Terminal content */}
      <div className="flex-grow p-2 overflow-y-auto" onClick={() => inputRef.current?.focus()}>
        {history.map((cmd, index) => (
          <div key={index} className="mb-1">
            {cmd.type === 'input' && (
              <div className="flex items-center">
                <span className="text-accent mr-2">{`[${cwd}] $`}</span>
                <span>{cmd.text}</span>
              </div>
            )}
            {cmd.type === 'output' && <pre className="whitespace-pre-wrap">{cmd.text}</pre>}
            {cmd.type === 'error' && <pre className="text-error whitespace-pre-wrap">{cmd.text}</pre>}
          </div>
        ))}
        <div ref={endOfTerminalRef} />
      </div>
      
      {/* Input area */}
      <div 
        className="flex items-center p-1.5"
        style={{
          borderTop: `1px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.surface
        }}
      >
        <span className="mr-2" style={{ color: theme.colors.accent }}>{`[${cwd}] $`}</span>
        <input
          ref={inputRef}
          type="text"
          className="flex-grow focus:outline-none terminal-input"
          style={{
            backgroundColor: 'transparent',
            color: theme.colors.text,
            caretColor: theme.colors.accent,
          }}
          data-placeholder-color={theme.colors.textSecondary}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder={isLoading ? 'Initializing terminal...' : ''}
        />
      </div>
    </div>
  );
};

export default Terminal;