
interface Window {
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
}

interface FileSystemDirectoryHandle {
  kind: 'directory';
  name: string;
}