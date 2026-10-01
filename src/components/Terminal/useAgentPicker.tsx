import { useState } from 'react';
import { AgentInstallDialog } from './AgentInstallDialog';
import { useAgentAvailability, type AgentAvailability } from './config/useAgentAvailability';
import type { AiProvider } from './config/aiProviders';

export interface AgentPicker extends AgentAvailability {
  /**
   * Choix d'un agent dans un menu. Laisse passer `onPick` quand le binaire est
   * présent — ou quand le statut est encore inconnu, pour ne pas bloquer sur
   * un aller-retour réseau. Sinon ouvre le dialogue d'installation.
   */
  choose: (provider: AiProvider) => void;
  /** À poser en racine du composant : portail, il n'a pas besoin d'être dans le menu. */
  dialog: JSX.Element;
}

/**
 * Point de passage unique entre les deux menus d'agents (nouvelle session et
 * session ouverte) et la détection serveur. Les deux appellent `choose` avec le
 * même contrat : soit l'agent est lancé, soit l'utilisateur est invité à
 * l'installer — jamais de « command not found » écrit dans une session.
 */
export function useAgentPicker(onPick: (provider: AiProvider) => void): AgentPicker {
  const availability = useAgentAvailability();
  const [missing, setMissing] = useState<AiProvider | null>(null);

  const choose = (provider: AiProvider) => {
    if (availability.installed[provider.id] === false) {
      setMissing(provider);
      return;
    }
    onPick(provider);
  };

  const dialog = (
    <AgentInstallDialog
      provider={missing}
      open={missing !== null}
      onOpenChange={(open) => {
        if (!open) setMissing(null);
      }}
      onInstalled={(provider) => {
        setMissing(null);
        // Le cache serveur expire tout seul, mais on ne veut pas attendre 30 s
        // avant que la prochaine ouverture de menu ne montre l'agent installé.
        void availability.refresh();
        onPick(provider);
      }}
    />
  );

  return { ...availability, choose, dialog };
}
