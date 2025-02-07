import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import { decodeOutput, isWindows } from '../utils/encodingUtils';

// Initialize the working directory
let currentWorkingDirectory = os.homedir();

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

  return new Promise((resolve, reject) => {
    try {
      const shell = isWindows ? 'cmd.exe' : '/bin/sh';
      const shellArgs = isWindows ? ['/d', '/s', '/c'] : ['-c'];
      
      // Préparer l'environnement en fonction de la commande
      const env = {
        ...process.env,
        FORCE_COLOR: 'true',
        TERM: 'xterm-256color'
      };

      // Si ce n'est PAS la commande tree, forcer l'UTF-8
      if (!cmd.startsWith('tree')) {
        Object.assign(env, {
          PYTHONIOENCODING: 'utf-8',
          LANG: 'en_US.UTF-8',
          CHCP: '65001' // Force l'UTF-8 sur Windows
        });
      }

      const childProcess = spawn(shell, [...shellArgs, cmd], {
        cwd: currentWorkingDirectory,
        shell: false,
        windowsHide: false,
        env
      });

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
