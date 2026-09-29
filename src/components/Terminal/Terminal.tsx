import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import {
  initializeDirectory,
  setWorkingDirectory,
  updateStoredDirectory
} from './utils/directoryUtils';

interface TerminalProps {
  config?: Partial<TerminalConfig>;
}

// Exporter la fonction de toggle pour une utilisation depuis l'extérieur
export const handleToggleTerminal = () => {
  terminalConfig.toggleVisibility();
};

const Terminal: React.FC<TerminalProps> = ({ config = {} }) => {
  const mergedConfig = { ...defaultConfig, ...config };
  const [isOpen, setIsOpen] = useState(mergedConfig.initialState === 'open');
  const [isVisible, setIsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(mergedConfig.startFullscreen);
  const [isMinimized, setIsMinimized] = useState(mergedConfig.startMinimized);
  const [height, setHeight] = useState(mergedConfig.defaultHeight);
  const [isDragging, setIsDragging] = useState(false);
  const [currentDirectory, setCurrentDirectory] = useState('');
  const [osInfo, setOsInfo] = useState('');
  // Incrémenté par le bouton Kill : le remontage de <InteractiveTerminal>
  // tue la WebSocket (kill du shell) et en ouvre une nouvelle, donc une
  // session PTY neuve.
  const [sessionKey, setSessionKey] = useState(0);

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

  // Modifier l'effet pour initialiser l'état isVisible avec la valeur de terminalConfig
  useEffect(() => {
    const handleVisibilityChange = () => {
      const current = terminalConfig.get();
      setIsVisible(current.showTerminal);
    };

    // Initialiser l'état avec la valeur actuelle
    setIsVisible(terminalConfig.get().showTerminal);

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

  // Relance une session PTY propre (le shell courant est tué).
  const handleKillTerminal = useCallback(() => {
    setSessionKey(prev => prev + 1);
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
      updateStoredDirectory(directory);
      // Le shell déjà lancé garde son propre cwd : on redémarre la session
      // pour qu'il démarre dans le nouveau dossier.
      setSessionKey(prev => prev + 1);
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error selecting directory:', error);
      }
    }
  }, []);

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
          handleKillTerminal={handleKillTerminal}
          setIsOpen={handleClose}
          setIsMinimized={setIsMinimized}
          setIsFullscreen={setIsFullscreen}
          mergedConfig={mergedConfig}
          onFolderSelect={onFolderSelect}
          sessionKey={sessionKey}
        />
      )}
    </div>
  );
};

export default Terminal;
