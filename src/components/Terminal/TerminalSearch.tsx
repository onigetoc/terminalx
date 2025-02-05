import { forwardRef, useEffect, useRef, useState, useImperativeHandle } from 'react';
import { Button } from "@/components/ui/button";
import { Search, ArrowUp, ArrowDown, X } from 'lucide-react';

export interface TerminalSearchRef {
  focus: () => void;
  removeAllHighlights: () => void;
}

interface TerminalSearchProps {
  isVisible: boolean;
  onClose: () => void;
  terminalRef: React.RefObject<HTMLDivElement>;
  history: Array<{ command: string; output: string; isLoading?: boolean }>;
}

interface SearchMatch {
  node: Node;
  index: number;
  length: number;
}

const TerminalSearch = forwardRef<TerminalSearchRef, TerminalSearchProps>(({ isVisible, onClose, terminalRef, history }, ref) => {
  const [searchText, setSearchText] = useState('');
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const matchesRef = useRef<SearchMatch[]>([]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    },
    removeAllHighlights: clearHighlights
  }));

  const clearHighlights = () => {
    const content = terminalRef.current;
    if (!content) return;

    const highlights = content.getElementsByClassName('search-highlight');
    while (highlights.length > 0) {
      const el = highlights[0];
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    }
  };

  const findMatches = () => {
    const content = terminalRef.current;
    if (!content || !searchText) return [];

    const matches: SearchMatch[] = [];
    const walker = document.createTreeWalker(
      content,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          let current = node.parentElement;
          while (current) {
            if (current.classList?.contains('terminal-command')) {
              return NodeFilter.FILTER_REJECT;
            }
            current = current.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent || '';
      let index = text.toLowerCase().indexOf(searchText.toLowerCase());

      while (index >= 0) {
        matches.push({ node, index, length: searchText.length });
        index = text.toLowerCase().indexOf(searchText.toLowerCase(), index + 1);
      }
    }

    return matches;
  };

  const scrollToCurrentMatch = (index: number = currentMatch) => {
    const highlights = Array.from(terminalRef.current?.getElementsByClassName('search-highlight') || []);
    if (highlights.length === 0) return;
    
    const current = highlights[index];
    if (current instanceof HTMLElement) {
      current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const highlightMatches = () => {
    clearHighlights();
    
    const matches = findMatches();
    matchesRef.current = matches;

    if (matches.length > 0) {
      [...matches].reverse().forEach((match, reversedIdx) => {
        const idx = matches.length - 1 - reversedIdx;
        const text = match.node.textContent || '';
        
        if (match.index < text.length && match.index + match.length <= text.length) {
          try {
            const range = document.createRange();
            const highlight = document.createElement('span');
            highlight.className = `search-highlight ${idx === currentMatch ? 'current' : ''}`;

            range.setStart(match.node, match.index);
            range.setEnd(match.node, match.index + match.length);
            range.surroundContents(highlight);
          } catch (error) {
            console.warn('Failed to highlight match:', error);
          }
        }
      });

      setTotalMatches(matches.length);
    } else {
      setTotalMatches(0);
      setCurrentMatch(0);
    }

    scrollToCurrentMatch();
  };

  // Focus quand l'input de recherche devient visible
  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, [isVisible]);

  // Gestion des raccourcis clavier pour la navigation dans les résultats
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ne traiter les événements que si l'input de recherche a le focus
    if (document.activeElement !== searchInputRef.current) return;

    // Empêcher la propagation au niveau natif
    e.nativeEvent.stopImmediatePropagation();
    e.stopPropagation();
    
    // Gérer les événements de navigation uniquement si nous avons des résultats
    if (totalMatches > 0) {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handlePrevious();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleNext();
          break;
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Mise à jour des résultats de recherche
  useEffect(() => {
    if (!searchText) {
      clearHighlights();
      setTotalMatches(0);
      setCurrentMatch(0);
      matchesRef.current = [];
    } else {
      highlightMatches();
    }
  }, [searchText, history]);

  // Défilement vers l'occurrence actuelle
  useEffect(() => {
    if (totalMatches > 0) {
      scrollToCurrentMatch();
    }
  }, [currentMatch, totalMatches]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      clearHighlights();
    };
  }, []);

  const handleNext = () => {
    if (totalMatches === 0) return;
    
    const nextMatch = (currentMatch + 1) % totalMatches;
    setCurrentMatch(nextMatch);

    const highlights = Array.from(terminalRef.current?.getElementsByClassName('search-highlight') || []);
    highlights.forEach((el, idx) => {
      el.classList.toggle('current', idx === nextMatch);
    });
  };

  const handlePrevious = () => {
    if (totalMatches === 0) return;
    
    const prevMatch = (currentMatch - 1 + totalMatches) % totalMatches;
    setCurrentMatch(prevMatch);

    const highlights = Array.from(terminalRef.current?.getElementsByClassName('search-highlight') || []);
    highlights.forEach((el, idx) => {
      el.classList.toggle('current', idx === prevMatch);
    });
  };

  if (!isVisible) return <></>;

  return (
    <div 
      className={`search-container absolute right-2 top-2 bg-[#252526] border border-[#383838] transition-opacity flex items-center p-2 shadow-lg z-50 mr-2 mt-20 ${isVisible ? 'visible' : 'invisible'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <Search className="w-4 h-4 text-gray-400 lucide mr-2" />
      <input
        ref={searchInputRef}
        type="text"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onKeyDown={handleSearchKeyDown}
        onKeyDownCapture={(e) => {
          if (e.ctrlKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        className="w-40 bg-transparent border-none rounded-xl text-[#d4d4d4] text-sm px-2 outline-none focus:outline-none placeholder-[#666] transition-opacity duration-200 opacity-100"
        placeholder="Find in terminal..."
      />
      <span className="text-[#8a8a8a] text-sm px-2">
        {totalMatches > 0 ? `${currentMatch + 1}/${totalMatches}` : '0/0'}
      </span>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-[#2a2d2e] rounded disabled:opacity-50"
          onClick={handlePrevious}
          disabled={totalMatches === 0}
        >
          <ArrowUp className="w-4 h-4 lucide" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-[#2a2d2e] rounded disabled:opacity-50"
          onClick={handleNext}
          disabled={totalMatches === 0}
        >
          <ArrowDown className="w-4 h-4 lucide" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-[#2a2d2e] rounded disabled:opacity-50"
          onClick={onClose}
        >
          <X className="w-4 h-4 lucide" />
        </Button>
      </div>
    </div>
  );
});

export default TerminalSearch;
