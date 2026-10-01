import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { ImageAddon } from '@xterm/addon-image';
import { SearchAddon, type ISearchOptions } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import { getServerUrl } from './config/serverConfig';
import { terminalConfig } from './config/terminalConfig';
import { resolveDirectoryCommand, formatPath, toNativePath } from './utils/directoryUtils';
import { detectOsKind } from './config/shellProfiles';
import './styles/terminal.css';

export type ShellKind = 'default' | 'powershell' | 'cmd' | 'bash' | 'zsh';

export interface InteractiveTerminalProps {
  /** Répertoire de départ de la session interactive. */
  currentDirectory?: string;
  /** Shell demandé au serveur. 'default' suit la config serveur. */
  shell?: ShellKind;
  className?: string;
  /**
   * Rappelé quand le processus au premier plan change. Le nom du processus
   * vivant remplace celui du shell ; `null` signifie « plus rien ne tourne » et
   * fait revenir au nom du shell.
   */
  onTitleChange?: (title: string | null) => void;
  /** Rappelé quand le répertoire courant de la session change (`cd`, spawn). */
  onDirectoryChange?: (directory: string) => void;
  /**
   * false = session en arrière-plan. Le composant reste monté (le PTY, le
   * buffer et le défilement survivent) mais son conteneur est masqué par le
   * parent ; le passage à true déclenche un refit + focus, car xterm ne peut
   * pas mesurer un conteneur `display: none`.
   */
  visible?: boolean;
  /**
   * Notifie le parent du nombre d'occurrences trouvées par la recherche et de
   * l'index (0-based) de l'occurrence active, pour le « X of Y ». `index` vaut
   * -1 quand le nombre de correspondances dépasse la limite de surlignage.
   */
  onMatchCount?: (count: number, index: number) => void;
  /**
   * Commande à exécuter une fois le shell prêt. Permet de créer une session
   * déjà lancée sur un agent : au montage le PTY n'existe pas encore, la
   * commande ne peut pas partir avant le `ready` du serveur.
   */
  pendingCommand?: string;
  /**
   * Rappelé une fois la `pendingCommand` injectée, pour que le parent la vide.
   * Indispensable : sans ça, un `ready` de reconnexion relancerait l'agent.
   */
  onCommandConsumed?: () => void;
  /**
   * Le parent demande l'ouverture de la recherche (Ctrl+F). Il faut le
   * capacitor ici : sur un écouteur `document` en phase bubble, xterm a déjà
   * envoyé la frappe au shell et le terminal affiche `^F`.
   */
  onSearchRequest?: () => void;
}

/**
 * Surface exposée au parent : tout ce que la toolbar de la fenêtre (effacer,
 * help, about, recherche) doit pouvoir faire sur la session xterm.
 */
export interface InteractiveTerminalHandle {
  /** Vide le buffer (bouton Clear). */
  clear: () => void;
  /** Écrit un message localement, sans passer par le shell. */
  write: (data: string) => void;
  focus: () => void;
  /** Cherche l'occurrence suivante (1) ou précédente (-1) dans le buffer. */
  search: (term: string, direction: 1 | -1, options?: TerminalSearchOptions) => void;
  /** Retire les surlignages de recherche. */
  clearSearch: () => void;
  /**
   * Tape une commande au prompt et valide la ligne. Passe par `{type:'input'}`
   * et non par `term.paste()` : le bracketed paste est fait pour lescollages
   * utilisateur et ne submit pas la ligne.
   */
  runCommand: (command: string) => void;
  /** Texte actuellement sélectionné, à pré-remplir dans la barre de recherche. */
  getSelection: () => string;
}

/** Options de recherche exposées au parent (les trois cases de VS Code). */
export interface TerminalSearchOptions {
  /** Match Case : comparaison sensible à la casse. */
  caseSensitive: boolean;
  /** Match Whole Word : le terme doit être un mot entier. */
  wholeWord: boolean;
  /** Use Regular Expression : le terme est une regex. */
  regex: boolean;
}

/** Options par défaut : comme VS Code, la recherche est insensible à la casse. */
export const DEFAULT_SEARCH_OPTIONS: TerminalSearchOptions = {
  caseSensitive: false,
  wholeWord: false,
  regex: false
};

