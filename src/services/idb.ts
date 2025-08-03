import { set, get } from 'idb-keyval';

const DIRECTORY_HANDLE_KEY = 'directory-handle';

export async function setDirectoryHandle(
  handle: FileSystemDirectoryHandle
): Promise<void> {
  await set(DIRECTORY_HANDLE_KEY, handle);
}

export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | undefined> {
  return await get(DIRECTORY_HANDLE_KEY);
}
