/**
 * Agents IA lançables depuis une session.
 *
 * Chaque provider tient en une marque (le `d` de son path SVG et sa couleur)
 * et une commande shell. On ne stocke pas le `<svg>` complet ici : les paths
 * sont dans le même viewBox 24x24 que Lucide, ce qui permet de les rendre avec
 * la même classe de taille que les autres icônes (`h-3.5 w-3.5`).
 */
export interface AiProvider {
  id: string;
  /** Nom affiché dans le menu déroulant. */
  label: string;
  /** Commande tapée dans le PTY de la session. */
  command: string;
  /** `d` du path ; absent pour un logo monochrome (couleur du texte). */
  path?: string;
  /** Remplissage du path ; absent = `currentColor`. */
  fill?: string;
}

/** OpenAI (utilisé par le CLI `codex`). */
const OPENAI_PATH =
  'M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.997 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.259 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.746-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.499 4.499 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a4.535 4.535 0 0 1-.407-1.667zM8.309 12.863l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a.066.066 0 0 1 .031-.056l4.826-2.787a4.5 4.5 0 0 1 7.884 0l-.142.08L14.1 6.087a.8.8 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z';

/** Claude Code. */
const CLAUDE_PATH =
  'M20.998 10.949H24v3.102h-3v3.028h-1.487V20H18v-2.921h-1.487V20H15v-2.921H9V20H7.488v-2.921H6V20H4.487v-2.921H3V14.05H0V10.95h3V5h17.998v5.949zM6 10.949h1.488V8.102H6v2.847zm10.51 0H18V8.102h-1.49v2.847z';

export const AI_PROVIDERS: AiProvider[] = [
  { id: 'claude', label: 'Claude Code', command: 'claude', path: CLAUDE_PATH, fill: '#D97757' },
  { id: 'codex', label: 'Codex', command: 'codex', path: OPENAI_PATH }
];

export function findProvider(id: string): AiProvider | undefined {
  return AI_PROVIDERS.find((provider) => provider.id === id);
}
