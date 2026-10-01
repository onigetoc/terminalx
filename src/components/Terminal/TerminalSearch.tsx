import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUp, ArrowDown, X } from 'lucide-react';
import {
  InteractiveTerminalHandle,
  DEFAULT_SEARCH_OPTIONS,
  type TerminalSearchOptions
} from './InteractiveTerminal';

export interface TerminalSearchRef {
  focus: () => void;
  close: () => void;
}

interface TerminalSearchProps {
  isVisible: boolean;
  onClose: () => void;
  /** Session xterm dans laquelle chercher (surlignages gérés par l'addon). */
  terminalRef: React.RefObject<InteractiveTerminalHandle | null>;
  /** Occurrences trouvées, remontées par `@xterm/addon-search`. */
  matchCount: number;
  /** Index (0-based) de l'occurrence active, pour le « X of Y ». -1 = inconnu. */
  matchIndex?: number;
  /** Terme initial (sélection xterm au moment du Ctrl+F). */
  initialTerm?: string;
}

/**
 * Barre de recherche du terminal (Ctrl+F).
 *
 * La recherche est faite par `@xterm/addon-search` dans le buffer xterm :
 * ce composant ne gère que l'UI, les options (Match Case, Match Whole Word,
 * Use Regular Expression) et l'affichage du compteur « X of Y ».
 */
