import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

let currentWorkingDirectory = process.cwd();

export const executeCommand = async (command: string) => {
  try {
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

    // Exécution des autres commandes dans le répertoire courant
    const { stdout, stderr } = await execAsync(command, { 
      cwd: currentWorkingDirectory 
    });

    return {
      output: stdout || stderr,
      currentDirectory: currentWorkingDirectory
    };
  } catch (error: any) {
    return {
      output: error.message,
      currentDirectory: currentWorkingDirectory
    };
  }
};

export const getCurrentDirectory = () => currentWorkingDirectory;