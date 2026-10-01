import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Bot } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AI_PROVIDERS, type AiProvider } from './config/aiProviders';

/**
 * Marque d'un provider. Le path est dans le viewBox 24x24 de Lucide, donc il
 * se dimensionne exactement comme une icône Lucide : on ne passe que la classe
 * de taille, le remplissage vient du provider (ou du texte si absent).
 *
 * Pas de classe `lucide` ici : `terminal.css` force `1.2em` sur `.lucide`, ce
 * qui écraserait la taille du menu déroulant.
 */
export function ProviderIcon({
  provider,
  className = 'h-3.5 w-3.5'
}: {
  provider: AiProvider;
  className?: string;
}): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {provider.path && <path d={provider.path} fill={provider.fill ?? 'currentColor'} />}
    </svg>
  );
}



const TOOLTIP = 'bg-[#252526] text-[#d4d4d4] border border-[#333] shadow-md';

interface AgentMenuProps {
  /** Provider déjà choisi pour cette session ; absent = aucun. */
  selected: AiProvider | undefined;
  onSelect: (provider: AiProvider) => void;
}

/**
 * Choix de l'agent IA d'une session. L'icône de gauche de la corbeille est
 * neutre tant qu'aucun agent n'a été lancé, puis prend la marque de celui
 * choisi. Le menu s'ouvre sous l'icône : il ne bouge plus même près du bord
 * de la fenêtre, et `modal={false}` empêche Radix de poser `pointer-events:
 * none` sur le document — sans quoi le survol de la ligne disparaît et
 * l'icône avec lui.
 */
export function AgentMenu({ selected, onSelect }: AgentMenuProps): JSX.Element {
  const label = selected ? selected.label : 'Choose an AI agent';
  // Le tooltip et le menu ne peuvent pas être ouverts en même temps : le
  // tooltip se superpose aux entrées et vole le survol, ce qui faisait fermer
  // le menu dès qu'on descendait choisir un provider.
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    // <DropdownMenu> doit être l'ancêtre du <DropdownMenuTrigger> : c'est lui
    // qui fournit le contexte, <DropdownMenuContent> est portalisé de toute façon.
    // `modal={false}` empêche Radix de poser `pointer-events: none` sur le
    // document : sans ça le survol de la ligne disparaît et l'icône avec lui.
    <DropdownMenu
      modal={false}
      open={open}
      // Referme le tooltip dès que le menu s'ouvre : le tooltip est
      // positionné sur la gauche de l'icône, donc exactement au-dessus des
      // entrées. Il interceptait le survol et le menu se refermait dès que la
      // souris descendait vers un provider.
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setTooltipOpen(false);
      }}
    >
      <TooltipProvider delayDuration={300}>
        <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={label}
                // Le bouton ne doit JAMAIS sortir du flux : Radix garde une
                // référence sur le trigger pour calculer la position du menu, et
                // un `display:none` la détruit — le menu se refermait dès que la
                // souris quittait la ligne pour descendre vers les entrées.
                // On masque donc par opacité, et on force l'opacité pleine
                // quand le menu est ouvert ou qu'un agent est choisi.
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white ${
                  selected || open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                {selected ? <ProviderIcon provider={selected} /> : <Bot className="h-3.5 w-3.5" />}
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="left" className={TOOLTIP}>
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent
        side="bottom"
        align="end"
        // 0 : le seul écart restant est le `p-1` du content, que le pont
        // transparent ci-dessous recouvre. Avec un sideOffset, le curseur passait
        // dans une zone morte entre l'icône et le menu, et Radix le interpretait
        // comme une sortie du menu — il se refermait avant d'être atteint.
        sideOffset={0}
        // Sans ça, Radix réajuste le menu quand il heurte un bord du viewport :
        // le terminal étant ancré en bas de page, le menu partait se coller en
        // haut de la fenêtre du navigateur. Il doit rester sous son icône.
        avoidCollisions={false}
        className="z-[9999] min-w-[180px] border-[#333] bg-[#252526] text-[#d4d4d4]
                   before:absolute before:-top-2 before:left-0 before:right-0 before:h-2 before:content-['']"
      >
        {AI_PROVIDERS.map((provider) => (
          <DropdownMenuItem
            key={provider.id}
            className="gap-2 text-[#d4d4d4] focus:bg-[#0e639c] focus:text-white"
            onSelect={() => onSelect(provider)}
          >
            <ProviderIcon provider={provider} />
            <span>{provider.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AgentMenu;
