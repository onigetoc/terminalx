# Terminal Emulator

A realistic terminal emulator built with React, Vite, and TypeScript that provides a command-line interface experience in the browser.

## Features

- 🖥️ Realistic terminal UI with common features
- 🔄 Draggable and resizable terminal window 
- ⌨️ Support for basic commands (`npm -v`, `node -v`, `npm run dev`, etc.)
- 🎯 Terminal window controls (minimize, maximize, close)
- ⬆️ Command history navigation using up/down arrows
- 🎨 Configurable prompt and theme
- 📋 Copy/paste support
- 🔍 Chrome-like search functionality (Ctrl+F)
- 🚀 Execute commands from anywhere in your app
- 🖥️ **Interactive terminal mode (PTY)** to run full-screen CLIs like Claude, OpenCode, vim, htop, nano

Perfect for:
- Web-based development environments
- Remote system administration
- Educational platforms
- Command-line training
- Cloud-based terminal access

React-based terminal emulator that provides a realistic command-line interface experience in the browser.

- Realistic terminal UI with common terminal features
- Draggable/resizable terminal window
- Support for basic commands like `npm -v`, `node -v`, `npm run dev`
- Terminal window controls (minimize, maximize, close)
- Command history navigation (up/down arrows)
- Custom command output simulation
- Configurable prompt and theme
- Copy/paste support
- **Cross-Platform Command Translation**: Automatically translates commands between different operating systems
  - Example: `ls` on Windows becomes `dir`, and `dir` on Unix becomes `ls`
  - Works with most common terminal commands:
    ```bash
    # Windows to Unix translation
    type package.json  ->  cat package.json
    dir               ->  ls
    findstr           ->  grep

    # Unix to Windows translation
    cat package.json  ->  type package.json
    ls               ->  dir
    grep             ->  findstr
    ```

### Supported Command Translations

| Windows Command | Unix Command (MacOS/Linux) | Description |
|----------------|---------------------------|-------------|
| type           | cat                      | Display file contents |
| dir            | ls                       | List directory contents |
| findstr        | grep                     | Search text patterns |
| cls            | clear                    | Clear screen |
| copy           | cp                       | Copy files |
| move           | mv                       | Move/rename files |
| del            | rm                       | Delete files |
| echo           | echo                     | Display messages |
| tasklist       | ps                       | List processes |
| taskkill       | kill                    | Terminate processes |

The terminal automatically detects your operating system and translates commands accordingly, providing a seamless experience across different platforms.

## Screenshots

Here are some screenshots of the Fake Terminal Experience in action:

