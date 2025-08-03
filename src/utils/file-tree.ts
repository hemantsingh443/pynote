import type { PyodideInterface } from 'pyodide';

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
}

/**
 * Recursively builds a file tree from Pyodide's virtual file system.
 * @param pyodide - The Pyodide instance.
 * @param path - The starting path.
 * @returns An array of FileNode objects.
 */
export const buildPyodideFileTree = (pyodide: PyodideInterface, path: string): FileNode[] => {
  const nodes: FileNode[] = [];
  try {
    const entries = pyodide.FS.readdir(path);
    for (const name of entries) {
      if (name === '.' || name === '..') continue;
      const fullPath = `${path}/${name}`.replace('//', '/');
      const stats = pyodide.FS.stat(fullPath);
      const type = pyodide.FS.isDir(stats.mode) ? 'directory' : 'file';
      
      const node: FileNode = {
        name,
        path: fullPath,
        type,
        children: type === 'directory' ? buildPyodideFileTree(pyodide, fullPath) : [],
      };
      nodes.push(node);
    }
  } catch (e: any) {
    // It's okay if the directory doesn't exist, just return an empty tree
    const fs = pyodide.FS as any;
    if (!(e instanceof fs.ErrnoError && e.errno === fs.ERRNO_CODES.ENOENT)) {
      console.error(`Failed to read directory ${path}:`, e);
    }
  }
  return nodes;
};

