type OsType = 'windows' | 'macos' | 'linux' | 'powershell';
type CommandMapping = Record<string, Record<OsType | 'description', string>>;

// CommandMap avec descriptions au même niveau que les mappings OS
export const commandMap: CommandMapping = {
  "type": {
    "description": "Display the contents of a file",
    "windows": "type",
    "powershell": "type",
    "macos": "cat",
    "linux": "cat"
  },
  "cat": {
    "description": "Display the contents of a file",
    "windows": "type",
    "powershell": "type",
    "macos": "cat",
    "linux": "cat"
  },
  "fc": {
    "description": "Compare two files",
    "windows": "fc",
    "powershell": "fc",
    "macos": "diff",
    "linux": "diff"
  },
  "diff": {
    "description": "Compare two files",
    "windows": "fc",
    "powershell": "fc",
    "macos": "diff",
    "linux": "diff"
  },
  "dir": {
    "description": "List directory contents",
    "windows": "dir",
    "powershell": "dir",
    "macos": "ls",
    "linux": "ls"
  },
  "ls": {
    "description": "List directory contents",
    "windows": "dir",
    "powershell": "ls",
    "macos": "ls",
    "linux": "ls"
  },
  "cd": {
    "description": "Change directory",
    "windows": "cd",
    "powershell": "cd",
    "macos": "cd",
    "linux": "cd"
  },
  "pwd": {
    "description": "Print working directory",
    "windows": "cd",
    "powershell": "cd",
    "macos": "pwd",
    "linux": "pwd"
  },
  "explorer": {
    "description": "Open file explorer",
    "windows": "explorer",
    "powershell": "explorer",
    "macos": "open",
    "linux": "open"
  },
  "open": {
    "description": "Open a file or directory",
    "windows": "explorer",
    "powershell": "explorer",
    "macos": "open",
    "linux": "open"
  },
  "start": {
    "description": "Open a file with default program",
    "windows": "start",
    "powershell": "start",
    "macos": "xdg-open",
    "linux": "xdg-open"
  },
  "xdg-open": {
    "description": "Open a file with default program",
    "windows": "start",
    "powershell": "start",
    "macos": "xdg-open",
    "linux": "xdg-open"
  },
  "del": {
    "description": "Delete a file",
    "windows": "del",
    "powershell": "del",
    "macos": "rm",
    "linux": "rm"
  },
  "rm": {
    "description": "Delete a file",
    "windows": "del",
    "powershell": "del",
    "macos": "rm",
    "linux": "rm"
  },
  "copy": {
    "description": "Copy a file",
    "windows": "copy",
    "powershell": "copy",
    "macos": "cp",
    "linux": "cp"
  },
  "cp": {
    "description": "Copy a file",
    "windows": "copy",
    "powershell": "copy",
    "macos": "cp",
    "linux": "cp"
  },
  "move": {
    "description": "Move a file",
    "windows": "move",
    "powershell": "move",
    "macos": "mv",
    "linux": "mv"
  },
  "mv": {
    "description": "Move a file",
    "windows": "move",
    "powershell": "move",
    "macos": "mv",
    "linux": "mv"
  },
  "cls": {
    "description": "Clear the terminal screen",
    "windows": "cls",
    "powershell": "cls",
    "macos": "clear",
    "linux": "clear"
  },
  "clear": {
    "description": "Clear the terminal screen",
    "windows": "cls",
    "powershell": "cls",
    "macos": "clear",
    "linux": "clear"
  },
  "findstr": {
    "description": "Find a string in a file",
    "windows": "findstr",
    "powershell": "findstr",
    "macos": "grep",
    "linux": "grep"
  },
  "grep": {
    "description": "Find a string in a file",
    "windows": "findstr",
    "powershell": "findstr",
    "macos": "grep",
    "linux": "grep"
  },
  "fsutil": {
    "description": "Display disk usage",
    "windows": "fsutil volume diskfree",
    "powershell": "Get-Volume",
    "macos": "df",
    "linux": "df"
  },
  "df": {
    "description": "Display disk usage",
    "windows": "fsutil volume diskfree",
    "powershell": "Get-Volume",
    "macos": "df",
    "linux": "df"
  },
  "where": {
    "description": "Locate a command",
    "windows": "where",
    "powershell": "Get-Command",
    "macos": "which",
    "linux": "which"
  },
  "which": {
    "description": "Locate a command",
    "windows": "where",
    "powershell": "Get-Command",
    "macos": "which",
    "linux": "which"
  },
  "zip": {
    "description": "Create ZIP archives",
    "windows": "tar -cf",
    "powershell": "Compress-Archive",
    "macos": "zip",
    "linux": "zip"
  }
};

// Ajout des entrées pour les commandes Windows/macOS/Linux si elles diffèrent de la clé principale
Object.entries(commandMap).forEach(([key, mapping]) => {
  Object.entries(mapping).forEach(([os, cmd]) => {
    if (os !== 'description' && cmd !== key && !commandMap[cmd]) {
      // Crée une nouvelle entrée dans le commandMap pour cette commande spécifique à l'OS
      commandMap[cmd] = {
        'description': mapping.description,
        'windows': mapping.windows,
        'macos': mapping.macos,
        'linux': mapping.linux
      };
    }
  });
});

export function getOsType(): Exclude<OsType, 'powershell'> {
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('mac')) return 'macos';
  if (userAgent.includes('linux')) return 'linux';
  return 'windows'; // Fallback to Windows
}

export function translateCommand(command: string): string {
  const os = getOsType();
  const words = command.split(' ');
  const baseCommand = words[0].toLowerCase();

  // Find the command entry in our map
  const commandEntry = Object.entries(commandMap).find(([key, mapping]) => {
    return key === baseCommand || 
           (mapping.windows === baseCommand && os === 'windows') ||
           (mapping.macos === baseCommand && os === 'macos') ||
           (mapping.linux === baseCommand && os === 'linux');
  });

  if (commandEntry) {
    const [, mapping] = commandEntry;
    const translatedBase = mapping[os];
    words[0] = translatedBase;
    const translatedCommand = words.join(' ');
    console.log('Commande converted:', translatedCommand);
    return translatedCommand;
  }

  return command;
}

export function shouldTranslateCommand(command: string): boolean {
  const baseCommand = command.split(' ')[0].toLowerCase();
  return Object.entries(commandMap).some(([key, mapping]) => {
    return key === baseCommand || 
           mapping.windows === baseCommand || 
           mapping.macos === baseCommand || 
           mapping.linux === baseCommand;
  });
}

// Fonction pour obtenir la description d'une commande
export function getCommandDescription(command: string): string | undefined {
  const baseCommand = command.split(' ')[0].toLowerCase();
  
  const commandEntry = Object.entries(commandMap).find(([key, mapping]) => {
    return key === baseCommand || 
           mapping.windows === baseCommand || 
           mapping.macos === baseCommand || 
           mapping.linux === baseCommand;
  });

  if (commandEntry) {
    return commandEntry[1].description;
  }
  
  return undefined;
}