import React, { useState } from 'react';
import { Trash2, Terminal as TerminalIcon } from 'lucide-react';
import { AgentMenu } from './AgentMenu';
import type { AiProvider } from './config/aiProviders';
import type { ShellKind } from './InteractiveTerminal';
import { detectOsKind, shellTitle } from './config/shellProfiles';

/** Une session vivante : son shell, son nom affiché et son compteur de relance. */
export interface TerminalSession {
  id: string;
  shell: ShellKind;
  /** Nom affiché dans l'en-tête et le panneau. Suit la commande lancée. */
  title: string;
  /** Incrémenté par le bouton Kill : le remontage tue le shell et en ouvre un autre. */
  restartKey: number;
  /** Répertoire courant réel de la session (suit ses `cd`). */
  cwd?: string;
  /**
   * Commande à taper dès que le shell répond. Utilisé quand la session est
   * née d'un choix d'agent : au montage le PTY n'existe pas encore, la
   * commande ne peut donc pas partir immédiatement.
   */
  pendingCommand?: string;
}

/** Nom par défaut d'une session : le shell du profil choisi, nommé selon l'OS. */
export function defaultSessionTitle(shell: ShellKind): string {
  return shellTitle(shell, detectOsKind());
}

interface TerminalSessionListProps {
  sessions: TerminalSession[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  /** Lance la commande de l'agent choisi dans le PTY de la session. */
  onLaunchAgent: (id: string, command: string) => void;
}

/**
 * Panneau latéral droit : la liste des sessions vivantes avec leur nom, la
 * session active mise en évidence. C'est le seul endroit où l'on passe d'une
 * session à l'autre ; les actions de la fenêtre restent dans l'en-tête.
 *
 * Rien n'est démonté quand on change de session : le parent garde tous les
 * <InteractiveTerminal> montés et masque seulement ceux qui sont inactifs.
 */
export function TerminalSessionList(props: TerminalSessionListProps): JSX.Element {
  const { sessions, activeId } = props;
  // Agent retenu par session : l'icône reprend sa marque. Cléé par session pour
  // que chaque panneau garde son propre choix.
  const [agents, setAgents] = useState<Record<string, AiProvider>>({});

  const launchAgent = (sessionId: string) => (provider: AiProvider) => {
    setAgents((prev) => ({ ...prev, [sessionId]: provider }));
    // On affiche la session avant de taper : xterm ne peut pas écrire dans un
    // conteneur masqué sans refit.
    if (sessionId !== activeId) props.onSelect(sessionId);
    props.onLaunchAgent(sessionId, provider.command);
  };

  return (
    <div className="terminal-sidebar flex w-48 shrink-0 flex-col border-l border-[#333] bg-[#252526]">
      <div className="terminal-session-list py-1">
        {sessions.map((session) => {
          const isActive = session.id === activeId;
          return (
            <div
              key={session.id}
              className={`group flex items-center pr-1 transition-colors ${
                isActive ? 'bg-[#1e1e1e]' : 'hover:bg-[#2a2d2e]'
              }`}
            >
              <button
                type="button"
                onClick={() => props.onSelect(session.id)}
                className={`flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-3 text-left text-xs ${
                  isActive ? 'text-white' : 'text-[#cccccc]'
                }`}
              >
                {/* Filet bleu : repère la session active, comme VS Code. */}
                {isActive && <span className="-ml-3 mr-1 h-4 w-0.5 shrink-0 bg-[#0e639c]" />}
                <TerminalIcon className="h-3.5 w-3.5 shrink-0 lucide opacity-80" />
                <span className="truncate">{session.title}</span>
              </button>
              {/* Agent puis corbeille : les deux n'apparaissent qu'au survol. */}
              <AgentMenu selected={agents[session.id]} onSelect={launchAgent(session.id)} />
              {sessions.length > 1 && (
                <button
                  type="button"
                  aria-label={`Close ${session.title}`}
                  onClick={() => props.onClose(session.id)}
                  className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-sm text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white group-hover:flex"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TerminalSessionList;