// Surlignages alignés sur le thème du terminal (comme VS Code) : gris pour les
// occurrences, ambre pour celle qui est active.
const SEARCH_DECORATIONS: NonNullable<ISearchOptions['decorations']> = {
  matchBackground: '#3a3d41',
  matchOverviewRuler: '#3a3d41',
  activeMatchBackground: '#b8860b',
  activeMatchColorOverviewRuler: '#b8860b'
};

/**
 * Fusionne les cases cochées avec les decorations fixes. `onDidChangeResults`
 * n'est émis que si `decorations` est présent : il alimente le compteur « X of Y ».
 */
function buildSearchOptions(options: TerminalSearchOptions): ISearchOptions {
  return {
    incremental: true,
    caseSensitive: options.caseSensitive,
    wholeWord: options.wholeWord,
    regex: options.regex,
    decorations: SEARCH_DECORATIONS
  };
}

/**
 * Commandes internes du shell : elles ne lancent aucun processus, donc elles
 * ne doivent JAMAIS renommer la session (contrairement à `node`, `bun`,
 * `opencode`…). Filet de sécurité client, en plus de la détection serveur.
 */
const SHELL_BUILTINS = new Set([
  'cd', 'chdir', 'sl', 'set-location', 'pushd', 'popd',
  'dir', 'ls', 'gci', 'pwd', 'echo', 'cls', 'clear', 'help', 'history',
  'set', 'export', 'alias', 'type', 'where', 'which'
]);

/**
 * Décode la charge OSC 7 émise par le shell (`file://hote/chemin`) : c'est le
 * vrai répertoire courant du shell. Il remplace la devinette basée sur le `cd`
 * tapé, qui se désynchronisait et pouvait produire un chemin inexistant.
 *
 * Renvoie `null` si la charge n'est pas exploitable ; le handler OSC doit
 * toujours consommer la séquence pour ne pas la laisser s'afficher.
 */
