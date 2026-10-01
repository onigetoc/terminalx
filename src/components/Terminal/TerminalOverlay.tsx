import { createContext, useContext } from 'react';

/**
 * Hôte de portail pour les surfaces flottantes du terminal (dialogues).
 *
 * TerminalX est un composant qu'on dépose dans une page React existante : ses
 * fenêtres ne doivent donc jamais deborder sur la page qui l'héberge. Le
 * portail Radix par défaut envoie l'overlay dans `<body>`, en `position: fixed`
 * sur tout le viewport — c'est-à-dire par-dessus la démo et par-dessus le site
 * de celui qui intègre le terminal.
 *
 * On publie ici un `<div>` vide posé dans `.terminal-window`, qui est déjà en
 * `position: relative` + `overflow: hidden` (voir `styles/terminal.css`). Les
 * enfants portailisés sont en `absolute`, donc ils se positionnent et se
 * découpent sur la fenêtre du terminal, jamais sur la page.
 *
 * Le `<div>` reste non positionné (`static`) : c'est ce qui fait remonter la
 * résolution du `absolute` jusqu'à `.terminal-window` sans ajouter de couche.
 */
export const TerminalOverlayHostContext = createContext<HTMLElement | null>(null);

/** Élément dans lequel portaliser, ou `null` hors d'un `<Terminal />`. */
export function useTerminalOverlayHost(): HTMLElement | null {
  return useContext(TerminalOverlayHostContext);
}
