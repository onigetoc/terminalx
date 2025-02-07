import { getServerUrl } from '../config/serverConfig';

export interface CommandResult {
  output: string;
  currentDirectory?: string;
}

export async function executeCommandOnServer(command: string): Promise<CommandResult> {
  try {
    const API_URL = await getServerUrl();
    const response = await fetch(`${API_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    return response.json();
  } catch (error) {
    console.error('Error executing command:', error);
    throw error;
  }
}
