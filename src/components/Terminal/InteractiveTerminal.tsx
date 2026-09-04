import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { ImageAddon } from '@xterm/addon-image';
import '@xterm/xterm/css/xterm.css';
import { getServerUrl } from './config/serverConfig';
import { terminalConfig } from './config/terminalConfig';
import './styles/terminal.css';

interface InteractiveTerminalProps {
  /** Répertoire de départ de la session interactive. */
  currentDirectory?: string;
  className?: string;
}

/**
 * Terminal interactif basé sur xterm.js + un pseudo-terminal côté serveur.
 *
 * Contrairement au terminal "faux" (liste d'historique), ce composant rend la
 * sortie ANSI en temps réel et renvoie les frappes clavier au shell, ce qui
 * permet de faire tourner des CLIs plein écran comme `claude`, `opencode`,
 * `vim`, `htop`, `nano`, etc.
 */
export function InteractiveTerminal({ currentDirectory, className = '' }: InteractiveTerminalProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  // On garde la valeur à jour dans une ref pour être utilisée à l'ouverture
  // de la WebSocket sans dépendance d'effet (et sans avertissement ESLint).
  const cwdRef = useRef(currentDirectory);
  cwdRef.current = currentDirectory;

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

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
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
      const key = event.key.toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;

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

    const fit = () => {
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
              cwd: cwdRef.current
            });
          };

          socket.onmessage = (event) => {
            if (disposed) return;
            let msg: { type: string; data?: string; message?: string; code?: number };
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
                term.focus();
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

    const dataDisposable = term.onData((data) => send({ type: 'input', data }));
    const resizeDisposable = term.onResize(({ cols, rows }) => send({ type: 'resize', cols, rows }));

    const resizeObserver = new ResizeObserver(() => fit());
    resizeObserver.observe(container);

    // Ajuste la taille initiale puis ouvre la session.
    fit();
    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      container.removeEventListener('contextmenu', handleContextMenu);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('drop', handleDrop);
      dataDisposable.dispose();
      resizeDisposable.dispose();
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

  return <div ref={containerRef} className={className || 'interactive-terminal'} />;
}

export default InteractiveTerminal;
