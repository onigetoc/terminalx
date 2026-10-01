import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Plus, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProviderIcon } from './AgentMenu';
import { AI_PROVIDERS, type AiProvider } from './config/aiProviders';
import type { ShellKind } from './InteractiveTerminal';
import { detectOsKind, defaultShellFor, shellProfilesFor } from './config/shellProfiles';

const TOOLTIP = 'bg-[#252526] text-[#d4d4d4] border border-[#333] shadow-md';

interface NewTerminalMenuProps {
  /** `pendingCommand` non vide = la session naît déjà lancée sur l'agent. */
  onCreate: (shell: ShellKind, pendingCommand?: string) => void;
}

/**
 * Contrôle « nouveau terminal » façon VS Code : un seul bloc visuel, sans
 * l'écart de 8px qui sépare les autres icônes.
 *
 * La partie `+` crée une session avec le shell par défaut de l'OS (PowerShell
 * sous Windows, zsh sous macOS, bash sous Linux) ; la petite flèche, juste à
 * côté et sans espace, ouvre la liste des profils disponibles sur la machine.
 */
export function NewTerminalMenu({ onCreate }: NewTerminalMenuProps): JSX.Element {
  const os = detectOsKind();
  const profiles = shellProfilesFor(os);
  const defaultShell = defaultShellFor(os);

  return (
    // Le <DropdownMenu> doit être l'ancêtre du <DropdownMenuTrigger> : le root
    // fournit le contexte, et <DropdownMenuContent> est portalisé de toute
    // façon. C'est pour ça qu'il enveloppe tout, y compris la partie `+`.
    <DropdownMenu>
      <TooltipProvider delayDuration={300}>
        <div className="flex h-6 shrink-0 items-center overflow-hidden rounded border border-[#3c3c3c]">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCreate(defaultShell)}
                aria-label="New terminal"
                className="h-6 w-5 rounded-none border-none bg-transparent text-[#d4d4d4] hover:bg-[#333] hover:text-white transition-colors"
              >
                <Plus className="h-4 w-4 lucide" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className={TOOLTIP}>
              <p>New terminal</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Select a profile"
                  className="h-6 w-4 rounded-none border-none border-l border-[#3c3c3c] bg-transparent text-[#d4d4d4] hover:bg-[#333] hover:text-white transition-colors"
                >
                  <ChevronDown className="h-3 w-3 lucide" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" className={TOOLTIP}>
              <p>Select a profile</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <DropdownMenuContent
        side="bottom"
        align="start"
        className="min-w-[180px] border-[#333] bg-[#252526] text-[#d4d4d4]"
      >
        <DropdownMenuItem
          className="text-[#d4d4d4] focus:bg-[#0e639c] focus:text-white"
          onSelect={() => onCreate(defaultShell)}
        >
          New Terminal
        </DropdownMenuItem>
        {profiles.map((profile) => (
          <React.Fragment key={profile.id}>
            <DropdownMenuSeparator className="bg-[#3c3c3c]" />
            <DropdownMenuItem
              className="text-[#d4d4d4] focus:bg-[#0e639c] focus:text-white"
              onSelect={() => onCreate(profile.id)}
            >
              {profile.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}

        {/* Agents IA : ouvre une nouvelle session déjà lancée sur l'agent. Le
            sous-menu part vers la droite, comme partout ailleurs. */}
        <DropdownMenuSeparator className="bg-[#3c3c3c]" />
        <DropdownMenuSub>
          {/* `data-[state=open]:bg-accent` vient du composant shadcn : même
              spécificité que `focus:bg-*` mais déclaré avant, il gagnait et
              rendait la ligne blanche sous-menu ouvert. On le neutralise aussi. */}
          <DropdownMenuSubTrigger className="gap-2 text-[#d4d4d4] focus:bg-[#0e639c] data-[state=open]:bg-[#0e639c]">
            <Sparkles className="h-3.5 w-3.5" />
            AI Agent
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-[180px] border-[#333] bg-[#252526] text-[#d4d4d4]">
            {AI_PROVIDERS.map((provider: AiProvider) => (
              <DropdownMenuItem
                key={provider.id}
                className="gap-2 text-[#d4d4d4] focus:bg-[#0e639c] focus:text-white"
                onSelect={() => onCreate(defaultShell, provider.command)}
              >
                <ProviderIcon provider={provider} />
                <span>{provider.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NewTerminalMenu;