### Terminal UI
![Terminal UI](https://raw.githubusercontent.com/onigetoc/fake-terminal-experience/refs/heads/main/public/terminal-screenshot.png)

![Terminal UI anime](https://raw.githubusercontent.com/onigetoc/fake-terminal-experience/refs/heads/main/public/terminal-anime.gif)

## Getting Started

### Prerequisites

- Node.js (v20.11.0 or higher)
- npm (v10.2.4 or higher)

### Installation

1. Clone this repository:
```sh
git clone https://github.com/onigetoc/fake-terminal-experience.git
```

2. Navigate to project directory:
```sh
cd fake-terminal-experience
```

3. Install dependencies:
```sh
npm install
```

4. Start the development server:
```sh
npm run dev
```

## How to use in your own project

To use the Fake Terminal Experience in your project, follow these steps:

1. Clone this repository:
```sh
git clone https://github.com/onigetoc/fake-terminal-experience.git
```

2. Copy all folders and files from the fake-terminal-experience project into your React project, except for `pages/index.tsx` to avoid overwriting your existing index file.

3. In your `package.json`, add the following script:
    ```json
    "scripts": {
      "start:terminal-server": "node src/server/index.js"
    }
    ```

4. Install the necessary dependencies (list the main dependencies here).

5. Run the server:
    ```bash
    npm run start:terminal-server
    ```

## Usage

### Basic Terminal Component
To use the terminal in your React component, import and add the Terminal component:
```javascript
import Terminal from "@/components/Terminal/Terminal";

const YourComponent = () => {
  return (
    <div>
      <h1>Your Component</h1>
      <Terminal />
    </div>
  );
};

export default YourComponent;
```

### Executing Commands
You can execute commands in two ways:

#### From within the terminal
Simply type your command and press Enter.

#### From anywhere in your application
The terminal exposes a global `executeCommand` function that you can use from anywhere:

```javascript
// Single command
executeCommand("npm -v");

// Multiple commands
executeCommand(["help", "about", "node -v"]);

// Execute without displaying in terminal (second parameter = 0)
executeCommand("npm -v", 0);
```

### Toggle Terminal Visibility
You can toggle the terminal's visibility from anywhere in your application using the global `handleToggleTerminal` function:

```javascript
// In any component or event handler:
<button onClick={() => window.handleToggleTerminal?.()}>
  Toggle Terminal
</button>
```

This function is automatically available after importing the Terminal component, no additional imports needed.

#### Terminal Visibility Lifecycle
- The terminal maintains its state and content even when hidden
- Toggling visibility only affects the display, not the terminal's state
- Commands can still be executed while the terminal is hidden
- All history and context is preserved between visibility toggles

### Example Usage

```javascript
import Terminal from "@/components/Terminal/Terminal";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <h1 className="text-4xl font-bold mb-4">Terminal Demo</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Try running some commands like "npm -v" or type "help" to see available commands.
        </p>
      </div>
      <Terminal />
    </div>
  );
};

export default Index;
```

Make sure to start both your React application and the terminal server for full functionality.

5. Open your browser and visit http://localhost:5173

## Usage

The terminal supports the following commands:
- `clear` - Clear the terminal screen
- `help` - Display available commands
- `npm -v` - Show npm version
- `node -v` - Show Node.js version
- `npm run dev` - Start development server
- Use up/down arrows to navigate command history

### Displaying Commands in the Terminal

You can choose whether to display a command in the terminal or not by using the `displayInTerminal` argument.

#### Backend

```javascript
// Display the command in the terminal (default)
executeCommand("npm -v");
// or
executeCommand("npm -v", 1);

// Do not display the command in the terminal
executeCommand("npm -v", 0);
```

#### Frontend

```javascript
// Display the command in the terminal (default)
handleRunCommand("npm -v");
// or
handleRunCommand("npm -v", 1);

// Do not display the command in the terminal
handleRunCommand("npm -v", 0);
```

## Interactive Terminal (PTY)

TerminalX is not only a "demo" terminal: an **interactive mode** backed by a real
pseudo-terminal (`node-pty`) lets you launch full-screen, interactive CLIs
(**Claude**, **OpenCode**, `vim`, `htop`, `nano`, `top`…) right in the browser.

### Enable it

1. Click the **🖥️ (MonitorPlay)** icon in the terminal toolbar.
2. The history area is replaced by an `xterm.js` terminal attached to a real shell.
3. Type your command (e.g. `claude`, `opencode`) and press `Enter`.
4. `exit` or `Ctrl+C` to leave the session. The **Kill** (BadgeX) button restarts it.
5. Toggle back with the same icon, or with the `Ctrl+Shift+I` keyboard shortcut.

### Prerequisites

- The CLIs you want to launch must be **installed and on the `PATH`** of the server
  shell (e.g. `npm i -g @anthropic-ai/claude-code`).
- Default shell: **PowerShell** on Windows (`powershell.exe`), otherwise
  `$SHELL`/`bash`. Override it with the `INTERACTIVE_SHELL` environment variable.

### How it works

The interactive mode replaces the "one command / one response" model (which provides
no TTY, no stdin, and buffers the output until the process exits) with a
**persistent session**:

- The server opens a pseudo-terminal via `node-pty` and **streams the ANSI output in
  real time** over a WebSocket (`/ws/pty`).
- Keystrokes from the browser are **written back** into the shell.
- Window resizing is forwarded to the shell.

WebSocket (JSON) protocol:
- Client → Server: `spawn`, `input`, `resize`, `kill`
- Server → Client: `ready`, `output`, `exit`, `error`

### Simple mode vs interactive mode

The terminal also keeps a "simple" mode (text history + custom commands
`help`/`open`/`getuserlang`, cross-OS translation `ls`↔`dir`). Both modes coexist:
switch between them with the 🖥️ button.

## Configuration

You can customize the terminal by modifying the following files:
- `src/config/terminal.config.ts` - Terminal settings
- `src/themes/` - Terminal themes and styles

### Customizing the Terminal

The `terminalConfig.ts` file allows you to customize various aspects of the terminal. Here are the available options:

| Option                | Type      | Default Value | Description                                      |
|-----------------------|-----------|---------------|--------------------------------------------------|
| initialState          | string    | 'open'        | Terminal initial state ('open', 'minimized', 'hidden') |
| readOnlyMode          | boolean   | false         | If true, disables input and all user interactions with the terminal |
| startFullscreen       | boolean   | false         | Start in fullscreen mode                         |
| startMinimized        | boolean   | false         | Start in minimized mode                          |
| defaultHeight         | number    | 320           | Default height of the terminal window            |
| minHeight             | number    | 200           | Minimum height of the terminal window            |
| minWidth              | number    | 300           | Minimum width of the terminal window             |
| showExecutedCommands  | boolean   | true          | Show executed commands in the terminal           |
| keepCommandHistory    | boolean   | true          | Keep command history                             |
| maxHistoryLength      | number    | 100           | Maximum length of command history                |
| theme                 | string    | 'dark'        | 'dark', 'light', or custom theme name            |
| fontSize              | number    | 14            | Font size in the terminal                        |
| fontFamily            | string    | 'monospace'   | Font family in the terminal                      |
| showTerminal          | boolean   | true          | If false, hides the terminal completely          |
| showFloatingButton    | boolean   | true          | Show floating button to open terminal            |
| showPath              | boolean   | true          | Show current path in the terminal                |
| maxOutputLength       | number    | 1000          | Maximum length of terminal output                |
| scrollbackLimit       | number    | 1000          | Scrollback limit in the terminal                 |

You can modify these options to fit your needs. For example, to start the terminal in minimized mode with a custom prompt symbol, you can update the configuration as follows:

```typescript
import { terminalConfig } from '@/config/terminalConfig';

terminalConfig.set({
  readOnlyMode: true, // If true, disables input and all user interactions with the terminal 
  fontSize: 15,   
  // Other configurations...
});
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## TODO
- Add search in terminal
- More setting options

```
bolt-terminal
├─ components.json
├─ eslint.config.js
├─ index.html
├─ package.json
├─ postcss.config.js
├─ project_structure.text
├─ README.md
├─ src
│  ├─ components
│  │  ├─ Terminal
│  │  │  ├─ config
│  │  │  │  └─ terminalConfig.ts
│  │  │  ├─ server
│  │  │  │  ├─ commandService.ts
│  │  │  │  └─ index.ts
│  │  │  ├─ services
│  │  │  │  ├─ customCommands.ts
│  │  │  │  ├─ encodingUtils.txt
│  │  │  │  ├─ terminalApi.ts
│  │  │  │  ├─ terminalFormatter.tsx
│  │  │  │  └─ terminalFormatter.txt
│  │  │  ├─ styles
│  │  │  │  └─ terminal.css
│  │  │  ├─ Terminal.tsx
│  │  │  ├─ TerminalSearch.tsx
│  │  │  ├─ TerminalUI.tsx
│  │  │  └─ utils
│  │  │     ├─ commandOS.ts
│  │  │     └─ terminalUtils.ts
│  │  └─ ui
│  │     ├─ accordion.tsx
│  │     ├─ alert-dialog.tsx
│  │     ├─ alert.tsx
│  │     ├─ aspect-ratio.tsx
│  │     ├─ avatar.tsx
│  │     ├─ badge.tsx
│  │     ├─ breadcrumb.tsx
│  │     ├─ button.tsx
│  │     ├─ calendar.tsx
│  │     ├─ card.tsx
│  │     ├─ carousel.tsx
│  │     ├─ chart.tsx
│  │     ├─ checkbox.tsx
│  │     ├─ collapsible.tsx
│  │     ├─ command.tsx
│  │     ├─ context-menu.tsx
│  │     ├─ dialog.tsx
│  │     ├─ drawer.tsx
│  │     ├─ dropdown-menu.tsx
│  │     ├─ form.tsx
│  │     ├─ hover-card.tsx
│  │     ├─ input-otp.tsx
│  │     ├─ input.tsx
│  │     ├─ label.tsx
│  │     ├─ menubar.tsx
│  │     ├─ navigation-menu.tsx
│  │     ├─ pagination.tsx
│  │     ├─ popover.tsx
│  │     ├─ progress.tsx
│  │     ├─ radio-group.tsx
│  │     ├─ resizable.tsx
│  │     ├─ scroll-area.tsx
│  │     ├─ select.tsx
│  │     ├─ separator.tsx
│  │     ├─ sheet.tsx
│  │     ├─ skeleton.tsx
│  │     ├─ slider.tsx
│  │     ├─ sonner.tsx
│  │     ├─ switch.tsx
│  │     ├─ table.tsx
│  │     ├─ tabs.tsx
│  │     ├─ textarea.tsx
│  │     ├─ toast.tsx
│  │     ├─ toaster.tsx
│  │     ├─ toggle-group.tsx
│  │     ├─ toggle.tsx
│  │     └─ tooltip.tsx
│  ├─ hooks
│  │  └─ use-toast.ts
│  ├─ index.css
│  ├─ lib
│  │  └─ utils.ts
│  ├─ main.tsx
│  ├─ pages
│  │  └─ Index.tsx
│  ├─ styles
│  ├─ types
│  │  └─ window.d.ts
│  └─ vite-env.d.ts
├─ tailwind.config.js
├─ tsconfig.app.json
├─ tsconfig.json
├─ tsconfig.node.json
├─ tsconfig.server.json
└─ vite.config.ts
