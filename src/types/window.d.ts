
interface Window {
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  /** Enregistré par <Terminal /> au montage, retiré au démontage. */
  handleToggleTerminal?: () => void;
}

interface FileSystemDirectoryHandle {
  kind: 'directory';
  name: string;
}
