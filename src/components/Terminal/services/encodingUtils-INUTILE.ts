/**
import iconv from 'iconv-lite';

// Détecter si on est sous Windows
export const isWindows = process.platform === 'win32';

export function getProperEncoding(command: string): string {
  if (isWindows) {
    // Windows utilise différents encodages selon la commande
    if (command.includes('tree')) {
      return 'cp850';  // Pour la commande tree
    }
    return 'cp866';  // Pour les autres commandes Windows
  }
  return 'utf8';  // Pour Unix/Linux/MacOS
}

// Décoder la sortie en utilisant iconv-lite
export function decodeOutput(command: string, buffer: Buffer): string {
  const encoding = getProperEncoding(command);
  return iconv.decode(buffer, encoding);
}
 * Utilitaire de nettoyage pour le terminal
 */

/**
 * Normalise les sauts de ligne pour être cohérents
 */
function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n|\r|\n/g, '\n');
}

/**
 * Liste des caractères à préserver
 */
const preservedChars = new Set([
  '\n',      // Nouvelle ligne
  '\r',      // Retour chariot
  '\t',      // Tabulation
  '-',       // Tiret
  '–',       // Tiret moyen (–)
  '—',       // Tiret long (—)
  "'",       // Apostrophe simple
  '’',       // Apostrophe typographique (')
  '`'        // Backtick
]);

/**
 * Nettoie les caractères de contrôle tout en préservant les codes ANSI et la structure
 */
function cleanControlChars(text: string): string {
  return text.replace(
    // Ne capture que les caractères de contrôle non-ANSI
    /(?!\[[0-9;]*m)([--])/g,
    (char) => {
      if (preservedChars.has(char)) {
        return char;
      }
      // Vérifie si c'est un caractère imprimable
      if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126) {
        return char;
      }
      // Supprime uniquement les caractères de contrôle non désirés
      return '';
    }
  );
}

/**
 * Nettoie et normalise la sortie du terminal
 */
export const cleanTerminalOutput = (text: string): string => {
  const cleaned = cleanControlChars(text);
  return normalizeLineEndings(cleaned);