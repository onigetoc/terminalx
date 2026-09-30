import React from 'react';
import { Trash2, Terminal as TerminalIcon } from 'lucide-react';
import type { ShellKind } from './InteractiveTerminal';

/** Une session vivante : son shell, son nom affiché et son compteur de relance. */
export interface TerminalSession {
  id: string;
  shell: ShellKind;
  /** Nom affiché dans l'en-tête et le panneau. Suit la commande lancée. */
  title: string;
  /** Incrémenté par le bouton Kill : le remontage tue le shell et en ouvre un autre. */
  restartKey: number;
}

/** Nom par défaut d'une session : celui du profil choisi. */
export function defaultSessionTitle(shell: ShellKind): string {
  if (shell === 'powershell') return 'PowerShell';
  if (shell === 'cmd') return 'CMD';
  return 'Terminal';
}

interface TerminalSessionListProps {
  sessions: TerminalSession[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
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
              {/* La croix n'apparaît qu'au survol et seulement s'il reste une
                  session : fermer la dernière viderait le panneau. */}
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
