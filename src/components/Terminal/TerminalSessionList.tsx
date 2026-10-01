import React from 'react';
import { Trash2, Terminal as TerminalIcon } from 'lucide-react';
import { AgentMenu } from './AgentMenu';
import { findProvider, type AiProvider } from './config/aiProviders';
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
   * Id d'agent (`AI_PROVIDERS`) lancé dans cette session ; absent = shell nu.
   *
   * Source de vérité unique pour la marque affichée dans la ligne du panneau.
   * Avant, l'icône vivait dans un `useState` du panneau, alimenté uniquement par
   * le clic sur le bot : une session née de « Select a Profile » avait bien son
   * agent, mais le panneau n'en savait rien et affichait l'icône neutre.
   */
  agentId?: string;
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
  /** Lance l'agent choisi dans le PTY de la session et mémorise sa marque. */
  onLaunchAgent: (id: string, agent: AiProvider) => void;
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

  const launchAgent = (sessionId: string) => (agent: AiProvider) => {
    // On affiche la session avant de taper : xterm ne peut pas écrire dans un
    // conteneur masqué sans refit.
    if (sessionId !== activeId) props.onSelect(sessionId);
    props.onLaunchAgent(sessionId, agent);
  };

  return (
    <div className="terminal-sidebar flex w-48 shrink-0 flex-col border-l border-[#333] bg-[#252526]">
      <div className="terminal-session-list py-1">
        {sessions.map((session) => {
          const isActive = session.id === activeId;
          // La marque vient de la session elle-même : les deux chemins de choix
          // d'agent (« Select a Profile » et le bot de la ligne) convergent ici.
          const agent = session.agentId ? findProvider(session.agentId) : undefined;
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
              {/* Agent puis corbeille : les deux n'apparaissent qu'au survol.
                  La corbeille est en `invisible`, PAS en `hidden` : `display:none`
                  la sort du flux, donc elle vaut zéro largeur au repos et
                  réapparaît en 24px au survol — la ligne s'élargit et le bouton
                  agent se tasse vers la gauche, ce qui faisait atterrir le clic
                  sur la corbeille. `visibility:hidden` garde la place et neutralise
                  le survol. Le bouton reste atteignable au clavier (`focus-visible`
                  le révèle) : la corbeille est une action destructive, elle ne doit
                  pas disparaître pour qui navigue au clavier. */}
              <AgentMenu selected={agent} onSelect={launchAgent(session.id)} />
              {sessions.length > 1 && (
                <button
                  type="button"
                  aria-label={`Close ${session.title}`}
                  onClick={() => props.onClose(session.id)}
                  className="invisible flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white group-hover:visible focus-visible:visible"
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
