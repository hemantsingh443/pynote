import { create } from 'zustand';
import { setDirectoryHandle } from '../services/idb';
import { getPyodide } from '../kernel/PyodideLoader';
import { buildPyodideFileTree, type FileNode } from '../utils/file-tree';

interface FileSystemState {
  fileTree: FileNode[];
  isMounted: boolean;
  directoryHandle: FileSystemDirectoryHandle | null;
  initFileSystem: () => Promise<void>;
  refreshFileTree: () => Promise<void>;
  openDirectory: () => Promise<void>;
  downloadFile: (path: string) => Promise<void>;
  moveFileToMnt: (path: string) => Promise<void>;
}

export const useFileSystemStore = create<FileSystemState>((set, get) => ({
  fileTree: [],
  isMounted: false,
  directoryHandle: null,

  initFileSystem: async () => {
    const pyodide = await getPyodide();
    if (!pyodide) return;
    try {
      // Ensure both /mnt for workspace and /content for artifacts exist
      pyodide.FS.mkdirTree('/mnt');
      pyodide.FS.mkdirTree('/content');
    } catch (e) {
      console.error('Failed to create initial directories:', e);
    }
    get().refreshFileTree();
  },

  refreshFileTree: async () => {
    const pyodide = await getPyodide();
    if (!pyodide) return;

    const { directoryHandle } = get();

    if (!directoryHandle) {
      try {
        // This ensures the virtual directory structure is in place when no local folder is mounted.
        pyodide.FS.mkdirTree('/mnt/content');
      } catch (e) {
        // Ignore if it already exists
      }
    }

    const fileTree = buildPyodideFileTree(pyodide, '/mnt');
    set({ fileTree, isMounted: !!directoryHandle });
  },

  openDirectory: async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('Your browser does not support the File System Access API.');
      return;
    }

    try {
      const handle = await (window as any).showDirectoryPicker();
      set({ directoryHandle: handle });
      const pyodide = await getPyodide();
      if (!pyodide) return;

      const pyodideFs = pyodide.FS as any;

      try {
        pyodideFs.unmount('/mnt');
      } catch (e) {
        // This is expected if it's not mounted, so we can ignore it.
      }

      // To preserve the content directory, we move it to a temporary location before unmounting.
      await pyodide.runPythonAsync(`
        import os
        import shutil
        if os.path.exists('/mnt/content'):
          # Ensure the backup destination is clean
          if os.path.exists('/tmp/content_backup'):
            shutil.rmtree('/tmp/content_backup')
          shutil.move('/mnt/content', '/tmp/content_backup')
      `);

      // Pyodide requires the mount point to be an empty directory.
      // We'll use a Python script to recursively delete the /mnt directory if it exists.
      await pyodide.runPythonAsync(`
        import shutil
        import os
        if os.path.exists('/mnt'):
          shutil.rmtree('/mnt')
      `);

      // Re-create the mount point and mount the new directory.
      pyodideFs.mkdirTree('/mnt');
      await (pyodide as any).mountNativeFS('/mnt', handle);

      // Restore the content directory from the backup.
      await pyodide.runPythonAsync(`
        import os
        import shutil
        if os.path.exists('/tmp/content_backup'):
          shutil.move('/tmp/content_backup', '/mnt/content')
        else:
          os.makedirs('/mnt/content')
      `);
      
      set({ directoryHandle: handle });
      await setDirectoryHandle(handle); // Persist handle to IndexedDB
      await get().refreshFileTree(); // Refresh the file tree view

    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to open directory:', err);
      }
    }
  },

  downloadFile: async (path: string) => {
    const pyodide = await getPyodide();
    if (!pyodide) return;
    try {
      const data = (pyodide.FS as any).readFile(path, { encoding: 'binary' });
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Failed to download file: ${path}`, error);
    }
  },

  moveFileToMnt: async (path: string) => {
    const pyodide = await getPyodide();
    if (!pyodide) return;
    const fileName = path.split('/').pop();
    if (!fileName) return;

    try {
      const data = (pyodide.FS as any).readFile(path, { encoding: 'binary' });
      // Always write to /mnt. If a directory is mounted, Pyodide handles writing to the local file.
      (pyodide.FS as any).writeFile(`/mnt/${fileName}`, data, { encoding: 'binary' });
      
      // Delete the original file from /content
      pyodide.FS.unlink(path);
      get().refreshFileTree();
    } catch (error) {
      console.error(`Failed to move file: ${path}`, error);
    }
  },
}));
