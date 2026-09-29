# AGENTS.md

Browser terminal emulator (Vite + React 18 + TS) with a Node backend. Everything lives under
`src/components/Terminal/` — frontend and server are co-located and share one tsconfig.

## Toolchain

- **Use `bun`, never `npm`.** `node_modules/.bin` contains bun-style `.exe` shims only, so
  `npx tsc` and `.\node_modules\.bin\tsc.cmd` both fail. Run binaries via `bun x <tool>`.
  `package-lock.json` is vestigial — ignore it.
- Scripts: `bun run dev` (Vite 5173 + Fastify concurrently), `bun run frontend`, `bun run server`,
  `bun run build` (`tsc && vite build`), `bun run kill-port` (frees 5173 and 3003).
- **No test runner, no lint script.** There is no `test` script and no `lint` script; `vitest`
  is not installed. `eslint.config.js` exists — run it as `bun x eslint .`. `bun run build` is
  the only real verification gate.

## `bun run build` is currently red

`tsc` fails with exactly 15 pre-existing errors, all in vendored shadcn files. This is the
baseline, not something you broke. `bun x vite build` on its own succeeds.

| File | Known errors |
|---|---|
| `src/components/ui/chart.tsx` | 8 — vendored shadcn vs. current `recharts` types |
| `src/components/ui/resizable.tsx` | 5 — vendored shadcn vs. `react-resizable-panels` v4 |
| `src/components/ui/calendar.tsx` | 2 — vendored shadcn vs. current `react-day-picker` |

Diff error count before/after your change instead of expecting a clean build. Do not "fix" the
vendored `src/components/ui/*` files unless asked.

## Architecture

Two processes. The server is **not** a separate package — it sits in
`src/components/Terminal/server/` and is typechecked by the frontend `tsconfig.json`, so
server type errors break the frontend build.

- **Server** (`server/index.ts`, Fastify + `tsx watch`): scans ports **3003–3010** for the first
  free one, then attaches the PTY WebSocket on `/ws/pty`.
  Routes: `GET /`, `GET /health`, `POST /init-directory`, `GET /current-directory`,
  `POST /pty/upload` (base64 JSON, ~20MB cap, writes to `os.tmpdir()/terminalx-uploads`).
  There is **no command-execution route** — the PTY is the only way to run anything.
- **Client port discovery** (`config/serverConfig.ts`): probes `/health` on 3003→3010 and caches
  the winner. It does **not** read `config/current-port.json` — the server writes that file, but
  nothing consumes it. Don't build on it.
- **One terminal, xterm only.** `InteractiveTerminal` (xterm.js) + `node-pty` over WebSocket
  `/ws/pty` is the sole terminal mode; the old text-history mode is gone.
  Protocol — client→server: `spawn`/`input`/`resize`/`kill`; server→client:
  `ready`/`output`/`exit`/`error`. Window size is forwarded as `resize`.
- **PTY shell** (`server/ptyServer.ts`): `powershell.exe -NoLogo` on Windows, else
  `$SHELL` or `/bin/bash`. Override with the `INTERACTIVE_SHELL` env var. A 2s handshake timer
  auto-spawns a shell if the client never sends `spawn`.
- **Parent → terminal bridge**: `InteractiveTerminal` is a `forwardRef` exposing
  `InteractiveTerminalHandle` (`clear`, `write`, `focus`, `search`, `clearSearch`). The footer
  buttons (Clear / Help / About) and the search bar go through it — there is no command queue
  in the parent anymore.
- **Session restart**: the Kill toolbar button bumps `sessionKey` in `Terminal.tsx`, which is the
  `key` on `<InteractiveTerminal>`. Remounting tears down the socket (`kill` + `close`) and
  spawns a fresh shell. Same for picking a working directory, since the shell's cwd is fixed
  at spawn.
- **Global API**: `window.handleToggleTerminal()` only. Registered in `Terminal.tsx`, typed in
  `src/types/window.d.ts`. It exists only while `<Terminal />` is mounted, and is torn down on
  unmount. `window.executeCommand` was removed along with the history mode.

## Gotchas

- **`Buffer` is landmine territory.** `@types/node@20` + modern TS makes `Buffer` incompatible
  with `Uint8Array<ArrayBuffer>`. Existing code deliberately avoids `Buffer.concat` — see the
  comments in `server/ptyServer.ts` (`toString`) and `server/index.ts` (`/pty/upload`). Follow
  that pattern; don't "clean it up" into Buffer helpers.
- **Search is `@xterm/addon-search`, not DOM.** `TerminalSearch.tsx` only owns the input and
  the counter; hits and highlights live in the xterm buffer via `SearchAddon`
  (`findNext`/`findPrevious`/`clearDecorations`). `onDidChangeResults` only fires because
  `decorations` is set in `SEARCH_OPTIONS` — drop it and the counter silently stays at 0.
  Don't reintroduce DOM text-node highlighting: the terminal content is a canvas.
- `server/directoryService.ts` holds a module-level `currentWorkingDirectory` set through
  `process.chdir`. It is **per server process**, shared across clients, and resets to the home
  directory on restart. The client mirrors it in `localStorage` (`terminalDirectory`) and
  re-posts it on mount, so the folder picker survives a reload.
- The browser's `showDirectoryPicker()` only exposes the folder **name**, not a path, so the
  server resolves it relative to its own cwd. `showDirectoryPicker` is Chrome/Edge-only;
  the button no-ops elsewhere (it used to push a message into the history — that history is gone).
- `@/*` → `src/*` in both `vite.config.ts` and the tsconfigs. `src/components/ui/*` is vendored
  shadcn (`components.json`: new-york, neutral, css vars) — re-add via shadcn, don't hand-edit.
- `postcss.config.js` **and** `postcss.config.cjs` both exist with identical content. Harmless,
  but don't add a third.
- The terminal server has wide-open CORS and unauthenticated shell access. It binds to
  localhost and is a local dev tool — do not deploy or expose it.
- Stale docs: `.clinerules` and `.github/copilot-instructions.md` are near-duplicates that
  still describe the removed history mode (`executeCommand`, `commandOS`, `terminalFormatter`).
  `project_structure.text` is an outdated tree. Trust `src/` over all of them.

## Conventions

- Files stay under **600 lines**; extract before they approach it. Largest today:
  `InteractiveTerminal.tsx` (~535), `TerminalUI.tsx` (~285), `Terminal.tsx` (~170).
- Run `bun run build` yourself to verify. The user runs `bun run dev` — don't spawn dev servers.
- `git`: never `git checkout` to another branch unless explicitly asked; commit + push from the
  current branch. Commits use lowercase `type:` prefixes (`fix:`, `feat:`, `refactor:`, ...).
- Platform is Windows — PowerShell or Git Bash syntax, no `launchctl`/Linux-only utilities.

## Project rules

Additional project-specific rules live here — read them before coding:

- [`rules/coding-standards.md`](rules/coding-standards.md)
- [`rules/karpathy-guidelines.md`](rules/karpathy-guidelines.md)

Use caveman skill.


