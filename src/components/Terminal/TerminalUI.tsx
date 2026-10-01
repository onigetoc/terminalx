import React, { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  BadgeX,
  Eraser,
  FolderOpen,
  HelpCircle,
  Info,
  Maximize,
  Minus,
  Minimize,
  Plus,
  Settings,
  Terminal as TerminalIcon,
  X
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TerminalSearch, { type TerminalSearchRef } from './TerminalSearch';
import {
  InteractiveTerminal,
  type InteractiveTerminalHandle,
  type ShellKind
} from './InteractiveTerminal';
import { TerminalSessionList, type TerminalSession } from './TerminalSessionList';
import { NewTerminalMenu } from './NewTerminalMenu';
import { TerminalOverlayHostContext } from './TerminalOverlay';
import type { AiProvider } from './config/aiProviders';
import { BRAND_TITLE } from './config/shellProfiles';

interface TerminalUIProps {
  isFullscreen: boolean;
  isMinimized: boolean;
  height: number;
  isDragging: boolean;
  currentDirectory: string;
  osInfo: string;
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  /** Sessions vivantes : toutes restent montées, une seule est visible. */
  sessions: TerminalSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateSession: (shell: ShellKind, agent?: AiProvider) => void;
  onCloseSession: (id: string) => void;
  /** Un processus a démarré (titre) ou s'est arrêté (null = nom du shell). */
  onSessionTitle: (id: string, title: string | null) => void;
  /** Répertoire courant réel d'une session (spawn ou `cd`). */
  onSessionDirectory: (id: string, directory: string) => void;
  /** Relance la session active avec un shell neuf. */
  handleKillTerminal: () => void;
  /**
   * Relance une session précise avec un shell neuf et y lance un agent. Le
   * panneau des sessions s'en sert quand un programme tourne déjà.
   */
  onLaunchAgent: (id: string, agent: AiProvider) => void;
  /** Vide la `pendingCommand` d'une session une fois injectée dans le shell. */
  onCommandConsumed: (id: string) => void;
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
}

// Messages écrits directement dans le buffer xterm, sans passer par le shell.
const HELP_TEXT = [
  '\r\n\x1b[1;36m\x1b[1mTerminal X2 — aide\x1b[0m\r\n',
  '\x1b[90m───────────────────────────────────────\x1b[0m\r\n',
  '  \x1b[1mSessions Pleines Ecran\x1b[0m\r\n',
  '    claude, opencode, vim, htop, nano, top…\r\n\r\n',
  '  \x1b[1mSessions multiples\x1b[0m\r\n',
  '    Bouton + de la barre d\'outils : nouveau terminal\r\n',
  '    (shell par défaut de l\'OS ; la flèche du menu propose\r\n',
  '    les autres). Chaque session reste vivante en arrière-plan,\r\n',
  '    le panneau de droite permet d\'y revenir.\r\n',
  '    Le nom d\'une session suit la commande lancée : tapez\r\n',
  '    opencode et l\'onglet affichera opencode.\r\n\r\n',
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
  // Une ref xterm par session : la barre de recherche et les boutons du pied de
  // page doivent agir sur la session visible, pas sur la dernière montée.
  const terminalRefs = useRef(new Map<string, InteractiveTerminalHandle | null>());
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  // Compteur de correspondances par session (absent = jamais cherchée).
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  // Terme fourni à l'ouverture (sélection xterm), consommé par <TerminalSearch>.
  const [initialSearchText, setInitialSearchText] = useState('');
  // Élément hôte des surfaces flottantes du terminal (dialogues). Cf. TerminalOverlay.
  const [overlayHost, setOverlayHost] = useState<HTMLDivElement | null>(null);

  const { activeSessionId, sessions } = props;
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const activeTitle = activeSession?.title ?? BRAND_TITLE;
  const activeDirectory = activeSession?.cwd || props.currentDirectory;
  const activeMatchCount = matchCounts[activeSessionId] ?? 0;

  // Ref "courante" : un objet getter mémoïsé, pour ne pas donner une nouvelle
  // identité à <TerminalSearch> (qui l'a en dépendance d'effet) à chaque rendu.
  const terminalRef = useMemo(
    () =>
      ({
        get current() {
          return terminalRefs.current.get(activeSessionId) ?? null;
        }
      }) as React.RefObject<InteractiveTerminalHandle | null>,
    [activeSessionId]
  );

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

  const handleMatchCount = useCallback(
    (id: string) => (count: number) => {
      setMatchCounts((prev) => ({ ...prev, [id]: count }));
    },
    []
  );

  const handleTitleChange = useCallback(
    (id: string) => (title: string | null) => {
      props.onSessionTitle(id, title);
    },
    [props.onSessionTitle]
  );

  const handleDirectoryChange = useCallback(
    (id: string) => (directory: string) => {
      props.onSessionDirectory(id, directory);
    },
    [props.onSessionDirectory]
  );

  const handleCommandConsumed = useCallback(
    (id: string) => () => {
      props.onCommandConsumed(id);
    },
    [props.onCommandConsumed]
  );

  // Ouverture via Ctrl+F (raccourci intercepté dans <InteractiveTerminal>).
  // Une sélection active pré-remplit l'input et lance la recherche dessus,
  // comme dans VS Code.
  const openSearch = useCallback(() => {
    const selected = terminalRef.current?.getSelection() ?? '';
    if (selected) {
      setInitialSearchText(selected);
      terminalRef.current?.search(selected, 1);
    } else {
      setInitialSearchText('');
    }
    setIsSearchVisible(true);
  }, [terminalRef]);

  const handleCloseSearch = useCallback(() => {
    setIsSearchVisible(false);
    // Le focus repart dans le terminal, sinon les frappes suivantes
    // n'atteignent plus le shell.
    terminalRef.current?.focus();
  }, [terminalRef]);

  const tooltipStyle = "bg-[#252526] text-[#d4d4d4] border border-[#333] shadow-md";

  const handleClose = useCallback(() => {
    props.setIsOpen(false);
  }, [props.setIsOpen]);

  const terminalClasses = `fixed bg-[#1e1e1e] text-[#d4d4d4] border-t border-[#333] shadow-lg transition-all duration-200 ${
    props.isFullscreen ? 'top-0 left-0 right-0 bottom-0 z-50' : 'bottom-0 left-0 right-0'
  }`;

  return (
    <TerminalOverlayHostContext.Provider value={overlayHost}>
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

        {/* Barre du haut : nom de la session active à gauche, actions à droite
            (le « + » est juste avant Minimiser, comme dans l'exemple). */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
          <div className="flex items-center min-w-0">
            <TerminalIcon className="w-4 h-4 mr-2 lucide shrink-0" />
            <span className="text-sm font-medium truncate">{activeTitle}</span>
          </div>
          {!props.mergedConfig.readOnlyMode && (
            <div className="flex items-center space-x-2">
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

                {/* Nouveau terminal : à gauche de Minimiser. */}
                <NewTerminalMenu onCreate={props.onCreateSession} />

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
                      {props.isFullscreen ? <Minimize className="h-4 w-4 lucide" /> : <Maximize className="h-4 w-4 lucide" />}
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

        {/* Corps : les sessions à gauche, le panneau qui les liste à droite. */}
        <div className="flex flex-1 min-h-0">
          {/* Les sessions ne sont JAMAIS démontées : un démontage tuerait le
              PTY. On masque le conteneur en CSS quand la fenêtre est
              minimisée. */}
          <div
            className={`terminal-content-wrapper relative flex-1 min-w-0 ${
              props.isMinimized ? 'hidden' : ''
            }`}
          >
            {/* La recherche vit hors des sessions : elle cible toujours la
                session visible via `terminalRef`. */}
            <TerminalSearch
              ref={searchRef}
              isVisible={isSearchVisible}
              onClose={handleCloseSearch}
              terminalRef={terminalRef}
              matchCount={activeMatchCount}
              initialTerm={initialSearchText}
            />
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId && !props.isMinimized;
              return (
                <InteractiveTerminal
                  // `restartKey` dans la key : le bouton Kill remonte le
                  // composant, ce qui tue le shell et en ouvre un neuf.
                  key={`${session.id}:${session.restartKey}`}
                  ref={(handle) => {
                    terminalRefs.current.set(session.id, handle);
                  }}
                  shell={session.shell}
                  visible={isActive}
                  pendingCommand={session.pendingCommand}
                  onCommandConsumed={handleCommandConsumed(session.id)}
                  currentDirectory={session.cwd || props.currentDirectory}
                  onMatchCount={handleMatchCount(session.id)}
                  onSearchRequest={openSearch}
                  onTitleChange={handleTitleChange(session.id)}
                  onDirectoryChange={handleDirectoryChange(session.id)}
                  // Les sessions inactives restent montées mais masquées : le
                  // PTY, le buffer et le défilement survivent au changement.
                  className={isActive ? 'interactive-terminal' : 'interactive-terminal hidden'}
                />
              );
            })}
          </div>

          {!props.mergedConfig.readOnlyMode && !props.isMinimized && (
            <TerminalSessionList
              sessions={sessions}
              activeId={activeSessionId}
              onSelect={props.onSelectSession}
              onClose={props.onCloseSession}
              onLaunchAgent={props.onLaunchAgent}
            />
          )}
        </div>

        {!props.mergedConfig.readOnlyMode && (
          <div className="terminal-footer flex items-center justify-between gap-4 p-1.5 pl-2 pr-2 bg-[#252526] border-t border-[#333]">
            {/* OS de l'utilisateur puis répertoire courant de la session
                active, à gauche. */}
            <div className="min-w-0 truncate text-xs text-gray-400">
              User OS: {props.osInfo}
              <span className="mx-2 text-gray-600">|</span>
              Current directory: {activeDirectory || 'Loading...'}
            </div>
            <div className="flex shrink-0 items-center gap-2">
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

              {/* Settings : à droite du groupe d'icônes. Pas encore
                  fonctionnel — l'icône est là pour réserver la place. */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-transparent border-none hover:bg-[#333] text-[#d4d4d4] hover:text-[#fff] h-6 w-6 transition-colors"
                    aria-label="Terminal Settings"
                  >
                    <Settings className="h-4 w-4 lucide" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className={tooltipStyle}>
                  <p>Terminal Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            </div>
          </div>
        )}
        {/* Hôte des surfaces flottantes (dialogue d'installation d'un agent).
            Vide et non positionné : les enfants portailisés se positionnent en
            `absolute` sur `.terminal-window`, qui est `relative` + `overflow:hidden`.
            C'est ce qui garde le dialogue dans la fenêtre du terminal au lieu de
            recouvrir toute la page qui l'accueille. */}
        <div ref={setOverlayHost} />
        </div>
      </div>
    </TerminalOverlayHostContext.Provider>
  );
}

export default TerminalUI;
