import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import { decodeOutput, isWindows } from '../utils/encodingUtils';

// Initialize the working directory
let currentWorkingDirectory = os.homedir();

// Fonction pour normaliser les chemins selon l'OS
function normalizePath(inputPath: string): string {
  // Convertir les backslashes en forward slashes pour la cohérence
  let normalizedPath = inputPath.replace(/\\/g, '/');
  
  // Si on est sur Windows et que le chemin commence par un slash,
  // s'assurer qu'il y a bien le lecteur
  if (isWindows && /^\/[^\/]/.test(normalizedPath)) {
    const currentDrive = process.cwd().split(path.sep)[0];
    normalizedPath = `${currentDrive}/${normalizedPath}`;
  }

  // Reconvertir en format natif de l'OS pour l'exécution
  return path.normalize(normalizedPath);
}

// Use this directory as default, but don't change process directory yet
// This allows time for the stored directory to be loaded from localStorage
export const initializeDirectory = async (directory?: string) => {
  try {
    // If a directory is provided (e.g. from localStorage), try to use it
    if (directory) {
      process.chdir(directory);
      currentWorkingDirectory = process.cwd();
      return true;
    }
    
    // Otherwise use the home directory
    process.chdir(currentWorkingDirectory);
    return true;
  } catch (error) {
    console.error('Failed to initialize directory:', error);
    // On error, stay in current directory rather than forcing home
    return false;
  }
};

// Initialize with home directory
initializeDirectory();

export const executeCommand = async (command: string) => {
  const cmd = command.trim();

  if (cmd.startsWith('cd')) {
    const pathArg = cmd.slice(2).trim();
    let targetPath;

    if (!pathArg) {
      targetPath = os.homedir();
    } else if (pathArg === '..' || pathArg === '../' || cmd === 'cd..') {
      targetPath = path.resolve(currentWorkingDirectory, '..');
    } else {
      targetPath = path.resolve(currentWorkingDirectory, pathArg);
    }

    try {
      process.chdir(targetPath);
      currentWorkingDirectory = process.cwd();
      return {
        output: `Directory changed to ${currentWorkingDirectory}`,
        currentDirectory: currentWorkingDirectory
      };
    } catch (error) {
      return {
        output: `cd: no such file or directory: ${pathArg}`,
        currentDirectory: currentWorkingDirectory
      };
    }
  }

  // Gestion normale de cd
  if (cmd.startsWith('cd ') || cmd === 'cd') {
    const pathArg = cmd === 'cd' ? '' : cmd.slice(3).trim();
    let targetPath;

    if (!pathArg) {
      targetPath = os.homedir();
    } else {
      // Normaliser le chemin avant de le résoudre
      const normalizedPath = normalizePath(pathArg);
      targetPath = path.resolve(currentWorkingDirectory, normalizedPath);
    }

    try {
      process.chdir(targetPath);
      currentWorkingDirectory = process.cwd();
      return {
        output: `Directory changed to ${currentWorkingDirectory}`,
        currentDirectory: currentWorkingDirectory
      };
    } catch (error) {
      return {
        output: `cd: no such file or directory: ${pathArg}`,
        currentDirectory: currentWorkingDirectory
      };
    }
  }

  // Pour les commandes start/open, normaliser le chemin dans les arguments
  if (cmd.toLowerCase().startsWith('start ') || cmd.toLowerCase().startsWith('xdg-open ')) {
    const [cmdName, ...args] = cmd.split(' ');
    const normalizedArgs = args.map(arg => {
      // Ne normaliser que si ce n'est pas une option (ne commence pas par - ou /)
      if (!arg.startsWith('-') && !arg.startsWith('/')) {
        return normalizePath(arg);
      }
      return arg;
    });
    command = [cmdName, ...normalizedArgs].join(' ');
  }

  return new Promise((resolve, reject) => {
    try {
      const shell = isWindows ? 'cmd.exe' : '/bin/sh';
      const shellArgs = isWindows ? ['/d', '/s', '/c'] : ['-c'];
      
      const env = {
        ...process.env,
        FORCE_COLOR: 'true',
        TERM: 'xterm-256color'
      };

      if (!cmd.startsWith('tree')) {
        Object.assign(env, {
          PYTHONIOENCODING: 'utf-8',
          LANG: 'en_US.UTF-8',
          CHCP: '65001'
        });
      }

      // Détecter les commandes qui doivent être exécutées en arrière-plan
      const isBackgroundCommand = isWindows 
        ? cmd.toLowerCase().startsWith('start ') 
        : cmd.toLowerCase().startsWith('xdg-open ') || cmd.toLowerCase().includes('&');

      // Sur Windows, si la commande est "start" sans arguments, on ne la détache pas
      const isSimpleStart = isWindows && cmd.toLowerCase() === 'start';
      
      const childProcess = spawn(shell, [...shellArgs, cmd], {
        cwd: currentWorkingDirectory,
        shell: false,
        windowsHide: false,
        env,
        detached: isBackgroundCommand && !isSimpleStart
      });

      if (isBackgroundCommand && !isSimpleStart) {
        childProcess.unref();
        resolve({
          output: `Background launch : ${cmd}`,
          currentDirectory: currentWorkingDirectory
        });
        return;
      }

      const stdoutBuffers: Buffer[] = [];
      const stderrBuffers: Buffer[] = [];

      childProcess.stdout.on('data', (data: Buffer) => {
        stdoutBuffers.push(data);
      });

      childProcess.stderr.on('data', (data: Buffer) => {
        stderrBuffers.push(data);
      });

      childProcess.on('close', (code: number) => {
        const stdout = Buffer.concat(stdoutBuffers);
        const stderr = Buffer.concat(stderrBuffers);
        
        resolve({
          output: decodeOutput(cmd, stdout) || decodeOutput(cmd, stderr),
          currentDirectory: currentWorkingDirectory
        });
      });

      childProcess.on('error', (error: Error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const getCurrentDirectory = () => currentWorkingDirectory;
