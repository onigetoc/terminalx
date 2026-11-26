/**
 * Agents IA lançables depuis une session.
 *
 * Chaque provider tient en une marque (paths SVG ou icône embarquée) et une
 * commande shell. Les paths sont rendus dans leur propre viewBox, les icônes
 * embarquées restent des fichiers SVG carrés.
 */

export interface LogoMark {
  /** `d` d'un path du logo. */
  d: string;
  /** `evenodd` obligatoire dès qu'un path contient un trou (OpenCode, Pi). */
  fillRule?: 'evenodd';
  /**
   * Remplissage propre à ce path, prioritaire sur `AiProvider.fill`. Sert aux
   * logos multicolores ; c'est aussi ce qui porte une référence `url(#id)` vers
   * un dégradé déclaré dans `logo.gradients`.
   */
  fill?: string;
}

/** Borne d'un dégradé linéaire de logo. */
export interface LogoGradientStop {
  /** Position dans le dégradé (`0`, `0.5`, `1`…). */
  offset: string;
  /** Couleur CSS du stop. */
  color: string;
}

/**
 * Dégradé linéaire d'un logo, en coordonnées `userSpaceOnUse` du viewBox source.
 * Les ids doivent rester uniques dans le registre (un seul est déclaré par
 * provider) : le navigateur résout `url(#id)` sur le premier élément du document.
 */
export interface LogoGradient {
  id: string;
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  stops: LogoGradientStop[];
}

export interface AiProvider {
  id: string;
  /** Nom affiché dans le menu déroulant. */
  label: string;
  /** Commande tapée dans le PTY de la session. */
  command: string;
  /** Nom d'une icône SVG embarquée par le menu. */
  iconAsset?: 'antigravity' | 'github-copilot' | 'groq' | 'kimi' | 'cline' | 'kilo';
  /** Ajouter un fond clair aux marques sombres, pour le menu à fond foncé. */
  iconBackdrop?: boolean;
  /** Remplissage des paths ; absent = `currentColor` (logo monochrome). */
  fill?: string;
  logo?: {
    /**
     * `viewBox` du SVG source. 24x24 pour la plupart (convention Lucide) ;
     *_pi_ est livré en 800x800 avec beaucoup de marge, qu'on recadre pour que la
     * marque occupe la même place que les autres dans le menu.
     */
    viewBox?: string;
    /** Dégradés référencés par `fill: url(#id)` dans un path. */
    gradients?: LogoGradient[];
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
   * une seule chose à auditer. Conséquence : Node >= 22 pour Claude Code,
   * GitHub Copilot CLI et Cline; Node >= 22.19 pour Pi et Kimi Code CLI.
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

/**
 * OpenAI (utilisé par le CLI `codex`). SVG officiel 256x260 : on garde son
 * viewBox propre plutôt que de le mettre à l'échelle dans un 24x24, c'est la
 * même marque mais avec les courbes et les proportions d'origine.
 */
const OPENAI_VIEWBOX = '0 0 256 260';
const OPENAI_PATH =
  'M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z';

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

/**
 * Gemini CLI. Le logo source est une icône d'app 256x256 (carré arrondi sombre
 * + chevron dégradé) ; comme les autres entrées du menu, on ne garde que la
 * marque sur fond transparent. Le viewBox est donc recadré sur le chevron
 * (x 77→179, y 62→190) avec une petite marge, pour qu'il ait le même poids
 * visuel que les logos 24x24. Le dégradé bleu→violet du chevron est conservé.
 */
const GEMINI_VIEWBOX = '64 62 128 128';
const GEMINI_GRADIENT_ID = 'gemini-chevron';
const GEMINI_PATH =
  'm76.93 62.08 102.2 49.64v38.76l-102.4 49.43v-28.46l82.28-40.62-82.06-39.3v-29.45z';

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
    logo: { viewBox: OPENAI_VIEWBOX, paths: [{ d: OPENAI_PATH }] },
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
    id: 'gemini',
    label: 'Gemini CLI',
    command: 'gemini',
    logo: {
      viewBox: GEMINI_VIEWBOX,
      gradients: [
        {
          id: GEMINI_GRADIENT_ID,
          x1: '71.54',
          y1: '100.5',
          x2: '162.7',
          y2: '151.2',
          stops: [
            { offset: '0', color: '#0186FF' },
            { offset: '0.5', color: '#0186FF' },
            { offset: '0.96', color: '#B878D6' }
          ]
        }
      ],
      paths: [{ d: GEMINI_PATH, fill: `url(#${GEMINI_GRADIENT_ID})` }]
    },
    versionArgs: ['--version'],
    // Canal `@preview` exigé par Google au moment de l'ajout.
    install: 'npm install -g @google/gemini-cli@preview'
  },
  {
    id: 'antigravity',
    label: 'Antigravity',
    command: 'agy',
    iconAsset: 'antigravity',
    versionArgs: ['--version'],
    install: 'npm install -g @google/antigravity-cli'
  },
  {
    id: 'github-copilot',
    label: 'GitHub Copilot CLI',
    command: 'copilot',
    iconAsset: 'github-copilot',
    iconBackdrop: true,
    versionArgs: ['--version'],
    install: 'npm install -g @github/copilot'
  },
  {
    id: 'groq',
    label: 'Groq Code CLI',
    command: 'groq',
    iconAsset: 'groq',
    versionArgs: ['--version'],
    install: 'npm install -g groq-code-cli@latest'
  },
  {
    id: 'kimi',
    label: 'Kimi Code CLI',
    command: 'kimi',
    iconAsset: 'kimi',
    versionArgs: ['--version'],
    install: 'npm install -g @moonshot-ai/kimi-code'
  },
  {
    id: 'cline',
    label: 'Cline',
    command: 'cline',
    iconAsset: 'cline',
    iconBackdrop: true,
    versionArgs: ['--version'],
    install: 'npm install -g cline'
  },
  {
    id: 'kilo',
    label: 'Kilo Code',
    command: 'kilo',
    iconAsset: 'kilo',
    versionArgs: ['--version'],
    install: 'npm install -g @kilocode/cli'
  }
];


export function findProvider(id: string): AiProvider | undefined {
  return AI_PROVIDERS.find((provider) => provider.id === id);
}

/**
 * Provider dont la commande correspond exactement à `word` (premier mot d'une
 * ligne tapée dans le shell). Sert à donner sa marque à une session quand
 * l'agent est lancé à la main plutôt que par le menu.
 */
export function findProviderByCommand(word: string): AiProvider | undefined {
  const normalized = word.toLowerCase();
  return AI_PROVIDERS.find((provider) => provider.command.toLowerCase() === normalized);
}