const TerminalSearch = forwardRef<TerminalSearchRef, TerminalSearchProps>(
  ({ isVisible, onClose, terminalRef, matchCount, matchIndex = -1, initialTerm }, ref) => {
    const [searchText, setSearchText] = useState('');
    const [options, setOptions] = useState<TerminalSearchOptions>(DEFAULT_SEARCH_OPTIONS);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      },
      close: onClose
    }));

    useEffect(() => {
      if (!isVisible) {
        // En fermant, on retire les surlignages du buffer et on rend les
        // options à leur état par défaut pour la prochaine ouverture. Le terme
        // saisi reste dans l'état local : il est réaffiché à la réouverture.
        terminalRef.current?.clearSearch();
        setOptions(DEFAULT_SEARCH_OPTIONS);
        return;
      }
      // Pré-remplissage uniquement quand une sélection xterm a été fournie :
      // sans sélection, on garde le terme précédent dans l'input (VS Code).
      if (initialTerm) {
        setSearchText(initialTerm);
      }
      // Focus + tout sélectionné : une frappe remplace le terme existant.
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, [isVisible, terminalRef, initialTerm]);

    const runSearch = (text: string, nextOptions = options) => {
      setSearchText(text);
      if (!text) {
        terminalRef.current?.clearSearch();
        return;
      }
      // `incremental: true` étend la sélection courante quand le texte tapé
      // prolonge le terme, comme la recherche de VS Code.
      terminalRef.current?.search(text, 1, nextOptions);
    };

    /** Une case cochée relance la recherche sur le terme courant. */
    const toggleOption = (key: keyof TerminalSearchOptions) => {
      const next = { ...options, [key]: !options[key] };
      setOptions(next);
      if (searchText) {
        terminalRef.current?.search(searchText, 1, next);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Tant que la barre est ouverte, les touches ne doivent pas atteindre le
      // shell (le textarea caché de xterm garde le focus au niveau document).
      e.nativeEvent.stopImmediatePropagation();

      // Ctrl+F alors que l'input a déjà le focus : on resélectionne le terme
      // courant, comme la barre de recherche de VS Code.
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.select();
        return;
      }

      // Raccourcis VS Code des cases de recherche : Alt+C, Alt+W et Alt+R.
      const toggles: Record<string, keyof TerminalSearchOptions> = {
        c: 'caseSensitive',
        w: 'wholeWord',
        r: 'regex'
      };
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const toggle = toggles[e.key.toLowerCase()];
        if (toggle) {
          e.preventDefault();
          toggleOption(toggle);
          return;
        }
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        terminalRef.current?.search(searchText, e.shiftKey ? -1 : 1, options);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        terminalRef.current?.search(searchText, 1, options);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        terminalRef.current?.search(searchText, -1, options);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    if (!isVisible) return null;

    const hasMatches = Boolean(searchText) && matchCount > 0;

    // « X of Y », sinon « No results » — jamais de vide, comme VS Code.
    const counter = hasMatches
      ? `${matchIndex >= 0 ? matchIndex + 1 : '?'} of ${matchCount}`
      : 'No results';

    const toggleClass = (active: boolean) =>
      `h-5 w-5 p-0 rounded-sm transition-colors ${
        active
          ? 'bg-[#0e639c] text-white hover:bg-[#1177bb]'
          : 'text-[#b5b5b5] hover:text-white hover:bg-[#3e3e3e]'
      }`;

    const tooltipStyle = "bg-[#252526] text-[#d4d4d4] border border-[#333] shadow-md";

    return (
      <div
        className="absolute right-[21px] top-2 bg-[#252526] border border-[#454545] flex items-center gap-1 px-2 py-1.5 rounded-md shadow-lg z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Champ de recherche : l'input et les trois cases vivent dans la même
            bordure, comme dans VS Code. Fond sombre aligné sur le terminal. */}
        <div className="flex items-center gap-0 bg-[#1e1e1e] border border-[#3c3c3c] rounded pl-3 pr-1 py-1 focus-within:border-[#0078d4]">
          <input
            ref={searchInputRef}
            type="text"
            value={searchText}
            onChange={(e) => runSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-44 bg-transparent border-none text-[#d4d4d4] text-sm px-1 py-0.5 outline-none focus:outline-none placeholder-[#8a8a8a]"
            placeholder="Find in terminal..."
          />
          <div className="flex items-center">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={toggleClass(options.caseSensitive)}
                  onClick={() => toggleOption('caseSensitive')}
                  aria-pressed={options.caseSensitive}
                  aria-label="Match Case"
                >
                  <span className="text-[10px] font-semibold leading-none">Aa</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className={tooltipStyle}>
                <p>Match Case (Alt+C)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={toggleClass(options.wholeWord)}
                  onClick={() => toggleOption('wholeWord')}
                  aria-pressed={options.wholeWord}
                  aria-label="Match Whole Word"
                >
                  <span className="text-[10px] font-semibold leading-none underline decoration-[1.5px] underline-offset-[3px]">ab</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className={tooltipStyle}>
                <p>Match Whole Word (Alt+W)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={toggleClass(options.regex)}
                  onClick={() => toggleOption('regex')}
                  aria-pressed={options.regex}
                  aria-label="Use Regular Expression"
                >
                  <span className="text-[10px] font-semibold leading-none">.*</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className={tooltipStyle}>
                <p>Use Regular Expression (Alt+R)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          </div>
        </div>
        {/* Compteur : largeur fixe pour que « X of Y » et « No results » ne
            décalent pas les flèches, `shrink-0` pour qu'il ne se fasse pas
            écraser par « No results », qui est plus large. */}
        <span className="shrink-0 text-[#8a8a8a] text-xs pl-2 pr-3 w-[84px] text-right whitespace-nowrap tabular-nums">
          {counter}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-1 disabled:opacity-40 text-[#b5b5b5] hover:text-white hover:bg-[#4a4a4a] rounded-sm transition-colors"
            onClick={() => terminalRef.current?.search(searchText, -1, options)}
            disabled={!hasMatches}
            aria-label="Previous match"
          >
            <ArrowUp className="w-4 h-4 lucide" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-1 disabled:opacity-40 text-[#b5b5b5] hover:text-white hover:bg-[#4a4a4a] rounded-sm transition-colors"
            onClick={() => terminalRef.current?.search(searchText, 1, options)}
            disabled={!hasMatches}
            aria-label="Next match"
          >
            <ArrowDown className="w-4 h-4 lucide" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-1 text-[#b5b5b5] hover:text-white hover:bg-[#4a4a4a] rounded-sm transition-colors"
            onClick={onClose}
            aria-label="Close search"
          >
            <X className="w-4 h-4 lucide" />
          </Button>
        </div>
      </div>
    );
  }
);

export default TerminalSearch;