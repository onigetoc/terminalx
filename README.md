# Terminal X2

A real terminal in the browser: **xterm.js** renders the screen, **node-pty** runs a shell on a
small Node server, and a WebSocket streams both directions. Full-screen CLIs (`claude`,
`opencode`, `vim`, `htop`, `nano`) work as they do in VS Code.

## Features

- 🖥️ Real xterm.js terminal attached to a live pseudo-terminal
- ⌨️ Copy/paste VS Code style (`Ctrl+C` copies a selection, otherwise sends SIGINT)
- 📋 Paste an image or drop a file — the server stores it and inserts its path
- 🖼️ Inline images (Sixel + iTerm IIP) rendered on canvas
- 🔍 `Ctrl+F` search in the scrollback, powered by `@xterm/addon-search`
- 🎯 Window controls: kill/restart, working directory, clear, help, about, minimize, fullscreen
- 📏 Draggable and resizable window, docked to the bottom of the page
- 🪟 Toggle from anywhere with `window.handleToggleTerminal()`

## Getting started

```sh
bun install
bun run dev
```

`bun run dev` starts Vite on 5173 and the Fastify terminal server (first free port in
3003–3010). Open http://localhost:5173 and click the terminal.

Run the halves separately with `bun run frontend` and `bun run server`. Free the ports with
`bun run kill-port`.

> Windows: the shell is `powershell.exe -NoLogo`. Elsewhere it's `$SHELL` or `/bin/bash`.
> Override with the `INTERACTIVE_SHELL` environment variable.

## Usage

Mount the component once, anywhere:

```jsx
import Terminal from "@/components/Terminal/Terminal";

const YourComponent = () => (
  <div>
    <h1>Your Component</h1>
    <Terminal config={{ initialState: 'open', defaultHeight: 340 }} />
  </div>
);

export default YourComponent;
```

Toggle the window from anywhere, no import needed:

```jsx
<button onClick={() => window.handleToggleTerminal?.()}>Toggle Terminal</button>
```

`handleToggleTerminal` is registered on mount and removed on unmount.

## How it works

The old "one command, one buffered response" model is gone. There is no HTTP route that runs
commands. Everything goes through a persistent PTY session:

1. `node-pty` opens a pseudo-terminal on the server.
2. The browser connects to `ws://localhost:<port>/ws/pty`.
3. Keystrokes are written into the shell; the ANSI output streams back and xterm renders it.
4. Window resizes are forwarded as `resize`, so full-screen TUIs reflow correctly.

WebSocket protocol (JSON):

| Direction | Messages |
|---|---|
| Client → server | `spawn` (cols, rows, cwd), `input`, `resize`, `kill` |
| Server → client | `ready` (cwd, pid), `output`, `exit`, `error` |

### Files

```
src/components/Terminal/
├── InteractiveTerminal.tsx   xterm.js + addons + WebSocket + clipboard/drag-drop
├── Terminal.tsx              window state: open/visible/fullscreen/minimize/height
├── TerminalUI.tsx            toolbar, cwd bar, footer actions
├── TerminalSearch.tsx        Ctrl+F bar (search itself lives in @xterm/addon-search)
├── config/
│   ├── serverConfig.ts       probes 3003→3010 for the running server
│   └── terminalConfig.ts     component options + defaults
├── server/
│   ├── index.ts              Fastify routes + port scan
│   ├── ptyServer.ts          node-pty WebSocket server
│   └── directoryService.ts   working directory shared by sessions
├── styles/terminal.css
└── utils/directoryUtils.ts   localStorage mirror of the working directory
```

### Server routes

| Route | Purpose |
|---|---|
| `GET /` | liveness |
| `GET /health` | port discovery |
| `POST /init-directory` | set the working directory |
| `GET /current-directory` | read the working directory |
| `POST /pty/upload` | store a dropped/pasted file (~20MB), returns its path |
| `WS /ws/pty` | the terminal session |

## Configuration

Options accepted by the `config` prop (see `src/components/Terminal/config/terminalConfig.ts`):

| Option | Type | Default | Description |
|---|---|---|---|
| `initialState` | `'open' \| 'closed' \| 'hidden'` | `'open'` | Whether the window starts open |
| `startFullscreen` | `boolean` | `false` | Start fullscreen |
| `startMinimized` | `boolean` | `false` | Start collapsed to the title bar |
| `defaultHeight` | `number` | `340` | Window height in px |
| `minHeight` | `number` | `200` | Minimum height when dragging |
| `fontSize` | `number` | `14` | Font size |
| `fontFamily` | `string` | `'monospace'` | Font family |
| `scrollbackLimit` | `number` | `1000` | Lines kept in the xterm scrollback |
| `showTerminal` | `boolean` | `true` | Set false to hide the terminal entirely |
| `readOnlyMode` | `boolean` | `false` | Hides the toolbar, cwd bar and footer |

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+C` / `Cmd+C` | copy the selection, or send SIGINT if nothing is selected |
| `Ctrl+Shift+C`, `Ctrl+Insert` | copy the selection |
| `Ctrl+V` / `Cmd+V`, `Shift+Insert` | paste text, or upload a clipboard image |
| `Ctrl+F` | search the scrollback |
| `Escape` | close the search bar |
| Right-click | copy with a selection, paste without one |

## Security

The server grants an unauthenticated shell with wide-open CORS on localhost. It is a local
development tool: do not deploy it or expose it on a network.

## License

MIT
