import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  BadgeX, FolderOpen, Plus, Minus, Maximize2, Minimize2, X, Terminal as TerminalIcon, Loader2, Eraser, HelpCircle, Info, History
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TerminalSearch from './TerminalSearch';

interface TerminalUIProps {
  isOpen: boolean;
  isFullscreen: boolean;
  isMinimized: boolean;
  height: number;
  isDragging: boolean;
  currentDirectory: string;
  osInfo: string;
  history: Array<{ command: string; output: string; isLoading?: boolean }>;
  command: string;
  terminalRef: React.RefObject<HTMLDivElement>;
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleKillTerminal: () => void;
  setIsOpen: (val: boolean) => void;
  setIsMinimized: (val: boolean) => void;
  setIsFullscreen: (val: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
  setCommand: (val: string) => void;
  executeCommand: (cmd: string | string[], displayInTerminal?: number) => Promise<void>;
  mergedConfig: {
    fontSize: number;
    fontFamily: string;
    readOnlyMode: boolean;
    minHeight: number;
  };
  formatCommand: (command: string) => React.ReactNode;
  formatOutput: (output: string) => React.ReactNode;
  onFolderSelect?: () => Promise<void>;
  observerRef: React.RefObject<MutationObserver | null>;
  contentRef: React.RefObject<HTMLElement | null>;
  setHistory: React.Dispatch<React.SetStateAction<Array<{ command: string; output: string; isLoading?: boolean }>>>;
  contentKey: number;
  setContentKey: React.Dispatch<React.SetStateAction<number>>;
}

export function TerminalUI(props: TerminalUIProps): JSX.Element {
  const [isTerminalFocused, setIsTerminalFocused] = React.useState(false);
  const searchRef = useRef<{ removeAllHighlights: () => void } | null>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Modifions le gestionnaire de raccourci clavier pour débugger et corriger le comportement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.key !== 'f') return;

      const target = e.target as HTMLElement;
      const terminalContainer = document.querySelector('.terminal-container');
      
      console.log('Debug search shortcut:', {
        target: target.tagName,
        isInsideTerminal: target.closest('.terminal-container') !== null,
        terminalTabIndex: terminalContainer?.getAttribute('tabindex'),
        activeElement: document.activeElement?.tagName,
        isTerminalFocused
      });

      // On n'intercepte que si on est dans le terminal ET qu'il est focalisé
      const isTargetInTerminal = target.closest('.terminal-container') !== null;
      const hasTerminalFocus = terminalContainer?.getAttribute('tabindex') === '0';

