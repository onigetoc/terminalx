import os from 'os';

// Répertoire de travail du serveur. C'est le `cwd` utilisé pour chaque session
// PTY lancée, et il change quand l'utilisateur sélectionne un dossier dans l'UI
// du terminal (POST /init-directory). Sans valeur explicite, on démarre dans le
// dossier home. Comme pour l'ancien modèle "une commande / une réponse", cet
// état est partagé par tous les clients du serveur et repart du home au
// redémarrage.
let currentWorkingDirectory = os.homedir();

/**
 * Positionne le répertoire de travail du serveur.
 * Sans argument, on reste dans le répertoire courant.
 * Retourne false si le chemin demandé n'existe pas.
 */
export const initializeDirectory = async (directory?: string) => {
  try {
    process.chdir(directory || currentWorkingDirectory);
    currentWorkingDirectory = process.cwd();
    return true;
  } catch (error) {
    console.error('Failed to initialize directory:', error);
    return false;
  }
};

export const getCurrentDirectory = () => currentWorkingDirectory;
