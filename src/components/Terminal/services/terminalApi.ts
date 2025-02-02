const API_URL = 'http://localhost:3002';

export interface CommandResult {
  output: string;
  currentDirectory?: string;
  executeOnServer?: boolean;
  command?: string;
}

export interface CommandExecutor {
  execute: (command: string) => Promise<CommandResult>;
}

export const executeCommandOnServer = async (command: string): Promise<CommandResult> => {
  const response = await fetch(`${API_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command })
  });

  return response.json();
};
