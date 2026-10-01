import { getServerUrl } from '../config/serverConfig';
import type { OsKind } from '../config/shellProfiles';

/**
 * Normalise un chemin en remplaçant les backslashes par des forward slashes.
 *
 * Pour l'affichage et la comparaison seulement — voir `toNativePath`.
 */
export function formatPath(path: string): string {
  return path?.replace(/\\/g, '/') || '';
}

/**
 * Convertit un chemin `formatPath` dans la syntaxe du système qui héberge le
 * PTY. À n'utiliser qu'au moment d'envoyer un `cwd` à node-pty.
 *
 * `formatPath` uniformise tout en `/`, mais node-pty est strict sous Windows :
 * un `cwd` en `D:/projet/src` fait échouer le spawn avec « Cannot create
 * process, error code: 267 » (répertoire inexistant). La session retombait alors
 * sur le dossier par défaut du serveur — un changement d'agent suffisait à
 * perdre le répertoire de travail.
 *
 * Un simple remplacement suffit, et il gère l'UNC : `//serveur/partage` devient
 * `\\serveur\partage`.
 */
export function toNativePath(path: string | undefined, os: OsKind): string {
  if (!path) return '';
  return os === 'windows' ? path.replace(/\//g, '\\') : path;
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
 * Répertoire de travail au démarrage : toujours le dossier par défaut de
 * l'utilisateur (home de l'OS du serveur). Aucun dossier visité par une session
 * n'est mémorisé — l'ouverture est déterministe. Chaque session garde ensuite
 * son propre cwd en mémoire tant que la page est ouverte.
 */
export async function initializeDirectory(): Promise<string> {
  try {
    const API_URL = await getServerUrl();
    const response = await fetch(`${API_URL}/default-directory`);
    if (!response.ok) throw new Error('Failed to get default directory');
    const data = await response.json();
    return await setWorkingDirectory(data.defaultDirectory);
  } catch (error) {
    console.warn('Failed to get default directory:', error);
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
