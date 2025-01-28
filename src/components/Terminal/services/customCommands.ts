import { CommandResult } from './terminalApi';

const CUSTOM_COMMANDS: Record<string, () => CommandResult> = {
  help: () => ({
    output: `Available commands:
  help    - Show this help message
  about   - About this terminal
  cls | clear   - Clear terminal screen
  getuserlang - Show current user language
  
  executing command:
  executeCommand('help')}
  executeCommand(['help', 'npm ls', 'about'])}
  
  Documentation: https://github.com/onigetoc/fake-terminal-experience`
  }),

  about: () => ({
    output: `Terminal Emulator v1.0
Built with React + Vite
Github Repository: https://github.com/onigetoc/fake-terminal-experience`
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
  return cmd in CUSTOM_COMMANDS;
}

export async function executeCustomCommand(command: string): Promise<CommandResult> {
  const cmd = command.trim().split(' ')[0].toLowerCase();
  if (cmd in CUSTOM_COMMANDS) {
    return CUSTOM_COMMANDS[cmd]();
  }
  throw new Error('Not a custom command');
}
