import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ShellKind } from './InteractiveTerminal';

/** Profils proposés par la flèche du menu, avec un séparateur avant PowerShell. */
const PROFILES: { id: ShellKind; label: string; separate?: boolean }[] = [
  { id: 'default', label: 'New Terminal' },
  { id: 'powershell', label: 'PowerShell', separate: true },
  { id: 'cmd', label: 'Command Prompt', separate: true }
];

const TOOLTIP = 'bg-[#252526] text-[#d4d4d4] border border-[#333] shadow-md';

interface NewTerminalMenuProps {
  onCreate: (shell: ShellKind) => void;
}

/**
 * Contrôle « nouveau terminal » façon VS Code : un seul bloc visuel, sans
 * l'écart de 8px qui sépare les autres icônes.
 *
 * La partie `+` crée une session avec le shell par défaut (PowerShell sous
 * Windows, ou INTERACTIVE_SHELL) ; la petite flèche, juste à côté et sans
 * espace, ouvre la liste des profils.
 */
export function NewTerminalMenu({ onCreate }: NewTerminalMenuProps): JSX.Element {
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
                onClick={() => onCreate('default')}
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
        {PROFILES.map((profile) => (
          <React.Fragment key={profile.id}>
            {profile.separate && <DropdownMenuSeparator className="bg-[#3c3c3c]" />}
            <DropdownMenuItem
              className="text-[#d4d4d4] focus:bg-[#0e639c] focus:text-white"
              onSelect={() => onCreate(profile.id)}
            >
              {profile.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NewTerminalMenu;
