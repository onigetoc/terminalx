export const SERVER_CONFIG = {
  BASE_URL: 'http://localhost',
  PORT_RANGE: {
    START: 3000,
    END: 3010
  },
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000  // 1 seconde entre chaque tentative
} as const;

let API_PORT: number | null = null;

async function tryPort(port: number): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_CONFIG.BASE_URL}:${port}/health`, {
      // Ajouter un timeout pour éviter d'attendre trop longtemps
      signal: AbortSignal.timeout(1000)
    });
    // Accepter aussi les réponses 404 car cela signifie que le serveur répond
    if (response.ok || response.status === 404) {
      API_PORT = port;
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function getServerUrl(): Promise<string> {
  if (API_PORT) {
    return `${SERVER_CONFIG.BASE_URL}:${API_PORT}`;
  }

  // Essayer les ports dans l'ordre croissant
  for (let port = SERVER_CONFIG.PORT_RANGE.START; port <= SERVER_CONFIG.PORT_RANGE.END; port++) {
    if (await tryPort(port)) {
      return `${SERVER_CONFIG.BASE_URL}:${API_PORT}`;
    }
  }

  throw new Error('Could not find running API server');
}
