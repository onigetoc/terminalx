import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, Copy, Loader2 } from 'lucide-react';
import { ProviderIcon } from './AgentMenu';
import { useTerminalOverlayHost } from './TerminalOverlay';
import { type AiProvider } from './config/aiProviders';
import { runAgentInstall } from './config/useAgentAvailability';

/** Thème des surfaces du terminal : le dialogue shadcn par défaut est clair. */
const SURFACE = 'border-[#3c3c3c] bg-[#252526] text-[#d4d4d4]';
const ACTION = 'bg-[#0e639c] text-white hover:bg-[#1177bb]';

type Phase = 'idle' | 'running' | 'done';

interface AgentInstallDialogProps {
  provider: AiProvider | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Appelé après une installation réussie — c'est le parent qui décide ce que
   * « démarrer l'agent » signifie : créer une session, ou relancer celle qui est
   * déjà ouverte.
   */
  onInstalled: (provider: AiProvider) => void;
}

/**
 * « <binaire> should be installed — do you want to install it? »
 *
 * Le contrôle de version vit dans le serveur (`GET /agents`), jamais dans le
 * terminal : ce dialogue ne fait que proposer la commande d'installation
 * officielle. L'utilisateur peut la copier pour la lancer lui-même dans son
 * shell (souvent plus confortable pour un `npm install -g` qui demande un
 * mot de passe sudo), ou la laisser au serveur l'exécuter.
 */
export function AgentInstallDialog({
  provider,
  open,
  onOpenChange,
  onInstalled
}: AgentInstallDialogProps): JSX.Element | null {
  const overlayHost = useTerminalOverlayHost();
  const [phase, setPhase] = useState<Phase>('idle');
  const [output, setOutput] = useState('');
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sans hôte, pas de dialogue : hors d'un <Terminal /> on n'a pas de fenêtre
  // où le poser, et retomber sur un portail `body` masquerait toute la page.
  if (!provider || !overlayHost) return null;

  const command = provider.install;

  const reset = () => {
    setPhase('idle');
    setOutput('');
    setFailed(false);
    setCopied(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé) : la commande reste
      // visible et sélectionnable, ce qui suffit.
      setCopied(false);
    }
  };

  const install = async () => {
    setPhase('running');
    setFailed(false);
    try {
      const result = await runAgentInstall(provider);
      setOutput(result.output);
      setFailed(!result.ok);
      setPhase('done');
    } catch (error) {
      setOutput(error instanceof Error ? error.message : String(error));
      setFailed(true);
      setPhase('done');
    }
  };

  const title = `${provider.label} is not installed`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Refermer pendant une installation laisserait l'`execFile` orphelin
        // côté serveur : on n'autorise la fermeture qu'une fois le process
        // terminé, ou on le laisse finir en arrière-plan.
        if (!next && phase === 'running') return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogPrimitive.Portal container={overlayHost}>
        {/* `!absolute` sur l'overlay et le contenu : le shadcn par défaut est en
            `fixed`, donc il se calerait sur le viewport et masquerait la page qui
            héberge le terminal. En `absolute`, le premier ancêtre positionné est
            `.terminal-window` (`relative` + `overflow:hidden`), et le dialogue
            reste découpé dans la fenêtre du terminal. `z-[10000]` le passe devant
            l'en-tête, le corps et le pied. */}
        <DialogPrimitive.Overlay className="!absolute inset-0 z-[10000] bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
          className={`${SURFACE} !absolute left-1/2 top-1/2 z-[10001] grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 p-6 shadow-lg outline-none`}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#d4d4d4]">
              <ProviderIcon provider={provider} className="h-4 w-4" />
              {phase === 'done' && !failed ? `${provider.label} installed` : title}
            </DialogTitle>
            <DialogDescription className="text-[#9d9d9d]">
              The <code className="text-[#d4d4d4]">{provider.command}</code> command was not found on
              your PATH. Run this to install it:
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-2">
            <pre className="min-w-0 flex-1 overflow-x-auto rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 font-mono text-xs text-[#d4d4d4]">
              {command}
            </pre>
            <Button
              variant="outline"
              size="icon"
              aria-label="Copy install command"
              onClick={copy}
              className="shrink-0 border-[#3c3c3c] bg-transparent text-[#d4d4d4] hover:bg-[#333] hover:text-white"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {phase === 'done' && output && (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 font-mono text-[11px] text-[#9d9d9d]">
              {output}
            </pre>
          )}

          <DialogFooter>
            {phase === 'done' && !failed ? (
              <>
                <Button
                  variant="outline"
                  className="border-[#3c3c3c] bg-transparent text-[#d4d4d4] hover:bg-[#333] hover:text-white"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                <Button className={ACTION} onClick={() => onInstalled(provider)}>
                  Start {provider.label}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="border-[#3c3c3c] bg-transparent text-[#d4d4d4] hover:bg-[#333] hover:text-white"
                  onClick={() => onOpenChange(false)}
                  disabled={phase === 'running'}
                >
                  {phase === 'done' ? 'Close' : 'Cancel'}
                </Button>
                <Button className={ACTION} onClick={install} disabled={phase === 'running'}>
                  {phase === 'running' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Installing…
                    </>
                  ) : phase === 'done' ? (
                    'Try again'
                  ) : (
                    'Install'
                  )}
                </Button>
              </>
            )}
          </DialogFooter>

          {phase === 'done' && failed && (
            <p className="flex items-start gap-2 text-xs text-[#f48771]">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>
                Installation failed. Run the command above in your own shell to see why.
              </span>
            </p>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}

export default AgentInstallDialog;
