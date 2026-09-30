import { spawn, type ChildProcess } from 'child_process';

/** Une ligne de l'énumération Windows : pid, ppid, nom de l'image. */
export interface ProcessRow {
  pid: number;
  ppid: number;
  name: string;
}

type SnapshotListener = (rows: ProcessRow[]) => void;

const BEGIN = '::BEGIN';
const END = '::END';

/**
 * Noms de processus à ignorer quand on cherche « une commande en cours ».
 *
 * `powershell.exe` / `cmd.exe` sont le shell lui-même, pas la commande. Les
 * autres sont l'infrastructure de Windows : `conhost.exe` est un enfant
 * permanent du PTY, il ferait donc croire qu'une commande tourne en boucle.
 */
const IGNORED = new Set([
  'powershell.exe',
  'pwsh.exe',
  'cmd.exe',
  'bash.exe',
  'sh.exe',
  'zsh.exe',
  'fish.exe',
  'nu.exe',
  'conhost.exe',
  'openconsole.exe',
  'wsl.exe',
  'wslhost.exe',
  'dllhost.exe',
  'sihost.exe'
]);

/** Profondeur de recherche sous le pid du shell. 4 couvre shell → node → cli. */
const MAX_DEPTH = 4;

/**
 * Exécute une seule requête PowerShell qui remonte l'arbre des descendants du
 * pid donné, en excluant les noms ignorés. Renvoie null si rien ne tourne
 * (le shell est juste là) — c'est le signal qui permet à l'onglet de revenir à
 * son nom d'origine quand la commande se termine.
 */
function findForegroundProcess(rows: ProcessRow[], rootPid: number): string | null {
  const byPid = new Map<number, ProcessRow>();
  const children = new Map<number, ProcessRow[]>();
  for (const row of rows) {
    byPid.set(row.pid, row);
    const list = children.get(row.ppid);
    if (list) list.push(row);
    else children.set(row.ppid, [row]);
  }
  if (!byPid.has(rootPid)) return null;

  // Parcours en largeur borné par MAX_DEPTH ; on retient le premier candidat
  // trouvé, c'est-à-dire le plus proche du shell.
  const seen = new Set<number>([rootPid]);
  let level = [rootPid];
  for (let depth = 0; depth < MAX_DEPTH && level.length > 0; depth++) {
    const next: number[] = [];
    for (const parent of level) {
      for (const child of children.get(parent) ?? []) {
        if (seen.has(child.pid)) continue;
        seen.add(child.pid);
        if (!IGNORED.has(child.name.toLowerCase())) {
          return child.name.replace(/\.exe$/i, '');
        }
        next.push(child.pid);
      }
    }
    level = next;
  }
  return null;
}

/**
 * Surveille les processus enfants d'un shell et notifie à chaque changement
 * d'état (« une commande tourne » / « plus rien ne tourne »).
 *
 * Windows n'expose pas la liste des processus à un processus arbitraire : il
 * faut passer par CIM/WMI. Plutôt que de lancer une requête par tick, on
 * garde un PowerShell auxiliaire vivant qui écrit la liste sur stdout — le
 * coût d'un démarrage de PowerShell (~300ms) est évité à chaque poll.
 *
 * `@returns` une fonction d'arrêt.
 */
export function startForegroundProcessWatcher(
  shellPids: () => number[],
  onChange: (shellPid: number, running: boolean) => void
): () => void {
  let helper: ChildProcess | null = null;
  let buffer = '';
  let collecting = false;
  let rows: ProcessRow[] = [];
  const running = new Map<number, boolean>();

  const evaluate = () => {
    for (const pid of shellPids()) {
      const next = findForegroundProcess(rows, pid) !== null;
      if (running.get(pid) === next) continue;
      running.set(pid, next);
      onChange(pid, next);
    }
  };

  const stop = () => {
    helper?.kill();
    helper = null;
  };

  const start = () => {
    if (helper) return;
    const script = [
      "$ErrorActionPreference = 'SilentlyContinue'",
      'while ($true) {',
      `  Get-CimInstance -ClassName Win32_Process -Property ProcessId,ParentProcessId,Name |`,
      '    ForEach-Object { "$($_.ProcessId);$($_.ParentProcessId);$($_.Name)" } |',
      `  ForEach-Object { Write-Output '${BEGIN}$_$($_ -replace "`n", "")' }`,
      `  Write-Output '${END}'`,
      '  Start-Sleep -Milliseconds 1200',
      '}'
    ].join('\n');

    helper = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore']
    });
    helper.stdout?.setEncoding('utf8');
    helper.stdout?.on('data', (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const raw of lines) {
        const line = raw.trim();
        if (line === BEGIN) {
          collecting = true;
          rows = [];
        } else if (line === END) {
          collecting = false;
          evaluate();
        } else if (collecting) {
          const [pid, ppid, ...rest] = line.split(';');
          const name = rest.join(';');
          const p = Number(pid);
          const q = Number(ppid);
          if (Number.isFinite(p) && Number.isFinite(q) && name) rows.push({ pid: p, ppid: q, name });
        }
      }
    });
    helper.on('exit', () => {
      helper = null;
    });
  };

  return () => {
    stop();
    running.clear();
  };
}

export default startForegroundProcessWatcher;
