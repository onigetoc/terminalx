import { WebSocketServer, WebSocket, type RawData } from 'ws';
import type { Server as HttpServer } from 'http';
import * as pty from 'node-pty';
import { getCurrentDirectory } from './commandService';

/**
 * Serveur de pseudo-terminal (PTY) pour les CLIs interactives
 * (Claude, OpenCode, vim, htop, nano, etc.).
 *
 * Il remplace le modèle "une commande / une réponse" (qui ne peut pas
 * recevoir de clavier et qui bufferise la sortie jusqu'à la fin du process)
 * par une vraie session terminal persistante, avec streaming temps réel.
 *
 * Protocole WebSocket (JSON) :
 *   Client -> Serveur :
 *     { type: 'spawn', cols, rows, cwd? }   // lancer le shell dans un PTY
 *     { type: 'input', data }               // frappes clavier vers le shell
 *     { type: 'resize', cols, rows }        // redimensionnement
 *     { type: 'kill' }                      // tuer la session
 *   Serveur -> Client :
 *     { type: 'ready', cwd, pid }
 *     { type: 'output', data }              // sortie du shell (ANSI)
 *     { type: 'exit', code }
 *     { type: 'error', message }
 */

export interface PtyMessage {
  type: string;
  data?: string;
  cols?: number;
  rows?: number;
  cwd?: string;
  code?: number | null;
  message?: string;
  pid?: number;
}

interface ShellDefinition {
  shell: string;
  args: string[];
}

/** Choisit un shell adapté à la plateforme. Surchargeable via INTERACTIVE_SHELL. */
function resolveShell(): ShellDefinition {
  if (process.platform === 'win32') {
    // PowerShell est plus confortable qu'un cmd.exe brut pour un dev, mais on
    // laisse la possibilité de forcer avec INTERACTIVE_SHELL=cmd.exe
    return {
      shell: process.env.INTERACTIVE_SHELL || 'powershell.exe',
      args: ['-NoLogo']
    };
  }

  const shell = process.env.INTERACTIVE_SHELL || process.env.SHELL || '/bin/bash';
  return { shell, args: [] };
}

export function attachPtyServer(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws/pty' });

  wss.on('connection', (ws: WebSocket) => {
    let shellProcess: pty.IPty | null = null;
    let spawned = false;
    let handshakeTimer: NodeJS.Timeout | null = null;

    const send = (message: PtyMessage) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(message));
        } catch {
          /* ignore */
        }
      }
    };

    const killShell = () => {
      if (shellProcess) {
        try {
          shellProcess.kill();
        } catch {
          // Sur Windows, node-pty peut échouer sur kill() (AttachConsole).
          // Le process est quand même nettoyé par onExit/le GC. On continue.
        }
        shellProcess = null;
      }
      spawned = false;
    };

    const spawnShell = (opts: { cols?: number; rows?: number; cwd?: string }) => {
      if (spawned) return;

      const { shell, args } = resolveShell();
      const cwd = opts.cwd || getCurrentDirectory();

      try {
        shellProcess = pty.spawn(shell, args, {
          name: 'xterm-256color',
          cols: opts.cols && opts.cols > 0 ? opts.cols : 80,
          rows: opts.rows && opts.rows > 0 ? opts.rows : 24,
          cwd,
          env: {
            ...process.env,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            LANG: process.env.LANG || 'en_US.UTF-8'
          }
        });

        spawned = true;

        if (handshakeTimer) {
          clearTimeout(handshakeTimer);
          handshakeTimer = null;
        }

        shellProcess.onData((data) => send({ type: 'output', data }));
        shellProcess.onExit(({ exitCode }) => {
          send({ type: 'exit', code: exitCode });
          shellProcess = null;
          spawned = false;
        });

        send({ type: 'ready', cwd, pid: shellProcess.pid });
      } catch (error) {
        spawned = false;
        send({
          type: 'error',
          message: `Impossible de lancer le shell : ${error instanceof Error ? error.message : String(error)}`
        });
      }
    };

    const toString = (raw: RawData): string => {
      if (Array.isArray(raw)) {
        // Évite Buffer.concat (incompatible avec @types/node@20) : on concatène
        // les fragments texte un par un.
        return raw.map((chunk) => chunk.toString('utf8')).join('');
      }
      if (Buffer.isBuffer(raw)) return raw.toString('utf8');
      return Buffer.from(raw).toString('utf8');
    };

    const onMessage = (raw: RawData) => {
      let msg: PtyMessage;
      try {
        msg = JSON.parse(toString(raw));
      } catch {
        return;
      }
      if (!msg || typeof msg.type !== 'string') return;

      if (msg.type === 'spawn') {
        spawnShell({ cols: msg.cols, rows: msg.rows, cwd: msg.cwd });
        return;
      }

      if (!spawned || !shellProcess) return;

      switch (msg.type) {
        case 'input':
          if (typeof msg.data === 'string') {
            shellProcess.write(msg.data);
          }
          break;
        case 'resize': {
          const cols = Number(msg.cols);
          const rows = Number(msg.rows);
          if (Number.isFinite(cols) && cols > 0 && Number.isFinite(rows) && rows > 0) {
            shellProcess.resize(cols, rows);
          }
          break;
        }
        case 'kill':
          killShell();
          break;
        default:
          break;
      }
    };

    ws.on('message', onMessage);
    ws.on('close', killShell);
    ws.on('error', killShell);

    // Si le client n'envoie pas de premier message 'spawn' (client trop ancien
    // ou déconnecté), on lance quand même un shell par sécurité.
    handshakeTimer = setTimeout(() => {
      if (!spawned) {
        spawnShell({ cols: 80, rows: 24 });
      }
    }, 2000);
  });

  return wss;
}

export default attachPtyServer;
