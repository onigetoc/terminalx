import iconv from 'iconv-lite';

export const isWindows = process.platform === 'win32';

export function getProperEncoding(command: string): string {
    if (isWindows && (command.trim().startsWith('tree') || command.trim().startsWith('wmic'))) {
        return 'cp850';  // Pour les commandes tree et wmic sous Windows
    }
    return 'utf8';  // UTF-8 par défaut pour tout le reste
}

export function decodeOutput(command: string, buffer: Buffer): string {
  const encoding = getProperEncoding(command);
  try {
    if (encoding === 'cp850') {
      // Uniquement décoder avec iconv si c'est la commande tree
      return iconv.decode(buffer, encoding);
    }
    // Sinon utiliser l'UTF-8 standard
    return buffer.toString('utf8');
  } catch (error) {
    console.warn(`Failed to decode with ${encoding}, falling back to utf8:`, error);
    return buffer.toString('utf8');
  }
}
