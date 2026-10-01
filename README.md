# TerminalX

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

The window is `position: fixed` at the bottom of the viewport, so it covers whatever sits
underneath. Give the component a way to report its height and reserve that space in your page:

```jsx
import { useState } from "react";
import Terminal from "@/components/Terminal/Terminal";

const App = () => {
  const [terminalHeight, setTerminalHeight] = useState(0);
  return (
    <div style={{ paddingBottom: terminalHeight }}>
      {/* your page */}
      <Terminal onHeightChange={setTerminalHeight} config={{ initialState: 'open' }} />
    </div>
  );
};
```

`onHeightChange` fires on open/close, minimize, fullscreen and while dragging the top edge.
It reports `0` when the terminal is closed or fullscreen, `40` when minimized, and the current
pixel height otherwise. Skip the prop and the terminal behaves as a plain overlay.

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
| `initialState` | `'open' \| 'fullscreen' \| 'minimized' \| 'closed'` | `'open'` | State of the window on mount. `'closed'` shows only the floating button |
| `defaultHeight` | `number` | `340` | Window height in px, and the height restored when leaving fullscreen |
| `minHeight` | `number` | `200` | Minimum height when dragging |
| `fontSize` | `number` | `14` | Font size |
| `fontFamily` | `string` | `'monospace'` | Font family |
| `scrollbackLimit` | `number` | `1000` | Lines kept in the xterm scrollback |
| `showTerminal` | `boolean` | `true` | Set false to hide the terminal entirely (read on mount only; afterwards use `window.handleToggleTerminal()`) |
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

## Integrating with your page layout

The terminal is a self-contained React component: it never touches the layout of the page that
hosts it. Everything it needs from you is one number, and everything you need to know is below.
This is the advanced part — the short version is the `onHeightChange` example above.

### Why you reserve the space yourself

The window is `position: fixed`, docked to the bottom of the viewport. It therefore floats over
your content instead of pushing it. To stop it covering the bottom of your page, apply the height
it reports as padding/margin on whatever scroll container you own:

```jsx
<div style={{ paddingBottom: terminalHeight }}>…</div>
```

The component does not inject styles into `<body>`, does not alter your DOM, and does not assume a
particular layout. If your app has a fixed header/footer or an inner scroll area, put the padding
on the element that actually scrolls.

### Height reporting

`onHeightChange(height)` is called whenever the occupied height changes:

- `0` — closed, or fullscreen (fullscreen is a deliberate overlay over everything; reserving
  space would make no sense, so exit fullscreen before scrolling the page).
- `40` — minimized to the title bar.
- otherwise — the window height in px, following the drag on the top edge.

Use the value however you want: `padding-bottom`, a CSS variable, a grid row, a flex spacer.

### Scroll behaviour

The terminal keeps scrolling to itself. When the mouse is over the terminal, the wheel scrolls
the xterm buffer and **not** your page, even at the top or bottom of the scrollback. This is
enforced both in CSS (`overscroll-behavior: contain`) and with a `wheel` listener on the terminal
container, because xterm drives scrolling in JavaScript. You do not need to do anything.

### Fullscreen

In fullscreen the terminal covers the viewport, but the host page would still show its scrollbar
on top of it. While fullscreen is active the component sets `overflow: hidden` on
`document.documentElement` (standard modal behaviour) and restores the previous value on exit.
Outside fullscreen the page scrollbar is left untouched — your page still has to scroll.

### Lifecycle and page navigation

- `handleToggleTerminal` exists only while `<Terminal />` is mounted, and is removed on unmount.
- Closing the window (`X`) does **not** unmount the component — it just hides it. The floating
  button remains and can reopen it.
- Unmounting the component (route change, conditional render) tears down the WebSocket and sends
  `kill`: the shell is gone. To keep the terminal alive across SPA navigation, mount it in a
  layout component that stays mounted above your routes.
- A full page reload always starts a fresh shell.

### Server side

The frontend discovers the server itself by probing `/health` on ports 3003–3010, so no
configuration is needed. The shell is chosen per platform; override it with `INTERACTIVE_SHELL`.
The working directory is stored server-side (per process) and mirrored in `localStorage` under
`terminalDirectory`, so the folder picker survives a reload. See the `server/` sources for details.

## Security

The server grants an unauthenticated shell with wide-open CORS on localhost. It is a local
development tool: do not deploy it or expose it on a network.

## License

MIT
