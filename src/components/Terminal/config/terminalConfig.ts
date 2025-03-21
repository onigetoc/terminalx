// Terminal configuration type
export type TerminalConfig = {
  initialState: 'open' | 'closed' | 'hidden';
  startFullscreen: boolean;
  defaultHeight: number;
  minHeight: number;
  minWidth: number;
  showExecutedCommands: boolean;
  keepCommandHistory: boolean;
  maxHistoryLength: number;
  theme: 'dark' | 'light' | 'system';
  fontSize: number;
  fontFamily: string;
  showPath: boolean;
  maxOutputLength: number;
  scrollbackLimit: number;
  startMinimized: boolean;
  showFloatingButton: boolean;
  showTerminal: boolean;
  readOnlyMode: boolean;
};

export const defaultConfig: TerminalConfig = {
  initialState: 'open',
  readOnlyMode: false,
  startFullscreen: false,
  showFloatingButton: true,
  showTerminal: true,
  startMinimized: false,
  defaultHeight: 340,
  minHeight: 200,
  minWidth: 300,
  showExecutedCommands: true,
  keepCommandHistory: true,
  maxHistoryLength: 100,
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'monospace',
  showPath: true,
  maxOutputLength: 1000,
  scrollbackLimit: 1000,
};

// Configuration utility
export const terminalConfig = {
  private: {
    current: { ...defaultConfig }
  },
  
  get: () => terminalConfig.private.current,
  
  set: (newConfig: Partial<TerminalConfig>) => {
    terminalConfig.private.current = {
      ...terminalConfig.private.current,
      ...newConfig
    };
    // Émettre un événement si la visibilité change
    if ('showTerminal' in newConfig) {
      window.dispatchEvent(new CustomEvent('terminal-visibility-change'));
    }
    return terminalConfig.private.current;
  },
  
  reset: () => {
    terminalConfig.private.current = { ...defaultConfig };
    window.dispatchEvent(new CustomEvent('terminal-visibility-change'));
    return terminalConfig.private.current;
  },

  toggleVisibility: (show?: boolean) => {
    const newValue = show ?? !terminalConfig.private.current.showTerminal;
    terminalConfig.set({ showTerminal: newValue });
    return terminalConfig.private.current;
  }
};