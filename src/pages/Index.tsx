import Terminal from "@/components/Terminal/Terminal";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <h1 className="text-4xl font-bold mb-4">TerminalX Demo</h1>
        <p className="text-lg text-muted-foreground mb-4">
          A real shell in the browser: xterm.js renders the screen, node-pty runs
          the shell on the server, and a WebSocket streams both ways. Click the
          terminal below and run anything — including full-screen CLIs.
        </p>

        <p className="text-lg text-muted-foreground mb-2">
          Drop the terminal in any page:
        </p>

        <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-6 rounded-md mb-4 font-mono text-sm">
          <span className="text-[#888888]">// Mount it once, anywhere</span>{'\n'}
          <span className="text-[#DCDCAA]">import</span>
          <span className="text-[#D4D4D4]"> Terminal </span>
          <span className="text-[#DCDCAA]">from</span>
          <span className="text-[#CE9178]">"@/components/Terminal/Terminal"</span>
          <span className="text-[#D4D4D4]">;</span>{'\n\n'}
          <span className="text-[#DCDCAA]">const</span>
          <span className="text-[#D4D4D4]"> App = () =&gt; (</span>{'\n'}
          <span className="text-[#D4D4D4]">  &lt;</span>
          <span className="text-[#569CD6]">Terminal</span>
          <span className="text-[#D4D4D4]"> config=</span>
          <span className="text-[#D4D4D4]">{'{'}</span>
          <span className="text-[#9CDCFE]"> initialState</span>
          <span className="text-[#D4D4D4]">: </span>
          <span className="text-[#CE9178]">'open'</span>
          <span className="text-[#D4D4D4]">, </span>
          <span className="text-[#9CDCFE]">defaultHeight</span>
          <span className="text-[#D4D4D4]">: </span>
          <span className="text-[#B5CEA8]">340</span>
          <span className="text-[#D4D4D4]">, </span>
          <span className="text-[#9CDCFE]">fontSize</span>
          <span className="text-[#D4D4D4]">: </span>
          <span className="text-[#B5CEA8]">14</span>
          <span className="text-[#D4D4D4]">{'}'} /&gt;</span>{'\n'}
          <span className="text-[#D4D4D4]">);</span>
        </pre>

        <p className="text-lg text-muted-foreground mb-2">
          Toggle the window from anywhere on the page:
        </p>

        <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-6 rounded-md mb-4 font-mono text-sm">
          <span className="text-[#888888]">// No import needed, registered on mount</span>{'\n'}
          <span className="text-[#D4D4D4]">&lt;</span>
          <span className="text-[#569CD6]">button</span>
          <span className="text-[#D4D4D4]"> onClick={'{'}() =&gt; </span>
          <span className="text-[#DCDCAA]">window</span>
          <span className="text-[#D4D4D4]">.</span>
          <span className="text-[#DCDCAA]">handleToggleTerminal</span>
          <span className="text-[#D4D4D4]">?.(){'}'} /&gt;</span>{'\n'}
          <span className="text-[#D4D4D4]">  </span>
          <span className="text-[#CE9178]">Toggle Terminal</span>
          <span className="text-[#D4D4D4]">&lt;/</span>
          <span className="text-[#569CD6]">button</span>
          <span className="text-[#D4D4D4]">&gt;</span>
        </pre>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div>
            <h2 className="text-xl font-semibold mb-2">Shortcuts</h2>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li><span className="font-mono text-foreground">Ctrl+C</span> — copy selection, or SIGINT if nothing selected</li>
              <li><span className="font-mono text-foreground">Ctrl+Shift+C</span> — copy selection</li>
              <li><span className="font-mono text-foreground">Ctrl+V</span> — paste text or an image</li>
              <li><span className="font-mono text-foreground">Ctrl+F</span> — search the scrollback</li>
              <li>Drop a file — the server stores it and inserts the path</li>
              <li>Right-click — copy with a selection, paste without</li>
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Toolbar</h2>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Kill — restarts the session with a fresh shell</li>
              <li>Folder — sets the working directory for the next session</li>
              <li>Clear — empties the buffer without touching the shell</li>
              <li>Help / About — written straight into the buffer</li>
              <li>Minimize, fullscreen, and drag the top edge to resize</li>
            </ul>
          </div>
        </div>

        <p className="text-lg text-muted-foreground mb-4">
          Try <span className="font-mono text-foreground">claude</span>,{' '}
          <span className="font-mono text-foreground">opencode</span>,{' '}
          <span className="font-mono text-foreground">vim</span> or{' '}
          <span className="font-mono text-foreground">htop</span> — the shell is
          PowerShell on Windows, <span className="font-mono text-foreground">$SHELL</span> elsewhere.
          Override it with the <span className="font-mono text-foreground">INTERACTIVE_SHELL</span> env var.
        </p>
      </div>

      <Terminal
        config={{
          readOnlyMode: false,
          initialState: 'open',
          defaultHeight: 340,
        }}
      />
    </div>
  );
};

export default Index;