      if (isTargetInTerminal && hasTerminalFocus && isTerminalFocused) {
        console.log('Activating terminal search');
        e.preventDefault();
        setIsSearchVisible(true);
      } else {
        console.log('Letting browser handle search');
        // Laisser le navigateur gérer le Ctrl+F
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isTerminalFocused]);

  // Améliorons également les gestionnaires de focus/blur
  const handleFocus = useCallback(() => {
    console.log('Terminal focused');
    setIsTerminalFocused(true);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    console.log('Terminal blur:', {
      relatedTarget: relatedTarget?.tagName,
      isContained: e.currentTarget.contains(relatedTarget)
    });
    
    if (!e.currentTarget.contains(relatedTarget)) {
      setIsTerminalFocused(false);
    }
  }, []);

  const tooltipStyle = "bg-[#252526] text-[#d4d4d4] border border-[#333] shadow-md";

  const getPromptSymbol = (os: string) => {
    switch (os.toLowerCase()) {
      case 'macos':
        return '%';
      case 'linux':
        return '$';
      case 'windows':
      default:
        return '>';
    }
  };

  const promptSymbol = getPromptSymbol(props.osInfo);

  if (!props.isOpen) {
    return (
      <Button
        className="fixed bottom-4 right-4 bg-[#1e1e1e] text-white floating-button"
        onClick={() => props.setIsOpen(true)}
      >
        <TerminalIcon className="w-4 h-4 mr-2 lucide" />
        Open Terminal
      </Button>
    );
  }

  const terminalClasses = `fixed bg-[#1e1e1e] text-[#d4d4d4] border-t border-[#333] shadow-lg transition-all duration-200 ${
    props.isFullscreen ? 'top-0 left-0 right-0 bottom-0 z-50' : 'bottom-0 left-0 right-0'
  }`;

  // Déplacer handleClearHistory avant son utilisation
  const handleClearHistory = useCallback(() => {
    searchRef.current?.removeAllHighlights?.();
    props.setHistory([]);
    props.setContentKey(prev => prev + 1);
  }, [props.setHistory, props.setContentKey]);

  return (
    <div
      className={`terminal-container ${terminalClasses}`}
      tabIndex={isTerminalFocused ? 0 : -1}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <div
        className="terminal-window"
        style={{
          height: props.isFullscreen ? '100vh' : props.isMinimized ? '40px' : props.height,
          fontSize: `${props.mergedConfig.fontSize}px`,
          fontFamily: props.mergedConfig.fontFamily,
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize"
          onMouseDown={props.handleMouseDown}
        />

        <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
          <div className="flex items-center">
            <TerminalIcon className="w-4 h-4 mr-2 lucide" />
            <span className="text-sm font-medium">Terminal</span>
          </div>
          {!props.mergedConfig.readOnlyMode && (
            <div className="flex space-x-2">
              <TooltipProvider delayDuration={50}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-transparent border-none hover:bg-red-900/70 text-[#d4d4d4] hover:text-[#fff] h-6 w-6 transition-colors"
                      onClick={props.handleKillTerminal}
                    >
                      <BadgeX className="h-4 w-4 lucide" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className={tooltipStyle}>
                    <p>Kill Terminal</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-transparent border-none hover:bg-[#333] text-[#d4d4d4] hover:text-[#fff] h-6 w-6 transition-colors"
                      onClick={props.onFolderSelect}
                    >
                      <FolderOpen className="h-4 w-4 lucide" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className={tooltipStyle}>
                    <p>Select Working Directory</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-transparent border-none hover:bg-[#333] text-[#d4d4d4] hover:text-[#fff] h-6 w-6 transition-colors"
                      onClick={() => props.setIsMinimized(!props.isMinimized)}
                    >
                      {props.isMinimized ? <Plus className="h-4 w-4 lucide" /> : <Minus className="h-4 w-4 lucide" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className={tooltipStyle}>
                    <p>{props.isMinimized ? 'Maximize' : 'Minimize'}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-transparent border-none hover:bg-[#333] text-[#d4d4d4] hover:text-[#fff] h-6 w-6 transition-colors"
                      onClick={() => props.setIsFullscreen(!props.isFullscreen)}
                    >
                      {props.isFullscreen ? <Minimize2 className="h-4 w-4 lucide" /> : <Maximize2 className="h-4 w-4 lucide" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className={tooltipStyle}>
                    <p>{props.isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen'}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-transparent border-none hover:bg-red-900/70 text-[#d4d4d4] hover:text-[#fff] h-6 w-6 transition-colors"
                      onClick={() => props.setIsOpen(false)}
                    >
                      <X className="h-4 w-4 lucide" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className={tooltipStyle}>
                    <p>Close terminal</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {!props.mergedConfig.readOnlyMode && (
          <div className="relative p-1.5 pl-2 pr-2 bg-[#252526] border-b border-[#333] text-xs text-gray-400 flex justify-between items-center">
            <div>Current directory: {props.currentDirectory || 'Loading...'}</div>
            <div>User OS: {props.osInfo}</div>
          </div>
        )}

        {!props.isMinimized && (
          <div
            className="terminal-content-wrapper"
            key={props.contentKey}
          >
            <TerminalSearch
              isVisible={isSearchVisible}
              onClose={() => setIsSearchVisible(false)}
              terminalRef={props.terminalRef}
              history={props.history}
            />
            <div 
              ref={el => {
                // Use mutable ref callback pattern
                const element = el as HTMLElement;
                if (props.terminalRef) {
                  (props.terminalRef as { current: HTMLElement | null }).current = element;
                }
                if (props.contentRef) {
                  (props.contentRef as { current: HTMLElement | null }).current = element;
                }
              }}
              className="terminal-scrollbar overflow-y-auto p-4 relative" 
              style={{ height: 'calc(100% - 80px)' }}
            >
              {props.history.map((entry, index) => (
                <div key={index} className="terminal-line mb-2">
                  <div className="terminal-prompt-line flex items-center">
                    <span className="terminal-prompt mr-2">{promptSymbol}</span>
                    <div className="terminal-command">
                      {props.formatCommand(entry.command)}
                    </div>
                  </div>
                  <div className="terminal-output-line ml-4 text-left">
                    {entry.isLoading ? (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Executing command...</span>
                      </div>
                    ) : (
                      props.formatOutput(entry.output)
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!props.mergedConfig.readOnlyMode && (
              <form onSubmit={props.handleSubmit} className="terminal-input-area flex items-center gap-2 p-2 border-t border-[#333]">
                <div className="flex-1 flex items-center">
                  <span className="terminal-prompt mr-2">{promptSymbol}</span>
                  <input
                    type="text"
                    value={props.command}
                    onChange={(e) => props.setCommand(e.target.value)}
                    className="terminal-command-input flex-1 bg-transparent border-none outline-none text-[#d4d4d4] font-mono"
                    placeholder="Type a command..."
                    autoFocus
                  />
                </div>
                <div className="flex space-x-2 flex-shrink-0">
                  <TooltipProvider delayDuration={50}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-[#1e1e1e] hover:bg-[#333] text-[#d4d4d4] hover:text-[#fff] transition-colors"
                          onClick={() => props.executeCommand('clear')}
                        >
                          <Eraser className="h-4 w-4 lucide" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className={tooltipStyle}>
                        <p>Clear Terminal</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-[#1e1e1e] hover:bg-[#333] text-[#d4d4d4] hover:text-[#fff] transition-colors"
                          onClick={handleClearHistory} // Maintenant handleClearHistory est défini
                        >
                          <History className="h-4 w-4 lucide" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className={tooltipStyle}>
                        <p>Clear History</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-[#1e1e1e] hover:bg-[#333] text-[#d4d4d4] hover:text-[#fff] transition-colors"
                          onClick={() => props.executeCommand('help')}
                        >
                          <HelpCircle className="h-4 w-4 lucide" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className={tooltipStyle}>
                        <p>Help</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-[#1e1e1e] hover:bg-[#333] text-[#d4d4d4] hover:text-[#fff] transition-colors"
                          onClick={() => props.executeCommand('about')}
                        >
                          <Info className="h-4 w-4 lucide" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className={tooltipStyle}>
                        <p>About</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
