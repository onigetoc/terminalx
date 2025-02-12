import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Terminal as TerminalIcon } from 'lucide-react';
import '@/components/Terminal/styles/terminal.css';
import { TerminalUI } from './TerminalUI';
import { TerminalConfig, defaultConfig, terminalConfig } from '@/components/Terminal/config/terminalConfig'; // Ajout de terminalConfig ici
import { setTerminalExecutor } from '@/components/Terminal/utils/terminalUtils';
import { translateCommand } from '@/components/Terminal/utils/commandOS';
import { isCustomCommand, executeCustomCommand } from './services/customCommands';
import { executeCommandOnServer, CommandResult } from './services/terminalApi';
import { formatCommand, formatTextWithLinks, FormattedOutput } from './services/terminalFormatter';
import { initializeDirectory, updateStoredDirectory } from './utils/directoryUtils';
import { createCommandWithTimeout, CommandTimeoutError } from './services/commandTimeout';

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
  const [history, setHistory] = useState<Array<{ command: string; output: string; isLoading?: boolean }>>([]);
  const [command, setCommand] = useState('');
  const [contentKey, setContentKey] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
  const [currentTimeoutCommand, setCurrentTimeoutCommand] = useState<{ cancel: () => void } | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const commandQueue = useRef<{command: string; displayInTerminal: number}[]>([]);

  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, []);


  const processCommand = useCallback(async (command: string, displayInTerminal: number) => {
    if (displayInTerminal) {
      setHistory(prev => [...prev, { command, output: '', isLoading: true }]);
    }
    
    let timeoutId: NodeJS.Timeout | undefined;
    let result: CommandResult;
    
    try {
      const trimmedCommand = command.trim().toLowerCase();

      if (trimmedCommand === 'clear' || trimmedCommand === 'cls') {
        setHistory([]);
        setCommand('');
        setContentKey(prev => prev + 1);
        return;
      }

      const commandPromise = new Promise<CommandResult>(async (resolve, reject) => {
        timeoutId = setTimeout(() => {
          setShowTimeoutDialog(true);
        }, 5000);

        try {
          if (isCustomCommand(command)) {
            result = await executeCustomCommand(command);
            if ('executeOnServer' in result && result.executeOnServer && 'command' in result) {
              const translatedCommand = translateCommand(result.command as string);
              result = await executeCommandOnServer(translatedCommand);
            }
          } else {
            const translatedCommand = translateCommand(command);
            result = await executeCommandOnServer(translatedCommand);
          }
          clearTimeout(timeoutId);
          resolve(result);
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      result = await commandPromise;

      // Update directory state and storage when cd command succeeds
      if (result.currentDirectory) {
        const trimmedCmd = command.trim().toLowerCase();
        if (trimmedCmd === 'cd' || trimmedCmd === 'cd..' || trimmedCmd.startsWith('cd ')) {
          updateStoredDirectory(result.currentDirectory);
        }
        setCurrentDirectory(result.currentDirectory);
      }

      if (displayInTerminal) {
        setHistory(prev => {
          const newHistory = [...prev];
          const lastIndex = newHistory.length - 1;
          newHistory[lastIndex] = {
            command,
            output: result.output,
            isLoading: false
          };
          return newHistory;
        });
        setTimeout(scrollToBottom, 0);
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (displayInTerminal) {
        setHistory(prev => {
          const newHistory = [...prev];
          const lastIndex = newHistory.length - 1;
          newHistory[lastIndex] = {
            command,
            output: `Error executing command: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
            isLoading: false
          };
          return newHistory;
        });
      }
    }
  }, [scrollToBottom, setCommand, setContentKey, setCurrentDirectory, setHistory]);

  const processNextCommand = useCallback(async () => {
    if (isExecuting || commandQueue.current.length === 0) return;

    setIsExecuting(true);
    const { command, displayInTerminal } = commandQueue.current[0];
    
    try {
      await processCommand(command, displayInTerminal);
    } finally {
      commandQueue.current.shift();
      setIsExecuting(false);
      
      // Process next command if there are any in queue
      if (commandQueue.current.length > 0) {
        setTimeout(processNextCommand, 0);
      }
    }
  }, [isExecuting, processCommand]);

  const executeCommand = useCallback(async (cmd: string | string[], displayInTerminal: number = 1) => {
    const commands = Array.isArray(cmd) ? cmd : [cmd];
    
    // Add commands to queue
    commands.forEach(command => {
      commandQueue.current.push({ command, displayInTerminal });
    });
    
    // Start processing queue if not already processing
    processNextCommand();
  }, [processNextCommand]);

  useEffect(() => {
    const detectOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.includes('win')) return 'Windows';
      if (userAgent.includes('mac')) return 'macOS';
      if (userAgent.includes('linux')) return 'Linux';
      return 'Unknown OS';
    };

    const os = detectOS();
    setOsInfo(os);

    // Initialiser le répertoire en utilisant directoryUtils
    const initDir = async () => {
      try {
        const dir = await initializeDirectory();
        setCurrentDirectory(dir);
      } catch (error) {
        console.error('Failed to initialize directory:', error);
      }
    };

    initDir();
  }, []);

  useEffect(() => {
    setTerminalExecutor(executeCommand);
    return () => setTerminalExecutor(null);
  }, [executeCommand]);

  // Modifier l'effet pour initialiser l'état isVisible avec la valeur de terminalConfig
  useEffect(() => {
    const handleVisibilityChange = () => {
      const config = terminalConfig.get();
      setIsVisible(config.showTerminal);
    };

    // Initialiser l'état avec la valeur actuelle
    setIsVisible(terminalConfig.get().showTerminal);

    // S'abonner aux changements de configuration
    window.addEventListener('terminal-visibility-change', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('terminal-visibility-change', handleVisibilityChange);
    };
  }, []);

  // Initialize terminal controls at startup
  useEffect(() => {
    // Initialize executeCommand
    setTerminalExecutor(executeCommand);

    // Make handleToggleTerminal available globally for backward compatibility
    if (typeof window !== 'undefined') {
      window.handleToggleTerminal = handleToggleTerminal;
    }

    return () => {
      setTerminalExecutor(null);
      if (typeof window !== 'undefined') {
        window.handleToggleTerminal = undefined;
      }
    };
  }, [executeCommand]);

  // Scroll to bottom when history changes
  useEffect(() => {
    scrollToBottom();
  }, [history, scrollToBottom]);

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

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (command.trim()) {
      const nativeEvent = e.nativeEvent;
      if (nativeEvent instanceof Event) {
        nativeEvent.stopImmediatePropagation();
      }
      
      executeCommand(command);
      setCommand('');
      
      setTimeout(() => {
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [command, executeCommand]);

  const handleKillTerminal = useCallback(() => {
    setHistory([]);
    setCommand('');
    setContentKey(prev => prev + 1);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const formatCommandWithHighlight = useCallback((command: string): React.ReactNode => {
    return formatCommand(command);
  }, []);

  const formatOutput = useCallback((output: string): JSX.Element => {
    if (!output.trim()) {
      return <></>;
    }
    return (
      <div className="terminal-output-line">
        <FormattedOutput text={output} executeCommand={executeCommand} />
      </div>
    );
  }, [executeCommand]);

  const onFolderSelect = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      setHistory(prev => [...prev, {
        command: '',
        output: 'Your browser does not support directory selection. Please use a modern browser like Chrome or Edge.',
        isLoading: false
      }]);
      return;
    }

    try {
      const directoryHandle = await window.showDirectoryPicker();
      const folderPath = directoryHandle.name;
      
      // Exécuter la commande cd et attendre la réponse
      await executeCommand(`cd ${folderPath}`);
      
      // Le chemin sera mis à jour automatiquement par executeCommand 
      // seulement si la commande réussit
      
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setHistory(prev => [...prev, {
          command: '',
          output: `Error selecting directory: ${error.message}`,
          isLoading: false
        }]);
      }
    }
  }, [executeCommand]);

  // Modifier la condition de rendu pour utiliser CSS au lieu de null
  return (
    <div className={`${!isVisible ? 'hidden' : ''}`}>
        {!isOpen ? (
          <Button
            variant="default"
            className="fixed bottom-4 right-4 bg-[#1e1e1e] text-white floating-button rounded-[8px]"
            onClick={() => {
              setIsOpen(true);
            }}
          >
            <TerminalIcon className="w-4 h-4 mr-2 lucide" />
            Open Terminal
          </Button>
        ) : (
          <TerminalUI
            isOpen={isOpen}
            isFullscreen={isFullscreen}
            isMinimized={isMinimized}
            height={height}
            isDragging={isDragging}
            currentDirectory={currentDirectory}
            osInfo={osInfo}
            history={history}
            command={command}
            terminalRef={terminalRef}
            handleMouseDown={handleMouseDown}
            handleKillTerminal={handleKillTerminal}
            setIsOpen={handleClose}
            setIsMinimized={setIsMinimized}
            setIsFullscreen={setIsFullscreen}
            handleSubmit={handleSubmit}
            setCommand={setCommand}
            executeCommand={executeCommand}
            mergedConfig={mergedConfig}
            formatCommand={formatCommandWithHighlight}
            formatOutput={formatOutput}
            onFolderSelect={onFolderSelect}
            observerRef={observerRef}
            contentRef={contentRef}
            setHistory={setHistory}
            contentKey={contentKey}
            setContentKey={setContentKey}
            showTimeoutDialog={showTimeoutDialog}
            timeoutDialogKey={contentKey}
            onCancelCommand={() => {
              currentTimeoutCommand?.cancel();
              setShowTimeoutDialog(false);
            }}
            onContinueWaiting={() => setShowTimeoutDialog(false)}
          />
        )}
      </div>
  );
};

export default Terminal;
