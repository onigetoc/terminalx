import React, { useState, useRef, useEffect, useCallback } from 'react';
import '@/components/Terminal/styles/terminal.css';
import { TerminalUI } from './TerminalUI';
import { TerminalConfig, defaultConfig } from '@/config/terminalConfig';
import { setTerminalExecutor } from '@/utils/terminalUtils';
import { translateCommand } from '@/utils/commandUtils';
import { isCustomCommand, executeCustomCommand } from './services/customCommands';
import { executeCommandOnServer, CommandResult } from './services/terminalApi';

interface TerminalProps {
  config?: Partial<TerminalConfig>;
}

const Terminal: React.FC<TerminalProps> = ({ config = {} }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [height, setHeight] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const [currentDirectory, setCurrentDirectory] = useState('');
  const [osInfo, setOsInfo] = useState('');
  const [history, setHistory] = useState<Array<{ command: string; output: string; isLoading?: boolean }>>([]);
  const [command, setCommand] = useState('');
  const [contentKey, setContentKey] = useState(0);

  const terminalRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);

  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, []);

  const mergedConfig = { ...defaultConfig, ...config };

  useEffect(() => {
    const detectOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.includes('win')) return 'Windows';
      if (userAgent.includes('mac')) return 'macOS';
      if (userAgent.includes('linux')) return 'Linux';
      return 'Unknown OS';
    };

    setOsInfo(detectOS());
  }, []);

  const executeCommand = useCallback(async (cmd: string | string[], displayInTerminal: number = 1) => {
    const commands = Array.isArray(cmd) ? cmd : [cmd];
    
    for (const command of commands) {
      if (displayInTerminal) {
        setHistory(prev => [...prev, { command, output: '', isLoading: true }]);
      }

      try {
        const trimmedCommand = command.trim().toLowerCase();
        let result: CommandResult;

        // Handle clear commands specially
        if (trimmedCommand === 'clear' || trimmedCommand === 'cls') {
          setHistory([]); // Clear history immediately
          setCommand('');
          setContentKey(prev => prev + 1);
          return; // Exit early for clear commands
        } 

        // Process other commands
        if (isCustomCommand(command)) {
          result = await executeCustomCommand(command);
        } else {
          const translatedCommand = translateCommand(command);
          result = await executeCommandOnServer(translatedCommand);
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
          setTimeout(scrollToBottom, 0); // Ensure DOM is updated
        }

        // Handle directory changes for server commands
        if (command.toLowerCase().startsWith('cd ') && result.currentDirectory) {
          setCurrentDirectory(result.currentDirectory);
        }
      } catch (error) {
        if (displayInTerminal) {
          setHistory(prev => {
            const newHistory = [...prev];
            const lastIndex = newHistory.length - 1;
            newHistory[lastIndex] = {
              command,
              output: `Error executing command: ${error}`,
              isLoading: false
            };
            return newHistory;
          });
        }
      }
    }
  }, []);

  useEffect(() => {
    setTerminalExecutor(executeCommand);
    return () => setTerminalExecutor(null);
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
    if (command.trim()) {
      executeCommand(command);
      setCommand('');
    }
  }, [command, executeCommand]);

  const handleKillTerminal = useCallback(() => {
    setHistory([]);
    setCommand('');
    setContentKey(prev => prev + 1);
  }, []);

  const formatCommand = useCallback((command: string): React.ReactNode => {
    return <span className="text-[#d4d4d4]">{command}</span>;
  }, []);

  const formatOutput = useCallback((output: string): React.ReactNode => {
    return <pre className="whitespace-pre-wrap text-[#d4d4d4]">{output}</pre>;
  }, []);

  const onFolderSelect = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3002/current-directory', {
        method: 'GET'
      });
      const data = await response.json();
      if (data.currentDirectory) {
        setCurrentDirectory(data.currentDirectory);
      }
    } catch (error) {
      console.error('Error getting current directory:', error);
    }
  }, []);

  return (
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
      setIsOpen={setIsOpen}
      setIsMinimized={setIsMinimized}
      setIsFullscreen={setIsFullscreen}
      handleSubmit={handleSubmit}
      setCommand={setCommand}
      executeCommand={executeCommand}
      mergedConfig={mergedConfig}
      formatCommand={formatCommand}
      formatOutput={formatOutput}
      onFolderSelect={onFolderSelect}
      observerRef={observerRef}
      contentRef={contentRef}
      setHistory={setHistory}
      contentKey={contentKey}
      setContentKey={setContentKey}
    />
  );
};

export default Terminal;
