// Extend the Window interface with File System Access API
declare global {
  interface Window {
    showDirectoryPicker?(options?: {
      id?: string;
      mode?: 'read' | 'readwrite';
      startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
    }): Promise<FileSystemDirectoryHandle>;
  }

  interface FileSystemHandle {
    readonly kind: 'file' | 'directory';
    readonly name: string;
    queryPermission?(options: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
    requestPermission?(options: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    kind: 'file';
    getFile(): Promise<File>;
    createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    kind: 'directory';
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
    removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
    resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<FileSystemHandle>;
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemHandle]>;
  }
}

export {};
