export interface CommandResult {
  output: string;
  currentDirectory?: string;
}

export interface CommandExecutor {
  execute: (command: string) => Promise<CommandResult>;
}

export const executeCommandOnServer = async (command: string): Promise<CommandResult> => {
  const response = await fetch('http://localhost:3002/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command })
  });
  return response.json();
};
