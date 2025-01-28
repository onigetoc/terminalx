import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

let currentDirectory = process.cwd();

export const executeCommand = async (command: string) => {
  try {
    // Handle cd command specially
    if (command.startsWith('cd ')) {
      const newPath = command.slice(3).trim();
      const resolvedPath = path.resolve(currentDirectory, newPath);
      process.chdir(resolvedPath);
      currentDirectory = process.cwd();
      return {
        output: '',
        currentDirectory
      };
    }

    // Execute command in current directory
    const { stdout, stderr } = await execAsync(command, { cwd: currentDirectory });
    return {
      output: stdout || stderr,
      currentDirectory
    };
  } catch (error: any) {
    return {
      output: error.message,
      currentDirectory
    };
  }
};

export const getCurrentDirectory = () => currentDirectory;