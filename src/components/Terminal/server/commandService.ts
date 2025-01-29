import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

let currentWorkingDirectory = process.cwd();

export const executeCommand = async (command: string) => {
  const cmd = command.trim();

  // Gestion spéciale de cd
  if (cmd.startsWith('cd')) {
    const pathArg = cmd.slice(2).trim();
    let targetPath;

    if (!pathArg || pathArg === '~') {
      targetPath = os.homedir();
    } else if (pathArg === '..' || pathArg === '../') {
      targetPath = path.join(currentWorkingDirectory, '..');
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

  // Utiliser spawn au lieu de exec pour préserver les codes ANSI
  return new Promise((resolve, reject) => {
    try {
      // Split command into command and args
      const parts = cmd.split(' ');
      const program = parts[0];
      const args = parts.slice(1);

      const childProcess = spawn(program, args, {
        cwd: currentWorkingDirectory,
        shell: true,
        env: {
          ...process.env,
          FORCE_COLOR: 'true', // Force les couleurs ANSI
          TERM: 'xterm-256color' // Support complet des couleurs
        }
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        resolve({
          output: stdout || stderr,
          currentDirectory: currentWorkingDirectory
        });
      });

      childProcess.on('error', (error) => {
        reject(error);
      });
    } catch (error: any) {
      resolve({
        output: error.message,
        currentDirectory: currentWorkingDirectory
      });
    }
  });
};

export const getCurrentDirectory = () => currentWorkingDirectory;
