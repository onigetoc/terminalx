import { CommandResult } from './terminalApi';
import { translateCommand, getOsType } from '../utils/commandOS';
import path from 'path';

// Fonction utilitaire pour normaliser les chemins
function normalizePath(inputPath: string): string {
  // Convertir les backslashes en forward slashes pour la cohérence
  const normalized = inputPath.replace(/\\/g, '/');
  return path.normalize(normalized);
}

const CUSTOM_COMMANDS: Record<string, (args?: string) => CommandResult> = {
  open: (urlOrPath?: string) => {
    if (!urlOrPath) {
      return { output: 'Usage: open <url_or_path>' };
    }

    // Check if input is a URL 
    if (/^https?:\/\//.test(urlOrPath)) {
      window.open(urlOrPath, '_blank');
      return { output: `Opening URL: ${urlOrPath}` };
    }

    // Pour les chemins de fichiers, normaliser le chemin
    const normalizedPath = normalizePath(urlOrPath);
    const os = getOsType();
    const command = os === 'windows' ? `start ${normalizedPath}` : `xdg-open ${normalizedPath}`;
    
    return { 
      output: '',
      executeOnServer: true,
      command
    };
  },

  help: () => ({
    output: `Available commands:
  help    - Show this help message
  about   - About this terminal
  cls | clear   - Clear terminal screen
  getuserlang - Show current user language
  open <url_or_path> - Open URL or path
  
  executing command:
  executeCommand('help')}
  executeCommand(['help', 'npm ls', 'about'])}
  
  Documentation: https://github.com/onigetoc/terminalx`
  }),

  about: () => ({
    output: `Terminal Emulator v1.0
Built with React + Vite
Github Repository: https://github.com/onigetoc/terminalx`
  }),

  getuserlang: () => {
    const userLanguage = typeof window !== 'undefined' 
      ? (window.navigator.language || window.navigator.languages[0]) 
      : 'en-US';
    return {
      output: `Current user language: ${userLanguage}`
    };
  },

  clear: () => ({
    output: ''
  }),

  cls: () => ({
    output: ''
  })
};

export function isCustomCommand(command: string): boolean {
  const cmd = command.trim().split(' ')[0].toLowerCase();
  // On ignore les commandes start et xdg-open pour les laisser être traduites par commandOS.ts
  if (cmd === 'start' || cmd === 'xdg-open') {
    return false;
  }
  return cmd in CUSTOM_COMMANDS;
}

export async function executeCustomCommand(command: string): Promise<CommandResult> {
  const parts = command.trim().split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  if (cmd in CUSTOM_COMMANDS) {
    return CUSTOM_COMMANDS[cmd](args);
  }

  throw new Error('Not a custom command');
}
