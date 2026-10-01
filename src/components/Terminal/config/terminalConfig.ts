// Terminal configuration type
export type TerminalConfig = {
  /**
   * État de la fenêtre au montage. `'fullscreen'` et `'minimized'` ouvrent le
   * terminal dans ce mode ; `'closed'` n'affiche que le bouton flottant.
   */
  initialState: 'open' | 'fullscreen' | 'minimized' | 'closed';
  defaultHeight: number;
  minHeight: number;
  minWidth: number;
  fontSize: number;
  fontFamily: string;
  /** Lignes conservées dans le scrollback xterm. */
  scrollbackLimit: number;
  showTerminal: boolean;
  readOnlyMode: boolean;
};

export const defaultConfig: TerminalConfig = {
  initialState: 'open',
  readOnlyMode: false,
  showTerminal: true,
  defaultHeight: 340,
  minHeight: 200,
  minWidth: 300,
  fontSize: 14,
  fontFamily: 'monospace',
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