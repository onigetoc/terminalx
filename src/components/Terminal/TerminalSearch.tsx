import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Search, ArrowUp, ArrowDown, X } from 'lucide-react';
import { InteractiveTerminalHandle } from './InteractiveTerminal';

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
}

/**
 * Barre de recherche du terminal (Ctrl+F).
 *
 * La recherche est faite par `@xterm/addon-search` dans le buffer xterm :
 * ce composant ne gère que l'UI et l'affichage du compteur.
 */
const TerminalSearch = forwardRef<TerminalSearchRef, TerminalSearchProps>(
  ({ isVisible, onClose, terminalRef, matchCount }, ref) => {
    const [searchText, setSearchText] = useState('');
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
        // En fermant, on retire les surlignages du buffer.
        terminalRef.current?.clearSearch();
        return;
      }
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, [isVisible, terminalRef]);

    const runSearch = (text: string) => {
      setSearchText(text);
      if (!text) {
        terminalRef.current?.clearSearch();
        return;
      }
      // `incremental: true` étend la sélection courante quand le texte tapé
      // prolonge le terme, comme la recherche de VS Code.
      terminalRef.current?.search(text, 1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Tant que la barre est ouverte, les touches ne doivent pas atteindre le
      // shell (le textarea caché de xterm garde le focus au niveau document).
      e.nativeEvent.stopImmediatePropagation();

      if (e.key === 'Enter') {
        e.preventDefault();
        terminalRef.current?.search(searchText, e.shiftKey ? -1 : 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        terminalRef.current?.search(searchText, 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        terminalRef.current?.search(searchText, -1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    if (!isVisible) return null;

    const hasMatches = Boolean(searchText) && matchCount > 0;

    return (
      <div
        className="search-container absolute right-2 top-2 bg-[#252526] border border-[#383838] flex items-center p-2 shadow-lg z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <Search className="w-4 h-4 text-gray-400 lucide mr-2" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchText}
          onChange={(e) => runSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-40 bg-transparent border-none rounded-xl text-[#d4d4d4] text-sm px-2 outline-none focus:outline-none placeholder-[#666]"
          placeholder="Find in terminal..."
        />
        <span className="text-[#8a8a8a] text-sm px-2 tabular-nums">{matchCount}</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-1.5 disabled:opacity-50 text-gray-300 hover:text-gray-200 hover:bg-[#3e3e3e] rounded transition-colors"
            onClick={() => terminalRef.current?.search(searchText, -1)}
            disabled={!hasMatches}
            aria-label="Previous match"
          >
            <ArrowUp className="w-4 h-4 lucide" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-1.5 disabled:opacity-50 text-gray-300 hover:text-gray-200 hover:bg-[#3e3e3e] rounded transition-colors"
            onClick={() => terminalRef.current?.search(searchText, 1)}
            disabled={!hasMatches}
            aria-label="Next match"
          >
            <ArrowDown className="w-4 h-4 lucide" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-1.5 text-gray-300 hover:text-gray-200 hover:bg-[#3e3e3e] rounded transition-colors"
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
