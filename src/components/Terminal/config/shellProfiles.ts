import type { ShellKind } from '../InteractiveTerminal';

export type OsKind = 'windows' | 'macos' | 'linux' | 'unknown';

export interface ShellProfile {
  id: ShellKind;
  /** Libellé affiché dans le menu déroulant du bouton « + ». */
  label: string;
}

/** Nom affiché au tout premier chargement, avant la première commande. */
export const BRAND_TITLE = 'TerminalX';

/**
 * Détecte l'OS du navigateur. Sert à choisir le shell par défaut et à
 * n'exposer que les profils réellement disponibles sur la plateforme : il
 * n'y a ni PowerShell ni CMD sous Linux/macOS.
 */
export function detectOsKind(): OsKind {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

/**
 * Profils proposés par le menu « + », dans l'ordre. Le premier est le shell
 * par défaut de l'OS, utilisé par le bouton « + » : PowerShell sous Windows,
 * zsh sous macOS, bash sous Linux — les shells les plus répandus de chaque
 * plateforme, comme le terminal de VS Code.
 *
 * Le profil « default » ne sert que de repli quand l'OS est inconnu : dans ce
 * cas c'est le serveur qui choisit (INTERACTIVE_SHELL / $SHELL / /bin/bash).
 */
export function shellProfilesFor(os: OsKind): ShellProfile[] {
  switch (os) {
    case 'windows':
      return [
        { id: 'powershell', label: 'PowerShell' },
        { id: 'cmd', label: 'Command Prompt' }
      ];
    case 'macos':
      return [
        { id: 'zsh', label: 'zsh' },
        { id: 'bash', label: 'bash' }
      ];
    case 'linux':
      return [
        { id: 'bash', label: 'bash' },
        { id: 'zsh', label: 'zsh' }
      ];
    default:
      return [{ id: 'default', label: 'Terminal' }];
  }
}

/** Shell lancé par défaut (bouton « + ») pour un OS donné. */
export function defaultShellFor(os: OsKind): ShellKind {
  return shellProfilesFor(os)[0]?.id ?? 'default';
}

/** Nom de session affiché pour un shell (le profil « default » suit l'OS). */
export function shellTitle(id: ShellKind, os: OsKind): string {
  switch (id) {
    case 'powershell':
      return 'PowerShell';
    case 'cmd':
      return 'CMD';
    case 'bash':
      return 'bash';
    case 'zsh':
      return 'zsh';
    default: {
      const fallback = shellProfilesFor(os)[0];
      return fallback ? fallback.label : 'Terminal';
    }
  }
}
