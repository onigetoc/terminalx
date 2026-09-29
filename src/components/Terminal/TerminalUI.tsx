import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  BadgeX, FolderOpen, Plus, Minus, Maximize2, Minimize2, X, Terminal as TerminalIcon, Eraser, HelpCircle, Info
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TerminalSearch, { type TerminalSearchRef } from './TerminalSearch';
import {
  InteractiveTerminal,
  type InteractiveTerminalHandle
} from './InteractiveTerminal';

interface TerminalUIProps {
  isFullscreen: boolean;
  isMinimized: boolean;
  height: number;
  isDragging: boolean;
  currentDirectory: string;
  osInfo: string;
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleKillTerminal: () => void;
  setIsOpen: (val: boolean) => void;
  setIsMinimized: (val: boolean) => void;
  setIsFullscreen: (val: boolean) => void;
  mergedConfig: {
    fontSize: number;
    fontFamily: string;
    readOnlyMode: boolean;
    minHeight: number;
  };
  onFolderSelect?: () => Promise<void>;
  /** Incrémenté par le bouton Kill pour redémarrer la session PTY. */
  sessionKey: number;
}

// Messages écrits directement dans le buffer xterm, sans passer par le shell.
const HELP_TEXT = [
  '\r\n\x1b[1;36m\x1b[1mTerminal X2 — aide\x1b[0m\r\n',
  '\x1b[90m───────────────────────────────────────\x1b[0m\r\n',
  '  \x1b[1mSessions Pleines Ecran\x1b[0m\r\n',
  '    claude, opencode, vim, htop, nano, top…\r\n\r\n',
  '  \x1b[1mRaccourcis\x1b[0m\r\n',
  '    Ctrl+C / Cmd+C      copie la sélection (sinon envoie SIGINT)\r\n',
  '    Ctrl+Shift+C        copie la sélection\r\n',
  '    Ctrl+V / Cmd+V      colle le presse-papiers\r\n',
  '    Ctrl+F              recherche dans le buffer\r\n',
  '    Ctrl+L              efface l\'écran\r\n\r\n',
  '  \x1b[1mFichiers\x1b[0m\r\n',
  '    Glisse-dépose un fichier ou colle une image :\r\n',
  '    le serveur le stocke et insère son chemin dans le shell.\r\n',
  '    Les images inline (Sixel, IIP) sont rendues directement.\r\n\r\n',
  '  \x1b[1mBarre d\'outils\x1b[0m\r\n',
  '    Kill      relance une session propre\r\n',
  '    Dossier   choisit le répertoire de travail\r\n',
  '\x1b[90m───────────────────────────────────────\x1b[0m\r\n'
];

const ABOUT_TEXT = [
  '\r\n\x1b[1;36m\x1b[1mTerminal X2\x1b[0m\r\n',
  '\x1b[90m───────────────────────────────────────\x1b[0m\r\n',
  '  \x1b[1mxterm.js\x1b[0m + \x1b[1mnode-pty\x1b[0m\r\n',
  '  Un vrai shell dans le navigateur : les frappes\r\n',
  '  clavier vont au pseudo-terminal, la sortie ANSI\r\n',
  '  revient en streaming sur WebSocket (/ws/pty).\r\n\r\n',
  '  \x1b[1mServeur\x1b[0m\r\n',
  '  Fastify · ports 3003-3010 · CORS ouvert\r\n',
  '  Outil de développement local, ne pas exposer.\r\n',
  '\x1b[90m───────────────────────────────────────\x1b[0m\r\n'
];

export function TerminalUI(props: TerminalUIProps): JSX.Element {
  const searchRef = useRef<TerminalSearchRef | null>(null);
  const terminalRef = useRef<InteractiveTerminalHandle | null>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [matchCount, setMatchCount] = useState(0);

  // Ctrl+F est intercepté par InteractiveTerminal (il faut le court-circuit
  // avant que xterm n'envoie la frappe au shell). Ici on ne gère qu'Escape
  // pour fermer la barre, y compris quand le focus est déjà dedans.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchVisible) {
        e.preventDefault();
        e.stopPropagation();
        setIsSearchVisible(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchVisible]);

  // Ouverture via Ctrl+F (raccourci intercepté dans <InteractiveTerminal>).
  const openSearch = useCallback(() => {
    setIsSearchVisible(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchVisible(false);
    setMatchCount(0);
    // Le focus repart dans le terminal, sinon les frappes suivantes
    // n'atteignent plus le shell.
    terminalRef.current?.focus();
  }, []);

  const tooltipStyle = "bg-[#252526] text-[#d4d4d4] border border-[#333] shadow-md";

  const handleClose = useCallback(() => {
    props.setIsOpen(false);
  }, [props.setIsOpen]);

  const terminalClasses = `fixed bg-[#1e1e1e] text-[#d4d4d4] border-t border-[#333] shadow-lg transition-all duration-200 ${
    props.isFullscreen ? 'top-0 left-0 right-0 bottom-0 z-50' : 'bottom-0 left-0 right-0'
  }`;

  return (
    <div className={`terminal-container ${terminalClasses}`}>
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
                    <p>Kill session (restart)</p>
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
                      className="bg-transparent border-none hover:bg-[#333] text-[#d4d4d4] hover:text-[#fff] h-6 w-6 transition-colors"
                      onClick={handleClose}
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
          <div className="terminal-content-wrapper relative">
            <TerminalSearch
              ref={searchRef}
              isVisible={isSearchVisible}
              onClose={handleCloseSearch}
              terminalRef={terminalRef}
              matchCount={matchCount}
            />
            <InteractiveTerminal
              key={props.sessionKey}
              ref={terminalRef}
              currentDirectory={props.currentDirectory}
              onMatchCount={setMatchCount}
              onSearchRequest={openSearch}
              className="interactive-terminal"
            />

            {!props.mergedConfig.readOnlyMode && (
              <div className="terminal-footer flex items-center justify-end gap-2 p-1.5 pl-2 pr-2 bg-[#252526] border-t border-[#333]">
                <TooltipProvider delayDuration={50}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-transparent border-none hover:bg-[#333] text-[#d4d4d4] hover:text-[#fff] h-6 w-6 transition-colors"
                        onClick={() => terminalRef.current?.clear()}
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
                        variant="ghost"
                        size="icon"
                        className="bg-transparent border-none hover:bg-[#333] text-[#d4d4d4] hover:text-[#fff] h-6 w-6 transition-colors"
                        onClick={() => terminalRef.current?.write(HELP_TEXT.join(''))}
                      >
                        <HelpCircle className="h-4 w-4 lucide" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className={tooltipStyle}>
                      <p>Help</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-transparent border-none hover:bg-[#333] text-[#d4d4d4] hover:text-[#fff] h-6 w-6 transition-colors"
                        onClick={() => terminalRef.current?.write(ABOUT_TEXT.join(''))}
                      >
                        <Info className="h-4 w-4 lucide" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className={tooltipStyle}>
                      <p>About</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
