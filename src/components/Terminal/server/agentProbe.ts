import { execFile } from 'child_process';
import { AI_PROVIDERS, type AgentInstallResult, type AgentStatus, type AiProvider } from '../config/aiProviders';

/**
 * Détection et installation des agents IA, côté serveur.
 *
 * Pourquoi ici et pas dans le PTY : taper `codex --version` dans une session
 * écrite l'output dans le terminal visible, pollue l'historique et force un
 * aller-retour réseau par binaire sondé. Ici tout est dans un `execFile`
 * detached du monde visuel — le client n'a qu'à lire du JSON.
 */

/** Un probe qui traîne au-delà de ça est considéré comme échoué (binaire cassé). */
const PROBE_TIMEOUT_MS = 5000;
/** npm + téléchargement de binaire : large, mais borné. */
const INSTALL_TIMEOUT_MS = 10 * 60 * 1000;
/** Nombre de lignes de sortie conservées pour le dialogue d'installation. */
const OUTPUT_LINES = 40;

/**
 * TTL du cache. Assez long pour qu'ouvrir/fermer les menus ne relance pas 4
 * processus à chaque survol, assez court pour que `Install` reflète le résultat
 * sans redémarrer le serveur.
 */
const CACHE_TTL_MS = 30 * 1000;

interface CacheEntry {
  at: number;
  statuses: AgentStatus[];
}

let cache: CacheEntry | null = null;
/** Promesse de probe en cours, pour dédoublonner les GET concurrents. */
let inFlight: Promise<AgentStatus[]> | null = null;

const isWindows = process.platform === 'win32';

/**
 * Lance une ligne de commande hors du PTY.
 *
 * Sous Windows on passe par `cmd.exe` : npm installe les agents en shims
 * `*.cmd` / `*.ps1`, qu'`execFile` ne sait pas exécuter directement (il ne
 * résout que les exécutables). `cmd /c` applique PATH + PATHEXT comme le ferait
 * une session PowerShell. Ailleurs, exécution directe, sans shell.
 */
function exec(
  command: string,
  options: { timeout: number }
): Promise<{ ok: boolean; output: string; error?: string }> {
  const file = isWindows ? 'cmd.exe' : '/bin/sh';
  const args = isWindows
    ? ['/d', '/s', '/c', command]
    : ['-c', command];

  return new Promise((resolve) => {
    execFile(
      file,
      args,
      {
        timeout: options.timeout,
        windowsHide: true,
        // Pas d'`Buffer` (incompatible avec @types/node@20 sur ce projet,
        // cf. les autres routes) : on demande une chaîne directement.
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
        // Le PATH du service, pas celui d'un shell interactif : c'est
        // exactement le PATH qui décide si l'agent est lançable dans une
        // session PTY, puisque le PTY hérite de `process.env`.
        env: process.env
      },
      (error, stdout, stderr) => {
        const output = `${String(stdout)}${String(stderr)}`.trim();
        if (error) {
          resolve({ ok: false, output: lastLines(output), error: error.message });
          return;
        }
        resolve({ ok: true, output: lastLines(output) });
      }
    );
  });
}

/** Ne garder que les dernières lignes non vides, pour le bloc du dialogue. */
function lastLines(output: string): string {
  if (!output) return '';
  return output.split(/\r?\n/).slice(-OUTPUT_LINES).join('\n');
}

/** Première ligne non vide de la sortie : c'est là que vit le numéro de version. */
function firstLine(output: string): string | undefined {
  const line = output.split(/\r?\n/).map((part) => part.trim()).find(Boolean);
  return line || undefined;
}

/** Un agent est probeé une fois : tous sondés en parallèle. */
function probeOne(provider: AiProvider): Promise<AgentStatus> {
  const command = [provider.command, ...provider.versionArgs].join(' ');
  return exec(command, { timeout: PROBE_TIMEOUT_MS }).then((result) => {
    // Erreur => absent. C'est la règle demandée : si `codex --version` échoue,
    // `codex` n'est pas utilisable, peu importe la raison (PATH, binaire
    // corrompu, Node trop vieux pour le shim).
    if (!result.ok) return { id: provider.id, installed: false };
    return { id: provider.id, installed: true, version: firstLine(result.output) };
  });
}

async function probeAll(): Promise<AgentStatus[]> {
  try {
    return await Promise.all(AI_PROVIDERS.map(probeOne));
  } catch {
    // `Promise.all` ne rejette jamais ici (chaque probe resolve), mais on garde
    // le filet : une régression future ne doit pas faire tomber la route.
    return AI_PROVIDERS.map((provider) => ({ id: provider.id, installed: false }));
  }
}

/**
 * États de tous les agents, mis en cache. Déduplonne aussi les appels
 * concurrents : ouvrir deux menus côte à côte ne lance qu'une seule sonde.
 */
export function getAgentStatuses(): Promise<AgentStatus[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return Promise.resolve(cache.statuses);
  }
  if (inFlight) return inFlight;

  inFlight = probeAll().then((statuses) => {
    cache = { at: Date.now(), statuses };
    inFlight = null;
    return statuses;
  });
  return inFlight;
}

/**
 * Invalide le cache après une installation : sans ça, le dialogue afficherait
 * encore « not installed » pendant 30 s après un install réussi.
 */
function invalidateCache(): void {
  cache = null;
}

/**
 * Exécute la commande d'installation officielle d'un agent. La commande est
 * choisie par le client (il connaît l'OS affiché) puis validée ici : le serveur
 * refuse tout ce qui n'est pas exactement une entrée du registre, ce qui évite
 * d'exposer une route d'exécution de commande arbitraire.
 */
export async function installAgent(provider: AiProvider, command: string): Promise<AgentInstallResult> {
  if (command !== provider.install) {
    throw new Error(`Unsupported install command for ${provider.id}`);
  }

  const result = await exec(command, { timeout: INSTALL_TIMEOUT_MS });
  invalidateCache();
  return { ok: result.ok, output: result.output };
}
