import { getServerUrl } from '../config/serverConfig';

/** Clé localStorage du dernier dossier de travail choisi. */
const STORED_DIRECTORY_KEY = 'terminalDirectory';

/**
 * Normalise un chemin en remplaçant les backslashes par des forward slashes.
 */
export function formatPath(path: string): string {
  return path?.replace(/\\/g, '/') || '';
}

/**
 * Demande au serveur de se positionner dans `directory` et renvoie le chemin
 * réellement retenu (le serveur peut refuser un dossier inexistant).
 */
export async function setWorkingDirectory(directory: string): Promise<string> {
  const API_URL = await getServerUrl();
  const response = await fetch(`${API_URL}/init-directory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ directory })
  });
  if (!response.ok) throw new Error('Failed to initialize directory');
  const data = await response.json();
  return formatPath(data.currentDirectory);
}

/**
 * Répertoire de travail de la session PTY.
 * 1. Le dossier mémorisé dans localStorage, s'il existe encore.
 * 2. Sinon, le répertoire courant du serveur.
 */
export async function initializeDirectory(): Promise<string> {
  const storedDirectory = localStorage.getItem(STORED_DIRECTORY_KEY);
  if (storedDirectory) {
    try {
      return await setWorkingDirectory(storedDirectory);
    } catch (error) {
      // Dossier supprimé ou serveur indisponible : on repart du défaut.
      console.warn('Stored directory is no longer reachable, falling back:', error);
    }
  }

  try {
    const API_URL = await getServerUrl();
    const response = await fetch(`${API_URL}/current-directory`);
    if (!response.ok) throw new Error('Failed to get current directory');
    const data = await response.json();
    return formatPath(data.currentDirectory);
  } catch (error) {
    console.warn('Failed to get current directory, using fallback:', error);
    return '';
  }
}

/** Commandes reconnues comme un changement de répertoire (Windows et Unix). */
const CD_COMMAND = /^\s*(?:cd|chdir|sl|set-location)\b\s*(.*)$/i;

/**
 * Si `command` est un `cd`, renvoie le répertoire résolu, sinon `null`.
 * Résolution volontairement simple : un chemin absolu est pris tel quel, un
 * chemin relatif est joint à `cwd` puis normalisé (`.` et `..`).
 */
export function resolveDirectoryCommand(command: string, cwd: string): string | null {
  const match = command.match(CD_COMMAND);
  if (!match) return null;
  let target = match[1].trim().replace(/^-path\s+/i, '').trim();
  target = target.replace(/^["']|["']$/g, '');
  // `cd` seul, `cd .` ou `cd -` : rien de fiable à afficher.
  if (!target || target === '.' || target === '-') return null;
  return resolvePath(cwd, target);
}

/** Joint `target` à `cwd` et aplatit les segments `.` et `..`. */
function resolvePath(cwd: string, target: string): string {
  const norm = (p: string) => p.replace(/\\/g, '/');
  const t = norm(target);
  const isAbsolute = /^[a-zA-Z]:\//.test(t) || t.startsWith('/');
  const base = isAbsolute || !cwd ? t : `${norm(cwd).replace(/\/+$/, '')}/${t}`;
  const root = base.match(/^([a-zA-Z]:\/|\/\/[^/]+\/[^/]+|\/)/)?.[1] ?? '';
  const parts: string[] = [];
  for (const segment of base.slice(root.length).split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  return root + parts.join('/');
}

/**
 * Mémorise le dossier de travail pour les prochaines sessions.
 */
export function updateStoredDirectory(newDirectory: string): void {
  if (!newDirectory) return;
  try {
    localStorage.setItem(STORED_DIRECTORY_KEY, formatPath(newDirectory));
  } catch (error) {
    console.error('Failed to update stored directory:', error);
  }
}
