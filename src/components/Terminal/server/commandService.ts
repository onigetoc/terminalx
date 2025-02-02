import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

// Réinitialiser le répertoire de travail au démarrage du serveur
let currentWorkingDirectory = os.homedir();
process.chdir(currentWorkingDirectory);

// Ajout d'une fonction pour initialiser le répertoire
export const initializeDirectory = (directory: string) => {
  try {
    process.chdir(directory);
    currentWorkingDirectory = process.cwd();
    return true;
  } catch (error) {
    // En cas d'erreur, revenir au répertoire personnel
    currentWorkingDirectory = os.homedir();
    process.chdir(currentWorkingDirectory);
    console.error('Failed to initialize directory:', error);
    return false;
  }
};

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

  return new Promise((resolve, reject) => {
    try {
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd.exe' : true;
      const shellArgs = isWindows ? ['/d', '/s', '/c'] : [];
      
      // Passer la commande telle quelle, sans modification
      const childProcess = spawn(
        isWindows ? shell : cmd.split(' ')[0],
        isWindows ? [...shellArgs, cmd] : cmd.split(' ').slice(1),
        {
          cwd: currentWorkingDirectory,
          shell: !isWindows,
          windowsHide: false,
          env: { ...process.env, FORCE_COLOR: 'true', TERM: 'xterm-256color' }
        }
      );

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', () => {
        resolve({
          output: stdout || stderr,
          currentDirectory: currentWorkingDirectory
        });
      });

      childProcess.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const getCurrentDirectory = () => currentWorkingDirectory;
