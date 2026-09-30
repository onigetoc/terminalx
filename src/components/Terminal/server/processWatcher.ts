import { execFile } from 'child_process';

/** Un processus enfant du shell, donc une commande en cours d'exécution. */
export interface ForegroundProcess {
  pid: number;
  name: string;
}

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

/** Délai maximal pour une énumération Windows, en ms. */
const ENUM_TIMEOUT_MS = 3000;

/**
 * Cherche un processus enfant vivant sous le pid donné.
 *
 * Windows n'expose pas la table des processus à un processus arbitraire : il
 * faut interroger CIM, et cette requête coûte ~250ms sur une machine chargée
 * (contre ~30ms pour `Get-Process`, mais celui-ci ne donne pas le parent). D'où
 * le découpage : cet appel cher sert **une seule fois** à trouver le pid de la
 * commande, puis `isProcessAlive` surveille sa mort gratuitement.
 *
 * Renvoie `null` quand le shell est simplement idle — c'est ce `null` qui fait
 * revenir l'onglet à son nom d'origine.
 */
export function findForegroundProcess(shellPid: number): Promise<ForegroundProcess | null> {
  // Un nom de processus Windows ne contient ni « ; » ni retour à la ligne,
  // donc un format « pid;ppid;nom » se lit ligne par ligne sans ambiguïté.
  const script =
    "$ErrorActionPreference = 'SilentlyContinue'; " +
    'Get-CimInstance -ClassName Win32_Process -Property ProcessId,ParentProcessId,Name | ' +
    'ForEach-Object { Write-Output "$($_.ProcessId);$($_.ParentProcessId);$($_.Name)" }';

  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, timeout: ENUM_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }
        resolve(pickForeground(shellPid, stdout));
      }
    );
  });
}

/** Analyse la sortie de l'énumération et renvoie le premier candidat trouvé. */
function pickForeground(shellPid: number, stdout: string): ForegroundProcess | null {
  const children = new Map<number, { pid: number; name: string }[]>();
  for (const line of stdout.split('\n')) {
    const parts = line.trim().split(';');
    if (parts.length < 3) continue;
    const pid = Number(parts[0]);
    const ppid = Number(parts[1]);
    const name = parts.slice(2).join(';').trim();
    if (!Number.isFinite(pid) || !Number.isFinite(ppid) || !name) continue;
    const list = children.get(ppid);
    if (list) list.push({ pid, name });
    else children.set(ppid, [{ pid, name }]);
  }

  // Parcours en largeur borné par MAX_DEPTH ; le premier candidat est le plus
  // proche du shell, donc la commande elle-même.
  const seen = new Set<number>([shellPid]);
  let level = [shellPid];
  for (let depth = 0; depth < MAX_DEPTH && level.length > 0; depth++) {
    const next: number[] = [];
    for (const parent of level) {
      for (const child of children.get(parent) ?? []) {
        if (seen.has(child.pid)) continue;
        seen.add(child.pid);
        if (!IGNORED.has(child.name.toLowerCase())) {
          return { pid: child.pid, name: child.name.replace(/\.exe$/i, '') };
        }
        next.push(child.pid);
      }
    }
    level = next;
  }
  return null;
}

/**
 * Le pid existe-t-il encore ? Coût nul (aucun appel système coûteux, aucun
 * processus externe) : c'est `OpenProcess` + `CloseHandle` dans `node:child_process`.
 */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export default findForegroundProcess;
