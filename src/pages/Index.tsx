import Terminal from "@/components/Terminal/Terminal";
import { Button } from "@/components/ui/button";
import { Play, Terminal as TerminalIcon, Globe } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <h1 className="text-4xl font-bold mb-4">Terminal Demo</h1>
        <meta charSet="UTF-8"></meta>
        <p className="text-lg text-muted-foreground mb-4">
          Try running some commands like "npm -v" or type "help" to see available commands.
        </p>

        <p className="text-lg text-muted-foreground mb-2">
          Launch terminal commands from anywhere (frontend) in your app using:
        </p>
        
        <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-6 rounded-md mb-4 font-mono text-sm">
          <span className="text-[#888888]">// Frontend example</span>{'\n'}
          <span className="text-[#888888]">// Single command</span>{'\n'}
          <span className="text-[#DCDCAA]">executeCommand</span>
          <span className="text-[#D4D4D4]">(</span>
          <span className="text-[#CE9178]">"npm -v"</span>
          <span className="text-[#D4D4D4]">);</span>{'\n\n'}
          <span className="text-[#888888]">// Multiple commands</span>{'\n'}
          <span className="text-[#DCDCAA]">executeCommand</span>
          <span className="text-[#D4D4D4]">(</span>
          <span className="text-[#D4D4D4]">[</span>
          <span className="text-[#CE9178]">"help"</span>
          <span className="text-[#D4D4D4]">, </span>
          <span className="text-[#CE9178]">"about"</span>
          <span className="text-[#D4D4D4]">, </span>
          <span className="text-[#CE9178]">"node -v"</span>
          <span className="text-[#D4D4D4]">]</span>
          <span className="text-[#D4D4D4]">);</span>{'\n\n'}
          <span className="text-[#888888]">// Backend example</span>{'\n'}
          <span className="text-[#DCDCAA]">executeCommand</span>
          <span className="text-[#D4D4D4]">(</span>
          <span className="text-[#CE9178]">"npm -v"</span>
          <span className="text-[#D4D4D4]">);</span>
        </pre>

        <p className="text-lg text-muted-foreground mb-4">
          Or trigger one or multiple commands from everywhere.
        </p>

        <div className="flex flex-wrap gap-2 mb-8">
          <Button
            variant="outline"
            onClick={() => {
              executeCommand(['cd test', 'type todo.txt', 'echo hello', 'cd..'])
                .then(() => console.log("Commande terminée"))
                .catch((err) => console.error("Erreur:", err));
            }}
            className="flex items-center gap-2 border-gray-500"
          >
            <Play className="h-4 w-4" />
            Run npm -v
          </Button>
          <Button
            variant="outline"
            onClick={() => executeCommand(['help', 'npm ls', 'about'])}
            className="flex items-center gap-2 border-gray-500"
          >
            <TerminalIcon className="h-4 w-4" />
            Help, npm ls & About
          </Button>
          <Button
            variant="outline"
            onClick={() => executeCommand('open https://www.google.com/search?q=fake+terminal')}
            className="flex items-center gap-2 border-gray-500"
          >
            <Globe className="h-4 w-4" />
            Open Browser & Google search
          </Button>
          <Button
            variant="outline"
            onClick={() => executeCommand('start https://github.com/onigetoc/fake-terminal-experience',0)}
            className="flex items-center gap-2 border-gray-500"
          >
            <Globe className="h-4 w-4" />
            Open Github Project in browser
          </Button>
          <Button
            variant="outline"
            onClick={() => executeCommand('tree /f')}
            className="flex items-center gap-2 border-gray-500"
          >
            <TerminalIcon className="h-4 w-4" />
            Get folder tree
          </Button>
          <Button
            variant="outline"
            onClick={() => executeCommand('wmic product get name')}
            className="flex items-center gap-2 border-gray-500"
          >
            <TerminalIcon className="h-4 w-4" />
            Programs installed on your PC
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              executeCommand([
                'git add .',
                'git commit -m "update terminal functionality"',
                'git push origin main'
              ])
                .then(() => console.log("Commit et push terminés"))
                .catch((err) => console.error("Erreur:", err));
            }}
            className="flex items-center gap-2 border-gray-500"
          >
            <TerminalIcon className="h-4 w-4" />
            Commit & Push
          </Button>
          <Button
            variant="outline"
            onClick={() => window.handleToggleTerminal?.()}
            className="flex items-center gap-2 border-gray-500"
          >
            <TerminalIcon className="h-4 w-4" />
            Toggle Terminal
          </Button>
        </div>
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