import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { getServerUrl } from './serverConfig';
import type { AgentInstallResult, AgentStatus, AiProvider } from './aiProviders';

/**
 * Disponibilité des agents IA, sondée par le serveur.
 *
 * Une seule requête pour toute l'application, au premier menu monté. Le store
 * est au niveau module : chaque menu d'agents (bouton « + » et une icône par
 * session ouverte) s'y abonne, donc dix sessions ouvertes coûtent toujours un
 * seul `GET /agents`. Avant, chaque ligne de session avait son propre hook —
 * dix requêtes et dix copies d'état pour la même information.
 *
 * Règle de déclenchement : rien ne s'affiche tout seul. Un agent manquant ne se
 * voit qu'au clic — le clic est le message de l'utilisateur, et c'est lui qui
 * décide qu'il veut installer.
 *
 * Une entrée dont le statut est encore inconnu n'est pas traitée comme absente :
 * on ne prétend pas qu'un agent manque quand on n'a pas la réponse.
 */

export interface AgentAvailability {
  /** id d'agent -> présent sur le PATH ? `false` seulement après un probe formel. */
  installed: Record<string, boolean>;
  /** id d'agent -> première ligne de `<binaire> --version`. */
  versions: Record<string, string>;
  /** Re-sonde. Appelé seulement après une installation réussie. */
  refresh: () => Promise<void>;
}

interface Snapshot {
  installed: Record<string, boolean>;
  versions: Record<string, string>;
}

const EMPTY: Snapshot = { installed: {}, versions: {} };

let snapshot: Snapshot = EMPTY;
/** `true` une fois la première réponse reçue (ou échouée) — évite de re-sonder. */
let settled = false;
let inFlight: Promise<void> | null = null;

const listeners = new Set<() => void>();

function publish(next: Snapshot): void {
  snapshot = next;
  settled = true;
  for (const listener of listeners) listener();
}

async function probe(): Promise<void> {
  const statuses = await fetchStatuses();
  const installed: Record<string, boolean> = {};
  const versions: Record<string, string> = {};
  for (const status of statuses) {
    installed[status.id] = status.installed;
    if (status.version) versions[status.id] = status.version;
  }
  publish({ installed, versions });
}

/** Charge si besoin, une seule fois, et déduplonne les appels concurrents. */
function ensureProbed(): Promise<void> {
  if (settled) return Promise.resolve();
  if (!inFlight) {
    inFlight = probe().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/** Sonde tous les agents du registre. Un échec réseau renvoie une liste vide. */
async function fetchStatuses(): Promise<AgentStatus[]> {
  try {
    const response = await fetch(`${await getServerUrl()}/agents`, {
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { agents?: AgentStatus[] };
    return data.agents ?? [];
  } catch {
    return [];
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Les deux callbacks doivent renvoyer le même objet tant que rien ne change,
// sinon `useSyncExternalStore` boucle en rendu infini.
const getSnapshot = () => snapshot;

export function useAgentAvailability(): AgentAvailability {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void ensureProbed();
  }, []);

  // Après un install réussi : on veut voir l'agent devenir disponible sans
  // recharger la page. Le cache serveur a été invalidé par `installAgent`.
  // On force la requête — `settled` court-circuiterait `ensureProbed`.
  const refresh = useCallback(async () => {
    inFlight = probe().finally(() => {
      inFlight = null;
    });
    await inFlight;
  }, []);

  return { ...state, refresh };
}

/**
 * Exécute la commande d'installation d'un agent. La commande vient du registre,
 * jamais du dialogue : c'est le seul endroit qui décide ce qu'on a le droit de
 * lancer, et le serveur la revérifie de son côté.
 */
export async function runAgentInstall(provider: AiProvider): Promise<AgentInstallResult> {
  const response = await fetch(`${await getServerUrl()}/agents/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: provider.id, command: provider.install })
  });
  if (!response.ok) {
    throw new Error(`Install request failed (${response.status})`);
  }
  return (await response.json()) as AgentInstallResult;
}
