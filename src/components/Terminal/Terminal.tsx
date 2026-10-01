import React, { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Terminal as TerminalIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import '@/components/Terminal/styles/terminal.css';
import { TerminalUI } from './TerminalUI';
import { TerminalConfig, defaultConfig, terminalConfig } from '@/components/Terminal/config/terminalConfig';
import type { ShellKind } from './InteractiveTerminal';
import { findProviderByCommand, type AiProvider } from './config/aiProviders';
import { defaultSessionTitle, type TerminalSession } from './TerminalSessionList';
import {
  BRAND_TITLE,
  detectOsKind,
  defaultShellFor,
  type OsKind
} from './config/shellProfiles';
import {
  initializeDirectory,
  setWorkingDirectory
} from './utils/directoryUtils';

interface TerminalProps {
  config?: Partial<TerminalConfig>;
  /**
   * Hauteur occupée par le terminal en bas du viewport (0 si fermé ou
   * plein écran, 40 si minimisé). L'hôte s'en sert pour réserver l'espace et
   * éviter que le terminal recouvre le bas de sa page. Le terminal ne touche
   * jamais au layout de l'hôte : il ne fait que rapporter sa hauteur.
   */
  onHeightChange?: (height: number) => void;
}

/** Compteur d'identifiants pour les sessions, sans dépendre d'une lib d'uuid. */
let sessionCounter = 0;
const nextSessionId = () => `term-${++sessionCounter}`;

// Exporter la fonction de toggle pour une utilisation depuis l'extérieur
export const handleToggleTerminal = () => {
  terminalConfig.toggleVisibility();
};

const Terminal: React.FC<TerminalProps> = ({ config = {}, onHeightChange }) => {
  const mergedConfig = { ...defaultConfig, ...config };
  const [isOpen, setIsOpen] = useState(mergedConfig.initialState !== 'closed');
  const [isVisible, setIsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(mergedConfig.initialState === 'fullscreen');
  const [isMinimized, setIsMinimized] = useState(mergedConfig.initialState === 'minimized');
  const [height, setHeight] = useState(mergedConfig.defaultHeight);
  const [isDragging, setIsDragging] = useState(false);
  const [currentDirectory, setCurrentDirectory] = useState('');
  const [osInfo, setOsInfo] = useState('');
  // Détecté une seule fois : sert à choisir le shell par défaut et les profils.
  const [osKind] = useState<OsKind>(() => detectOsKind());

  // Sessions multiples : chacune reste montée en permanence (donc son PTY
  // reste vivant), on ne fait que masquer celle qui n'est pas active. La
  // première session est créée à la demande pour ne garder aucun shell orphelin
  // tant que le panneau n'a pas été ouvert au moins une fois.
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('');

  useEffect(() => {
    const detectOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.includes('win')) return 'Windows';
      if (userAgent.includes('mac')) return 'macOS';
      if (userAgent.includes('linux')) return 'Linux';
      return 'Unknown OS';
    };

    setOsInfo(detectOS());

    initializeDirectory()
      .then(setCurrentDirectory)
      .catch((error) => {
        console.error('Failed to initialize directory:', error);
      });
  }, []);

  // Ouvre la première session par défaut, une seule fois. Le shell est celui
  // de l'OS (PowerShell sous Windows, zsh sous macOS, bash sous Linux) ; le nom
  // affiché reste la marque tant que l'utilisateur n'a pas lancé de commande.
  useEffect(() => {
    if (sessions.length > 0) return;
    const id = nextSessionId();
    setSessions([{ id, shell: defaultShellFor(osKind), title: BRAND_TITLE, restartKey: 0 }]);
    setActiveSessionId(id);
  }, [sessions.length, osKind]);

  // Modifier l'effet pour initialiser l'état isVisible avec la valeur de terminalConfig
  useEffect(() => {
    const handleVisibilityChange = () => {
      const current = terminalConfig.get();
      setIsVisible(current.showTerminal);
    };

    // Le prop `config` est prioritaire au montage ; ensuite seul le singleton
    // fait foi (window.handleToggleTerminal, terminalConfig.set…).
    setIsVisible(mergedConfig.showTerminal);

    // S'abonner aux changements de configuration
    window.addEventListener('terminal-visibility-change', handleVisibilityChange);

    return () => {
      window.removeEventListener('terminal-visibility-change', handleVisibilityChange);
    };
  }, []);

  // Make handleToggleTerminal available globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.handleToggleTerminal = handleToggleTerminal;
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.handleToggleTerminal = undefined;
      }
    };
  }, []);

  // Rapporte la hauteur occupée au bas du viewport pour que l'hôte réserve
  // l'espace. Fermé ou plein écran : 0 ; minimisé : la seule barre du haut.
  useEffect(() => {
    if (!onHeightChange) return;
    const reported = !isOpen ? 0 : isFullscreen ? 0 : isMinimized ? 40 : height;
    onHeightChange(reported);
  }, [onHeightChange, isOpen, isFullscreen, isMinimized, height]);

  // Plein écran : le terminal recouvre tout le viewport, mais la page hôte reste
  // scrollable et sa barre de défilement se dessine par-dessus le terminal. On
  // verrouille donc le scroll de `<html>` tant qu'on est en plein écran (comportement
  // modal standard), puis on restaure la valeur précédente.
  useEffect(() => {
    if (!isFullscreen) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previous;
    };
  }, [isFullscreen]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFullscreen) {
      setIsDragging(true);
      const startY = e.clientY;
      const startHeight = height;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaY = startY - e.clientY;
        const newHeight = Math.max(mergedConfig.minHeight, startHeight + deltaY);
        setHeight(newHeight);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  }, [height, isFullscreen, mergedConfig.minHeight]);

  // Relance la session active : le shell courant est tué, un neuf démarre dans
  // le même onglet (remontage du composant via `restartKey`).
  const handleKillTerminal = useCallback(() => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSessionId
          ? { ...session, restartKey: session.restartKey + 1 }
          : session
      )
    );
  }, [activeSessionId]);

  // Relance toutes les sessions : utilisé quand le répertoire de travail change,
  // car le cwd d'un shell est figé à son lancement. On oublie aussi le cwd suivi
  // de chaque session pour que le nouveau shell reparte du dossier choisi.
  const restartAllSessions = useCallback(() => {
    setSessions((prev) =>
      prev.map((session) => ({ ...session, restartKey: session.restartKey + 1, cwd: undefined }))
    );
  }, []);

  const handleCreateSession = useCallback((shell: ShellKind, agent?: AiProvider) => {
    const id = nextSessionId();
    // Le nom reprend d'abord le profil choisi ; il sera remplacé par la
    // commande dès que l'utilisateur en lancera une.
    // `agentId` voyage avec la session : c'est lui qui donne sa marque à la ligne
    // du panneau, quelle que soit la façon dont l'agent a été choisi.
    setSessions((prev) => [
      ...prev,
      {
        id,
        shell,
        title: defaultSessionTitle(shell),
        restartKey: 0,
        agentId: agent?.id,
        pendingCommand: agent?.command
      }
    ]);
    setActiveSessionId(id);
  }, []);

  // Un processus est en cours → la session prend son nom. Plus rien ne tourne
  // (`null`) → on revient au nom du profil, comme VS Code.
  // Ferme la session dont le `pendingCommand` vient d'être injecté : sans ça,
  // un `ready` tardif (reconnexion) relancerait l'agent.
  const handleSessionTitle = useCallback((id: string, title: string | null) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== id) return session;
        // Un agent tapé à la main (`claude`, `gemini`…) prend sa marque dans le
        // panneau exactement comme s'il avait été choisi au menu. Le titre d'un
        // process est le premier mot de la ligne lancée.
        const detected = title ? findProviderByCommand(title)?.id : undefined;
        return {
          ...session,
          title: title ?? defaultSessionTitle(session.shell),
          // Plus de process en cours (`title === null`) et rien en attente
          // d'injection : l'agent a quitté (`/quit`, Ctrl+C), la marque du
          // panneau redevient neutre. On la garde tant qu'une commande
          // d'agent n'a pas encore été injectée (pendingCommand), sinon le
          // redémarrage de session effacerait l'icône avant même le lancement.
          agentId: title
            ? detected ?? session.agentId
            : session.pendingCommand
              ? session.agentId
              : undefined
        };
      })
    );
  }, []);

  // L'agent choisi a été injecté : on n'a plus rien à faire de la commande.
  const handleCommandConsumed = useCallback((id: string) => {
    setSessions((prev) =>
      prev.map((session) => (session.id === id ? { ...session, pendingCommand: undefined } : session))
    );
  }, []);

  // Choix d'un agent depuis le panneau des sessions. La session existe déjà et
  // peut tourner un programme : on la relance (restartKey ++) pour obtenir un
  // shell propre, et on programme la commande, qui partira au prochain `ready`.
  // Même mécanisme que le bouton Kill, mais ciblé sur la session visée.
  const handleLaunchAgent = useCallback((id: string, agent: AiProvider) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === id
          ? {
              ...session,
              restartKey: session.restartKey + 1,
              agentId: agent.id,
              pendingCommand: agent.command
            }
          : session
      )
    );
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  // Répertoire courant réel d'une session (spawn ou `cd`), pour le pied de page.
  const handleSessionDirectory = useCallback((id: string, directory: string) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === id && session.cwd !== directory ? { ...session, cwd: directory } : session
      )
    );
  }, []);

  // Fermer une session démonte son <InteractiveTerminal>, ce qui envoie `kill`
  // au PTY : le shell est réellement nettoyé côté serveur. La dernière session
  // ne peut pas être fermée (le panneau perdrait son contenu).
  const handleCloseSession = useCallback((id: string) => {
    setSessions((prev) => {
      if (prev.length <= 1) return prev;
      const index = prev.findIndex((session) => session.id === id);
      const remaining = prev.filter((session) => session.id !== id);
      setActiveSessionId((current) => {
        if (current !== id) return current;
        // On active la voisine la plus proche, comme VS Code.
        return remaining[Math.min(index, remaining.length - 1)]?.id ?? current;
      });
      return remaining;
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const onFolderSelect = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      console.warn('Directory selection is not supported in this browser.');
      return;
    }

    try {
      const directoryHandle = await window.showDirectoryPicker();
      // Le dossier choisi devient le cwd des prochaines sessions PTY. Le
      // navigateur ne donne que le nom du dossier (pas son chemin absolu), donc
      // on demande au serveur de s'y positionner.
      const directory = await setWorkingDirectory(directoryHandle.name);
      setCurrentDirectory(directory);
      // Les shells déjà lancés gardent leur propre cwd : on les redémarre pour
      // qu'ils démarrent dans le nouveau dossier.
      restartAllSessions();
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error selecting directory:', error);
      }
    }
  }, [restartAllSessions]);

  return (
    <div className={`${!isVisible ? 'hidden' : ''}`}>
      {!isOpen ? (
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                className="fixed bottom-4 right-4 px-2.5 bg-[#1e1e1e] text-white floating-button rounded-[8px]"
                onClick={() => {
                  setIsOpen(true);
                }}
              >
                <TerminalIcon className="w-4 h-4 lucide" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open Terminal</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <TerminalUI
          isFullscreen={isFullscreen}
          isMinimized={isMinimized}
          height={height}
          isDragging={isDragging}
          currentDirectory={currentDirectory}
          osInfo={osInfo}
          handleMouseDown={handleMouseDown}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          onCloseSession={handleCloseSession}
          onSessionTitle={handleSessionTitle}
          onSessionDirectory={handleSessionDirectory}
          handleKillTerminal={handleKillTerminal}
          onLaunchAgent={handleLaunchAgent}
          onCommandConsumed={handleCommandConsumed}
          setIsOpen={handleClose}
          setIsMinimized={setIsMinimized}
          setIsFullscreen={setIsFullscreen}
          mergedConfig={mergedConfig}
          onFolderSelect={onFolderSelect}
        />
      )}
    </div>
  );
};

export default Terminal;
