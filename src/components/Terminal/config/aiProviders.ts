/**
 * Agents IA lançables depuis une session.
 *
 * Chaque provider tient en une marque (les `d` de son logo SVG et sa couleur)
 * et une commande shell. On ne stocke pas le `<svg>` complet ici : les paths
 * sont rendus dans leur propre viewBox, ce qui permet de les afficher avec la
 * même classe de taille que les autres icônes (`h-3.5 w-3.5`).
 */

export interface LogoMark {
  /** `d` d'un path du logo. */
  d: string;
  /** `evenodd` obligatoire dès qu'un path contient un trou (OpenCode, Pi). */
  fillRule?: 'evenodd';
}

export interface AiProvider {
  id: string;
  /** Nom affiché dans le menu déroulant. */
  label: string;
  /** Commande tapée dans le PTY de la session. */
  command: string;
  /** Remplissage des paths ; absent = `currentColor` (logo monochrome). */
  fill?: string;
  logo: {
    /**
     * `viewBox` du SVG source. 24x24 pour la plupart (convention Lucide) ;
     *_pi_ est livré en 800x800 avec beaucoup de marge, qu'on recadre pour que la
     * marque occupe la même place que les autres dans le menu.
     */
    viewBox?: string;
    paths: LogoMark[];
  };
  /**
   * Arguments du probe de version, lancés par le serveur (`GET /agents`).
   * `--version` sort en code 0 sur tous les agents du registre ; une erreur
   * (binaire absent, code != 0, timeout) signifie « pas installé ».
   */
  versionArgs: string[];
  /**
   * Commande d'installation, affichée dans la boîte de dialogue puis exécutée
   * par `POST /agents/install`.
   *
   * npm global pour tout le monde, sans exception : le PTY lance le binaire nu
   * depuis le dossier du projet, donc seule une installation globale est sur le
   * PATH. On écarte `curl | sh` et les installeurs natifs — un seul mécanisme,
   * une seule chose à auditer. Conséquence : Node est requis (>= 22 pour Claude
   * Code, >= 22.19 pour Pi).
   */
  install: string;
}

/**
 * Résultat d'un probe de version, renvoyé par `GET /agents`.
 *
 * - `installed` : le binaire a répondu, `version` contient sa première ligne.
 * - `missing`   : le binaire n'existe pas sur le PATH, ou `--version` a échoué.
 * - `unknown`   : le probe a été interrompu (timeout, serveur arrêté) — on ne
 *                 prétend pas que l'agent manque, on ne sait pas.
 */
export interface AgentStatus {
  id: string;
  installed: boolean;
  version?: string;
}

/** Corps de `POST /agents/install`. */
export interface AgentInstallResult {
  ok: boolean;
  /** Les dernières lignes de sortie (stdout + stderr), pour le dialogue. */
  output: string;
}

/** OpenAI (utilisé par le CLI `codex`). */
const OPENAI_PATH =
  'M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.997 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.259 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.746-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.499 4.499 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a4.535 4.535 0 0 1-.407-1.667zM8.309 12.863l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a.066.066 0 0 1 .031-.056l4.826-2.787a4.5 4.5 0 0 1 7.884 0l-.142.08L14.1 6.087a.8.8 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z';

/** Claude Code. */
const CLAUDE_PATH =
  'M20.998 10.949H24v3.102h-3v3.028h-1.487V20H18v-2.921h-1.487V20H15v-2.921H9V20H7.488v-2.921H6V20H4.487v-2.921H3V14.05H0V10.95h3V5h17.998v5.949zM6 10.949h1.488V8.102H6v2.847zm10.51 0H18V8.102h-1.49v2.847z';

/**
 * OpenCode. Carré évidé : le `evenodd` est indispensable, sans lui le rectangle
 * intérieur serait peint au lieu de percé.
 */
const OPENCODE_PATH = 'M16 6H8v12h8V6zm4 16H4V2h16v20z';

/**
 * Pi. Le SVG source est en 800x800 et n'occupe que le carré 165→635 : on
 * recadre sur `145 145 510 510` (marge ~3%) pour que la marque ait le même
 * poids visuel que les logos 24x24 du registre. Le « P » et le « i » sont deux
 * paths distincts ; le premier perce son propre trou, d'où `evenodd`.
 */
const PI_PATH =
  'M165.29 165.29 H517.36 V400 H400 V517.36 H282.65 V634.72 H165.29 Z M282.65 282.65 V400 H400 V282.65 Z';
const PI_DOT_PATH = 'M517.36 400 H634.72 V634.72 H517.36 Z';

/** DeepSeek. */
const DEEPSEEK_PATH =
  'M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 0 1-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 0 0-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 0 1-.465.137 9.597 9.597 0 0 0-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 0 0 1.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 0 1 1.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 0 1 .415-.287.302.302 0 0 1 .2.288.306.306 0 0 1-.31.307.303.303 0 0 1-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 0 1-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 0 1 .016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 0 1-.254-.078.253.253 0 0 1-.114-.358c.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z';

export const AI_PROVIDERS: AiProvider[] = [
  {
    id: 'claude',
    label: 'Claude Code',
    command: 'claude',
    fill: '#D97757',
    logo: { paths: [{ d: CLAUDE_PATH }] },
    versionArgs: ['--version'],
    install: 'npm install -g @anthropic-ai/claude-code'
  },
  {
    id: 'codex',
    label: 'Codex',
    command: 'codex',
    logo: { paths: [{ d: OPENAI_PATH }] },
    versionArgs: ['--version'],
    install: 'npm install -g @openai/codex'
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    command: 'opencode',
    logo: { paths: [{ d: OPENCODE_PATH, fillRule: 'evenodd' }] },
    versionArgs: ['--version'],
    install: 'npm install -g opencode-ai'
  },
  {
    id: 'pi',
    label: 'Pi',
    command: 'pi',
    // Sans `fill`, la marque hérite de `currentColor` (#d4d4d4 dans le menu) :
    // le SVG source alterne noir/blanc selon le thème, ce qui n'a pas de sens
    // pour une icône de menu dont la couleur suit le texte.
    logo: {
      viewBox: '145 145 510 510',
      paths: [
        { d: PI_PATH, fillRule: 'evenodd' },
        { d: PI_DOT_PATH }
      ]
    },
    versionArgs: ['--version'],
    // `--ignore-scripts` : Pi n'a pas besoin de script d'install, et ce flag
    // coupe l'exécution des scripts de dépendances pendant l'installation.
    install: 'npm install -g --ignore-scripts @earendil-works/pi-coding-agent'
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    command: 'deepseek',
    fill: '#4D6BFE',
    logo: { paths: [{ d: DEEPSEEK_PATH }] },
    versionArgs: ['--version'],
    // Wrapper tiers (DeepSeek n'a pas de CLI officielle) : appelle l'API et
    // exige `DEEPSEEK_API_KEY` dans l'environnement.
    install: 'npm install -g deepseek-cli'
  }
];


export function findProvider(id: string): AiProvider | undefined {
  return AI_PROVIDERS.find((provider) => provider.id === id);
}
