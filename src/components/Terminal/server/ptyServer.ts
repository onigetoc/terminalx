import { WebSocketServer, WebSocket, type RawData } from 'ws';
import type { Server as HttpServer } from 'http';
import * as pty from 'node-pty';
import { getCurrentDirectory } from './directoryService';
import { findForegroundProcess, isProcessAlive } from './processWatcher';

/** Nombre de tentatives pour attraper un programme qui démarre lentement. */
const MAX_PROBE_ATTEMPTS = 3;
/** Délai entre deux tentatives, en ms. */
const PROBE_RETRY_MS = 1500;
/** Fréquence de vérification de mort du processus suivi, en ms (gratuit). */
const LIVENESS_INTERVAL_MS = 400;

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
 *     { type: 'spawn', cols, rows, cwd?, shell? } // lancer le shell dans un PTY
 *     { type: 'input', data }               // frappes clavier vers le shell
 *     { type: 'resize', cols, rows }        // redimensionnement
 *     { type: 'watch' }                     // scruter les processus enfants
 *     { type: 'kill' }                      // tuer la session
 *   Serveur -> Client :
 *     { type: 'ready', cwd, pid }
 *     { type: 'output', data }              // sortie du shell (ANSI)
 *     { type: 'running', running }          // une commande est-elle en cours ?
 *     { type: 'exit', code }
 *     { type: 'error', message }
 */

export interface PtyMessage {
  type: string;
  data?: string;
  cols?: number;
  rows?: number;
  cwd?: string;
  /** Shell demandé par le client : 'default' | 'powershell' | 'cmd' | 'bash' | 'zsh'. */
  shell?: string;
  /** true = un processus enfant du shell est vivant, false = shell idle. */
  running?: boolean;
  code?: number | null;
  message?: string;
  pid?: number;
}

interface ShellDefinition {
  shell: string;
  args: string[];
}

/**
 * Choisit un shell adapté à la plateforme. Surchargeable via INTERACTIVE_SHELL.
 *
 * `preferred` vient du menu « + » du client : sous Windows, 'powershell' ou
 * 'cmd' ; ailleurs, 'zsh' ou 'bash'. Toute valeur inconnue (dont 'default' et
 * les profils de l'autre OS) retombe sur le shell par défaut de la plateforme.
 */
function resolveShell(preferred?: string): ShellDefinition {
  if (process.platform === 'win32') {
    if (preferred === 'cmd') {
      return { shell: 'cmd.exe', args: [] };
    }
    if (preferred === 'powershell') {
      return { shell: 'powershell.exe', args: ['-NoLogo'] };
    }
    // PowerShell est plus confortable qu'un cmd.exe brut pour un dev, mais on
    // laisse la possibilité de forcer avec INTERACTIVE_SHELL=cmd.exe
    return {
      shell: process.env.INTERACTIVE_SHELL || 'powershell.exe',
      args: ['-NoLogo']
    };
  }

  if (preferred === 'zsh') {
    return { shell: '/bin/zsh', args: [] };
  }
  if (preferred === 'bash') {
    return { shell: '/bin/bash', args: [] };
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
    // --- Détection du processus au premier plan ---------------------------
    // Le client signale une validation de ligne (`watch`). On cherche alors un
    // enfant du shell : si on en trouve un, c'est une commande longue, et on
    // surveille sa mort avec `isProcessAlive` (gratuit). Tant qu'on n'a rien
    // trouvé, on réessaie quelques fois : un programme peut démarrer lentement.
    let trackedPid: number | null = null;
    let livenessTimer: NodeJS.Timeout | null = null;
    let retryTimer: NodeJS.Timeout | null = null;
    let attempts = 0;

    const send = (message: PtyMessage) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(message));
        } catch {
          /* ignore */
        }
      }
    };

    /**
     * `notify = false` : on abandonne le suivi en cours pour en démarrer un
     * nouveau (nouvelle ligne validée). Il ne faut PAS envoyer `running: false`
     * dans ce cas, car le client lirait ce message comme « la commande que je
     * viens de valider est terminée » et effacerait son libellé avant que le
     * nouveau probe n'ait répondu.
     */
    const stopWatching = (notify = true) => {
      const wasTracking = trackedPid !== null || livenessTimer !== null || retryTimer !== null;
      if (livenessTimer) {
        clearInterval(livenessTimer);
        livenessTimer = null;
      }
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      trackedPid = null;
      attempts = 0;
      // Sans cela le client garderait `running: true` et garderait le nom de la
      // commande alors que le shell a été tué ou relancé.
      if (notify && wasTracking) send({ type: 'running', running: false });
    };

    /** Suit la mort du processus suivi : c'est le signal de retour au nom du shell. */
    const trackLiveness = (pid: number) => {
      trackedPid = pid;
      if (livenessTimer) clearInterval(livenessTimer);
      livenessTimer = setInterval(() => {
        if (isProcessAlive(pid)) return;
        stopWatching();
      }, LIVENESS_INTERVAL_MS);
    };

    const probe = () => {
      const pid = shellProcess?.pid;
      if (!spawned || !shellProcess || pid === undefined) return;
      findForegroundProcess(pid)
        .then((found) => {
          if (found) {
            attempts = 0;
            send({ type: 'running', running: true });
            trackLiveness(found.pid);
            return;
          }
          // Rien pour l'instant : le programme peut être en train de démarrer.
          if (++attempts < MAX_PROBE_ATTEMPTS && spawned) {
            retryTimer = setTimeout(probe, PROBE_RETRY_MS);
          }
        })
        .catch(() => {
          /* l'énumération a échoué : on retente au prochain `watch` */
        });
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

    const spawnShell = (opts: { cols?: number; rows?: number; cwd?: string; shell?: string }) => {
      if (spawned) return;

      const { shell, args } = resolveShell(opts.shell);
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

        // Un nouveau shell : l'ancien suivi ne vaut plus rien.
        stopWatching();

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
        spawnShell({ cols: msg.cols, rows: msg.rows, cwd: msg.cwd, shell: msg.shell });
        return;
      }

      // « L'utilisateur a validé une ligne » : on regarde s'il en démarre une.
      if (msg.type === 'watch') {
        if (!spawned || !shellProcess) return;
        if (trackedPid !== null) return;
        // Nouveau probe : on abandonne l'ancien SANS notifier (voir stopWatching).
        stopWatching(false);
        probe();
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

    const cleanup = () => {
      stopWatching();
      killShell();
    };

    ws.on('message', onMessage);
    ws.on('close', cleanup);
    ws.on('error', cleanup);

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
