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
  /** Remplissage des paths ; absent = `currentColor` (logo monochrome). */
  fill?: string;
  logo: {
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

/** DeepSeek. */
const DEEPSEEK_PATH =
  'M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 0 1-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 0 0-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 0 1-.465.137 9.597 9.597 0 0 0-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 0 0 1.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 0 1 1.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 0 1 .415-.287.302.302 0 0 1 .2.288.306.306 0 0 1-.31.307.303.303 0 0 1-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 0 1-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 0 1 .016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 0 1-.254-.078.253.253 0 0 1-.114-.358c.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z';

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
    id: 'deepseek',
    label: 'DeepSeek',
    command: 'deepseek',
    fill: '#4D6BFE',
    logo: { paths: [{ d: DEEPSEEK_PATH }] },
    versionArgs: ['--version'],
    // Wrapper tiers (DeepSeek n'a pas de CLI officielle) : appelle l'API et
    // exige `DEEPSEEK_API_KEY` dans l'environnement.
    install: 'npm install -g deepseek-cli'
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