function parseOsc7(data: string): string | null {
  const match = /^file:\/\/[^/]*(\/.*)$/.exec(data);
  if (!match) return null;
  let path = match[1];
  try {
    path = decodeURIComponent(path);
  } catch {
    /* laisse le chemin brut si l'encodage est invalide */
  }
  // Windows : file://hote/C:/Users/... → C:/Users/...
  if (/^\/[a-zA-Z]:\//.test(path)) path = path.slice(1);
  return path.replace(/\\/g, '/');
}

/**
 * Terminal interactif basé sur xterm.js + un pseudo-terminal côté serveur.
 *
 * Ce composant rend la sortie ANSI en temps réel et renvoie les frappes
 * clavier au shell, ce qui permet de faire tourner des CLIs plein écran
 * comme `claude`, `opencode`, `vim`, `htop`, `nano`, etc.
 */
export const InteractiveTerminal = forwardRef<InteractiveTerminalHandle, InteractiveTerminalProps>(
  function InteractiveTerminal(
    {
      currentDirectory,
      shell = 'default',
      className = '',
      visible = true,
      onMatchCount,
      onSearchRequest,
      pendingCommand,
      onCommandConsumed,
      onTitleChange,
      onDirectoryChange
    },
    ref
  ) {
  const containerRef = useRef<HTMLDivElement>(null);
  // On garde la valeur à jour dans une ref pour être utilisée à l'ouverture
  // de la WebSocket sans dépendance d'effet (et sans avertissement ESLint).
  const cwdRef = useRef(currentDirectory);
  cwdRef.current = currentDirectory;
  const shellRef = useRef(shell);
  shellRef.current = shell;
  // fit() est défini dans l'effet de montage ; cet effet externe en a besoin
  // pour refaire le fit au retour en vue.
  const fitRef = useRef<() => void>(() => {});
  // Lu à chaque frappe, sans redéclencher d'effet.
  const onTitleChangeRef = useRef(onTitleChange);
  onTitleChangeRef.current = onTitleChange;
  // Lu à chaque frappe, sans redéclencher d'effet.
  const onDirectoryChangeRef = useRef(onDirectoryChange);
  onDirectoryChangeRef.current = onDirectoryChange;
  // Instance xterm exposée au parent (clear/write/search) : elle n'existe
  // qu'après le montage, d'où la ref objet.
  const termRef = useRef<XTerm | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  // `send` est défini dans l'effet de montage ; cette ref le rend atteignable
  // depuis `useImperativeHandle` (runCommand).
  const runCommandRef = useRef<(command: string) => void>(() => {});
  // Commande demandée à la naissance de la session : consommée au premier
  // `ready` puis vidée, pour ne pas relancer l'agent à chaque reconnexion.
  const pendingCommandRef = useRef(pendingCommand);
  pendingCommandRef.current = pendingCommand;
  const onCommandConsumedRef = useRef(onCommandConsumed);
  onCommandConsumedRef.current = onCommandConsumed;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cfg = terminalConfig.get();

    const term = new XTerm({
      convertEol: false,
      cursorBlink: true,
      fontFamily: cfg.fontFamily || 'monospace',
      fontSize: cfg.fontSize || 14,
      scrollback: cfg.scrollbackLimit || 1000,
      allowProposedApi: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        cursorAccent: '#1e1e1e',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#3b8eea',
        magenta: '#ce51ce',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff'
      }
    });

    termRef.current = term;

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Recherche dans le buffer (remplace l'ancienne recherche DOM qui ne
    // pouvait cibler que l'historique en texte du terminal simulé).
    const searchAddon = new SearchAddon();
    searchRef.current = searchAddon;
    term.loadAddon(searchAddon);
    // `onDidChangeResults` n'est émis qu'avec les decorations activées.
    // `resultIndex` vaut -1 quand le nombre de correspondances dépasse la
    // limite de surlignage : on ne compte que dans ce cas.
    const resultsDisposable = searchAddon.onDidChangeResults(({ resultIndex, resultCount }) => {
      onMatchCount?.(resultIndex === -1 ? 0 : resultCount, resultIndex);
    });
    // Affichage d'images inline (Sixel + protocole iTerm IIP), comme le
    // terminal intégré de VS Code : les outils CLI (opencode, etc.) qui
    // émettent ces séquences voient leurs images rendues sur un canvas.
    const imageAddon = new ImageAddon({
      enableSizeReports: true,
      pixelLimit: 16777216,
      sixelSupport: true,
      sixelScrolling: true,
      sixelPaletteLimit: 256,
      sixelSizeLimit: 25000000,
      storageLimit: 128,
      showPlaceholder: true,
      iipSupport: true,
      iipSizeLimit: 20000000
    });
    term.loadAddon(imageAddon);
    term.open(container);

    // Le shell émet OSC 7 à chaque prompt (voir la surcharge de `prompt` côté
    // serveur) : c'est le vrai cwd, la seule source de vérité. Dès le premier
    // OSC reçu, on cesse de deviner d'après le `cd` tapé — cette devinette
    // pouvait afficher un chemin faux (ex. `C:/terminalx2`).
    let osc7Seen = false;
    const osc7Handler = term.parser.registerOscHandler(7, (data) => {
      const directory = parseOsc7(data);
      if (!directory) return true;
      osc7Seen = true;
      console.info('[terminal-cwd] OSC7 ->', directory);
      onDirectoryChangeRef.current?.(directory);
      return true;
    });

    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const send = (msg: unknown) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(msg));
      }
    };

    // --- Copier-coller style VS Code -------------------------------------
    // Ctrl+C (ou Cmd+C) avec sélection => copie, sans envoyer ^C au backend.
    // Ctrl+C sans sélection => laisse passer (SIGINT, comportement normal).
    // Ctrl+V (ou Cmd+V) => colle le presse-papiers dans le PTY.
    const fallbackCopy = (text: string) => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        /* ignore */
      }
    };

    const copySelectionToClipboard = (selection: string) => {
      if (!selection) return;
      try {
        const done = navigator.clipboard?.writeText(selection);
        // writeText retourne une promesse : on ignore l'échec (contexte non
        // sécurisé, permission refusée) pour ne jamais casser la frappe.
        if (done && typeof (done as Promise<void>).catch === 'function') {
          (done as Promise<void>).catch(() => {
            fallbackCopy(selection);
          });
        }
      } catch {
        fallbackCopy(selection);
      }
    };

    const quoteShellPath = (p: string) => {
      const escaped = p.replace(/"/g, '\\"');
      return /\s/.test(p) ? `"${escaped}"` : escaped;
    };

    const readFileAsBase64 = (file: File | Blob): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          // data:<mime>;base64,XXXX — on ne garde que la partie base64.
          const comma = result.indexOf(',');
          resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

    // Envoie du texte au PTY en passant par term.paste() : xterm entoure le
    // contenu de \x1b[200~ … \x1b[201~ quand l'app a activé le bracketed paste
    // (mode 2004, cas de claude/opencode/pi). Sans ça, le texte arrive comme
    // des frappes brutes et les TUI l'interprètent mal (lignes exécutées
    // une par une, pas de placeholder "[pasted N lines]").
    const pasteInput = (text: string) => {
      try {
        term.paste(text);
      } catch {
        send({ type: 'input', data: text });
      }
      term.focus();
    };

    // Envoie un fichier (image glissée-déposée ou collée) au serveur, qui le
    // stocke en temporaire et renvoie un chemin absolu. On colle ce chemin
    // dans le PTY, comme VS Code qui insère le chemin du fichier droppé :
    // opencode/claude/pi peut ensuite lire l'image via ce chemin.
    const uploadFileAndInsertPath = async (file: File | Blob, fallbackName: string) => {
      try {
        const name = (file as File).name || fallbackName;
        const dataBase64 = await readFileAsBase64(file);
        const base = await getServerUrl();
        const res = await fetch(`${base}/pty/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: name, dataBase64 })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { path?: string };
        if (!json.path) throw new Error('réponse sans path');
        pasteInput(quoteShellPath(json.path) + ' ');
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error('[terminal] upload failed:', detail);
        term.write(`\r\n\x1b[31m[drop/paste: upload échoué (${detail}) — redémarre le serveur (npm run dev)]\x1b[0m\r\n`);
      } finally {
        term.focus();
      }
    };

    const pasteImageFromClipboard = async (): Promise<boolean> => {
      try {
        const clipboard = navigator.clipboard as Navigator['clipboard'] & {
          read?: () => Promise<ClipboardItem[]>;
        };
        if (typeof clipboard.read !== 'function') return false;
        const items = await clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const ext = imageType.split('/')[1] || 'png';
            await uploadFileAndInsertPath(blob, `pasted-image.${ext}`);
            return true;
          }
        }
        return false;
      } catch {
        return false;
      }
    };

    const pasteFromClipboard = () => {
      try {
        const read = navigator.clipboard?.readText?.();
        if (read && typeof read.then === 'function') {
          read
            .then(async (text) => {
              if (text) {
                pasteInput(text);
              } else {
                // Pas de texte : c'est peut-être une image (screenshot).
                const handled = await pasteImageFromClipboard();
                if (!handled) term.focus();
              }
            })
            .catch(async () => {
              const handled = await pasteImageFromClipboard();
              if (!handled) term.focus();
            });
        } else {
          term.focus();
        }
      } catch {
        term.focus();
      }
    };

    term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      // ⚠️ xterm appelle ce handler sur 'keydown', 'keyup' ET 'keypress'
      // (CoreBrowserTerminal._keyDown/_keyUp/_keyPress). Sans ce filtre,
      // Ctrl+V collerait deux fois : une au keydown, une au keyup (au
      // relâchement de la touche, ctrlKey est toujours vrai et key === 'v').
      // On n'agit donc que sur le keydown ; les autres événements laissent
      // xterm faire son traitement normal.
      if (event.type !== 'keydown') return true;

      const key = event.key.toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;

      // Recherche : Ctrl+F / Cmd+F ouvre la barre de recherche xterm.
      // OnCourt-circuite ici (et pas sur `document`) pour que la frappe
      // n'atteigne jamais le shell — sinon le terminal affiche `^F`.
      // Ctrl+Shift+F reste envoyé au shell (usage unix : reverse search).
      if (ctrlOrMeta && !event.altKey && !event.shiftKey && key === 'f') {
        event.preventDefault();
        event.stopPropagation();
        onSearchRequest?.();
        return false;
      }

      // Copie : Ctrl+C / Cmd+C uniquement si du texte est sélectionné.
      // Sans sélection on retourne true pour envoyer ^C (SIGINT) au shell.
      if (ctrlOrMeta && !event.altKey && key === 'c' && !event.shiftKey) {
        if (term.hasSelection()) {
          event.preventDefault();
          event.stopPropagation();
          copySelectionToClipboard(term.getSelection());
          term.clearSelection();
          term.focus();
          return false;
        }
        return true;
      }

      // Copie explicite : Ctrl+Shift+C / Ctrl+Insert (comme VS Code).
      if (
        (ctrlOrMeta && event.shiftKey && key === 'c') ||
        (event.ctrlKey && event.key === 'Insert')
      ) {
        if (term.hasSelection()) {
          event.preventDefault();
          event.stopPropagation();
          copySelectionToClipboard(term.getSelection());
          term.clearSelection();
          term.focus();
        }
        return false;
      }

      // Coller : Ctrl+V / Cmd+V / Ctrl+Shift+V / Shift+Insert.
      if (
        (ctrlOrMeta && !event.altKey && key === 'v') ||
        (!ctrlOrMeta && event.shiftKey && event.key === 'Insert')
      ) {
        event.preventDefault();
        event.stopPropagation();
        pasteFromClipboard();
        return false;
      }

      return true;
    });

    // Clic droit style VS Code : avec sélection => copier, sinon => coller.
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      if (term.hasSelection()) {
        copySelectionToClipboard(term.getSelection());
        term.clearSelection();
        term.focus();
      } else {
        pasteFromClipboard();
      }
    };
    // xterm rend son DOM dans le container : on écoute sur le container
    // pour couvrir toutes les couches internes.
    container.addEventListener('contextmenu', handleContextMenu);

    // Glisser-déposer style VS Code : dropper un/plusieurs fichiers insère
    // leur chemin (quoté) dans le PTY ; dropper du texte l'envoie tel quel.
    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      container.classList.add('terminal-drop-active');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };
    const handleDragLeave = (event: DragEvent) => {
      event.preventDefault();
      container.classList.remove('terminal-drop-active');
    };
    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      container.classList.remove('terminal-drop-active');
      const transfer = event.dataTransfer;
      if (!transfer) return;
      if (transfer.files && transfer.files.length > 0) {
        // Navigateur => pas de vrai chemin disque : upload + insertion du
        // chemin temporaire retourné par le serveur.
        Array.from(transfer.files).forEach((file, i) => {
          void uploadFileAndInsertPath(file, `dropped-file-${i}`);
        });
      } else {
        const text =
          transfer.getData('text/plain') || transfer.getData('text/uri-list');
        if (text) pasteInput(text);
        else term.focus();
      }
    };
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);

    // Blocage du défilement en chaîne : xterm gère la molette en JS, et quand le
    // viewport est déjà en buté, l'événement natif remonte jusqu'à la page hôte
    // et la fait défiler. On annule donc la molette uniquement à la frontière
    // (haute ou basse) du buffer ; au milieu, on laisse xterm défiler.
    const xtermViewport = container.querySelector<HTMLElement>('.xterm-viewport');
    const handleWheel = (event: WheelEvent) => {
      const viewport = xtermViewport;
      if (!viewport || event.deltaY === 0) return;
      const atTop = viewport.scrollTop <= 0;
      const atBottom =
        viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1;
      if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });

    const fit = () => {
      // xterm ne peut pas calculer de dimensions sur un conteneur masqué
      // (`display: none` => 0x0) et `fit()` lève dans ce cas. On ignore : le
      // ResizeObserver ou le passage de `visible` à true referont le fit quand
      // la session redevient visible.
      if (container.clientWidth === 0 || container.clientHeight === 0) return;
      try {
        fitAddon.fit();
      } catch {
        /* ignore */
      }
    };

    const connect = () => {
      getServerUrl()
        .then((base) => {
          if (disposed) return;
          const url = `${base.replace(/^http/, 'ws')}/ws/pty`;
          socket = new WebSocket(url);

          socket.onopen = () => {
            if (disposed) return;
            fit();
            // Demander au serveur de lancer le shell dans le PTY, avec la
            // taille courante du terminal et le répertoire de départ.
            send({
              type: 'spawn',
              cols: term.cols,
              rows: term.rows,
              // node-pty est strict sur les séparateurs : on renvoie le chemin
              // dans la syntaxe du serveur, pas la forme normalisée pour
              // l'affichage. Sinon le spawn échoue en 267 et la session retombe
              // sur le dossier par défaut du serveur.
              cwd: toNativePath(cwdRef.current, detectOsKind()) || undefined,
              shell: shellRef.current
            });
          };

          socket.onmessage = (event) => {
            if (disposed) return;
            let msg: { type: string; data?: string; message?: string; code?: number; running?: boolean; cwd?: string };
            try {
              msg = JSON.parse(String(event.data));
            } catch {
              return;
            }

            switch (msg.type) {
              case 'output':
                term.write(msg.data || '');
                break;
              case 'ready':
                fit();
                // Répertoire réel du shell qui vient d'être lancé : c'est la
                // source de vérité, elle corrige un éventuel décalage avec le
                // dossier par défaut du serveur.
                if (msg.cwd) onDirectoryChangeRef.current?.(formatPath(msg.cwd));
                // Une session peut être ouverte en arrière-plan (le menu « + »
                // crée la nouvelle session déjà active, mais un `ready` peut
                // arriver après un changement) : ne voler le focus que si on
                // est visibles.
                if (container.clientWidth > 0) term.focus();
                // Commande d'attente (session créée sur un agent) : le shell
                // existe maintenant, on peut la taper.
                if (pendingCommandRef.current) {
                  const command = pendingCommandRef.current;
                  pendingCommandRef.current = '';
                  runCommandRef.current(command);
                  onCommandConsumedRef.current?.();
                }
                break;
              case 'running':
                // Le serveur a trouvé (ou perdu) un processus enfant du shell :
                // c'est ce qui décide du nom affiché.
                running = Boolean(msg.running);
                if (!running) pendingCommand = null;
                syncTitle();
                break;
              case 'exit':
                term.write('\r\n\x1b[90m[process exited]\x1b[0m\r\n');
                break;
              case 'error':
                term.write(`\r\n\x1b[31mError: ${msg.message}\x1b[0m\r\n`);
                break;
              default:
                break;
            }
          };

          socket.onclose = () => {
            if (disposed) return;
            if (!reconnectTimer) {
              reconnectTimer = setTimeout(connect, 1500);
            }
          };

          socket.onerror = () => {
            // onclose suit et déclenchera la reconnexion.
          };
        })
        .catch(() => {
          if (disposed) return;
          if (!reconnectTimer) {
            reconnectTimer = setTimeout(connect, 1500);
          }
        });
    };

    // Le nom vient du *signal de vie* renvoyé par le serveur (un processus
    // enfant du shell existe-t-il ?), pas du texte tapé : c'est exactement le
    // critère de VS Code. Seules les commandes qui lancent un vrai processus
    // renomment la session (`claude`, `codex`, `pi`, `bun run dev`…), les
    // builtins comme `echo` ou `help` non — ils ne spawnent aucun enfant. Le
    // libellé est le premier mot de la ligne (`bun run dev` => `bun`).
    let lineBuffer = '';
    let pendingCommand: string | null = null;
    let running = false;
    const syncTitle = () => {
      if (running && pendingCommand) {
        onTitleChangeRef.current?.(pendingCommand);
      } else if (!running) {
        onTitleChangeRef.current?.(null);
      }
    };
    const trackTitle = (input: string) => {
      // `onData` peut livrer plusieurs caractères d'un coup (collage — parfois
      // enveloppé par le bracketed paste `\x1b[200~ … \x1b[201~`). On retire les
      // séquences d'échappement puis on traite caractère par caractère, comme
      // une frappe au clavier.
      const cleaned = input
        .replace(/\x1b\[[0-9;?]*[A-Za-z~]/g, '')
        .replace(/\x1b./g, '');
      for (const data of cleaned) {
        if (data === '\r' || data === '\n') {
          const command = lineBuffer.replace(/\s+/g, ' ').trim();
          lineBuffer = '';
          if (command) {
            console.info('[terminal-input]', JSON.stringify(command), 'running:', running, 'osc7Seen:', osc7Seen);
            // Un `cd` change le répertoire courant de cette session : on le
            // résout pour le pied de page. Seulement au prompt (pas dans un TUI,
            // où la ligne tapée n'est pas une commande shell) et seulement si le
            // shell n'annonce pas déjà son vrai cwd via OSC 7 (PowerShell).
            if (!running && !osc7Seen) {
              const nextDir = resolveDirectoryCommand(command, cwdRef.current || '');
              if (nextDir) {
                console.info('[terminal-cwd] typed cd ->', nextDir, '| base:', cwdRef.current);
                onDirectoryChangeRef.current?.(nextDir);
              }
            }
            // On demande au serveur de regarder. `syncTitle` est rappelé par la
            // réponse `running`, donc inutile de l'appeler ici. Un builtin
            // (`cd`, `dir`…) ne renomme pas : `pendingCommand` reste `null`
            // jusqu'à ce que le serveur confirme un vrai processus.
            const firstWord = command.split(' ')[0];
            pendingCommand = SHELL_BUILTINS.has(firstWord.toLowerCase()) ? null : firstWord;
            send({ type: 'watch' });
          }
          continue;
        }
        if (data === '\x7f') {
          // Effacement arrière.
          lineBuffer = lineBuffer.slice(0, -1);
          continue;
        }
        if (data === '\x03' || data === '\x15') {
          // Ctrl+C et Ctrl+U abandonnent la ligne en cours.
          lineBuffer = '';
          continue;
        }
        // Uniquement les caractères imprimables : les séquences d'échappement
        // ne doivent pas polluer le nom.
        if (data >= ' ') lineBuffer += data;
      }
    };

    // Lance un agent CLI (ou n'importe quelle commande) comme si l'utilisateur
    // l'avait tapée : on passe par `trackTitle` pour que le nom de la session
    // suive, et `watch` pour que le serveur confirme le processus enfant.
    runCommandRef.current = (command: string) => {
      send({ type: 'input', data: `${command}\r` });
      trackTitle(`${command}\r`);
      term.focus();
    };

    const dataDisposable = term.onData((data) => {
      send({ type: 'input', data });
      trackTitle(data);
    });
    const resizeDisposable = term.onResize(({ cols, rows }) => send({ type: 'resize', cols, rows }));

    const resizeObserver = new ResizeObserver(() => fit());
    resizeObserver.observe(container);

    // Ajuste la taille initiale puis ouvre la session.
    fit();
    connect();
    fitRef.current = fit;

    return () => {
      disposed = true;
      termRef.current = null;
      searchRef.current = null;
      runCommandRef.current = () => {};
        fitRef.current = () => {};
      if (reconnectTimer) clearTimeout(reconnectTimer);
      container.removeEventListener('contextmenu', handleContextMenu);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('drop', handleDrop);
      container.removeEventListener('wheel', handleWheel);
      dataDisposable.dispose();
      resizeDisposable.dispose();
      resultsDisposable.dispose();
      osc7Handler.dispose();
      resizeObserver.disconnect();
      try {
        imageAddon.dispose();
      } catch {
        /* ignore */
      }
      if (socket && socket.readyState === WebSocket.OPEN) {
        // On envoie un kill pour que le shell côté serveur soit nettoyé.
        try {
          socket.send(JSON.stringify({ type: 'kill' }));
        } catch {
          /* ignore */
        }
        socket.close();
      }
      socket = null;
      try {
        term.dispose();
      } catch {
        /* ignore */
      }
    };
  }, []);

  // Retour en vue : le conteneur vient de redevenir mesurable, on refit et on
  // donne le focus. `requestAnimationFrame` laisse le navigateur appliquer la
  // visibilité avant la mesure.
  useEffect(() => {
    if (!visible) return;
    const raf = requestAnimationFrame(() => {
      fitRef.current();
      termRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  useImperativeHandle(ref, () => ({
    clear: () => termRef.current?.clear(),
    write: (data: string) => termRef.current?.write(data),
    focus: () => termRef.current?.focus(),
    search: (searchTerm: string, direction: 1 | -1, options?: TerminalSearchOptions) => {
      const addon = searchRef.current;
      if (!addon || !searchTerm) return;
      const searchOptions = buildSearchOptions(options ?? DEFAULT_SEARCH_OPTIONS);
      if (direction === -1) {
        addon.findPrevious(searchTerm, searchOptions);
      } else {
        addon.findNext(searchTerm, searchOptions);
      }
    },
    clearSearch: () => searchRef.current?.clearDecorations(),
    getSelection: () => termRef.current?.getSelection() ?? '',
    runCommand: (command: string) => runCommandRef.current(command)
  }), []);

  return <div ref={containerRef} className={className || 'interactive-terminal'} />;
});

export default InteractiveTerminal;
