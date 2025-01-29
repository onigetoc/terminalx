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
├─ .bolt
│  ├─ config.json
│  ├─ ignore
│  └─ prompt
├─ .clinerules
├─ .git
│  ├─ COMMIT_EDITMSG
│  ├─ config
│  ├─ description
│  ├─ FETCH_HEAD
│  ├─ HEAD
│  ├─ hooks
│  │  ├─ applypatch-msg.sample
│  │  ├─ commit-msg.sample
│  │  ├─ fsmonitor-watchman.sample
│  │  ├─ post-update.sample
│  │  ├─ pre-applypatch.sample
│  │  ├─ pre-commit.sample
│  │  ├─ pre-merge-commit.sample
│  │  ├─ pre-push.sample
│  │  ├─ pre-rebase.sample
│  │  ├─ pre-receive.sample
│  │  ├─ prepare-commit-msg.sample
│  │  ├─ push-to-checkout.sample
│  │  ├─ sendemail-validate.sample
│  │  └─ update.sample
│  ├─ index
│  ├─ info
│  │  └─ exclude
│  ├─ logs
│  │  ├─ HEAD
│  │  └─ refs
│  │     ├─ heads
│  │     │  ├─ main
│  │     │  └─ master
│  │     └─ remotes
│  │        └─ origin
│  │           └─ main
│  ├─ objects
│  │  ├─ 03
│  │  │  └─ f7f07c134cf8c681fda4e179058f0280e7870e
│  │  ├─ 07
│  │  │  └─ b74e1a6d149b7ff9f63fe85bd66908b0b76b02
│  │  ├─ 08
│  │  │  └─ 787ecae4777869fa880e3e5ddb6a57298500ff
│  │  ├─ 0b
│  │  │  ├─ 368d2ee1a01043d2618231f07feed7dc150403
│  │  │  └─ 4beb3c9ce24073dd1f01b1032c1515018eb77d
│  │  ├─ 0c
│  │  │  └─ 059e57b7324f0e496e8f40d8b574b172a5904d
│  │  ├─ 0d
│  │  │  ├─ 3d71446a455c5f997e3cffb25099dab0f74a9b
│  │  │  └─ a798bf2cfaded1ab2dec8f26967d3a2c8692f5
│  │  ├─ 0e
│  │  │  └─ 6f4c4bbe614be0d7a3dd4cd74661dd652638ea
│  │  ├─ 0f
│  │  │  └─ aedd25c318e8f97ea82ee84d9abaf87992042f
│  │  ├─ 11
│  │  │  ├─ c0875ffe28968eadf25351ae5b6e08f335738d
│  │  │  └─ f02fe2a0061d6e6e1f271b21da95423b448b32
│  │  ├─ 13
│  │  │  └─ c1bd3ff9d25fc4c849e1d73f2df8412faa18f3
│  │  ├─ 17
│  │  │  └─ 2cbad02dfa6e7553de7e3f51bc516647f39f36
│  │  ├─ 19
│  │  │  ├─ 2537e00459d7703aaa82c919f23ce5687d0ec5
│  │  │  └─ 45db32558969407bcb5ebb14901d45bef106d9
│  │  ├─ 1b
│  │  │  ├─ 7bc4514fee2a3e7a64189a0f960e10575c2d89
│  │  │  └─ df86d462af62f307f659c0c95b98f97d949e7e
│  │  ├─ 1d
│  │  │  ├─ 4b84dcdff856ad493bbfb0a3dd4a3f09784719
│  │  │  ├─ 6f28392661274fc82e93f778aaf2cfcedbb199
│  │  │  └─ 9eb5165a6d20afd8f567cb64473d90a5c4b346
│  │  ├─ 21
│  │  │  └─ 90bd40c0c6130675db3b528e72d75d7864f12a
│  │  ├─ 22
│  │  │  └─ 31320161b06034f68cd76e2536033eaa3b8ed5
│  │  ├─ 24
│  │  │  └─ c1da4d6cc3d1e2edb1512b1ae26acc87f12d2a
│  │  ├─ 27
│  │  │  ├─ a0b7a772c7748adcd9dcdc9c391692af367eeb
│  │  │  └─ dc7924f5764c2e2e5dca4f4d86372282d11295
│  │  ├─ 28
│  │  │  ├─ 19a830d242f11fda91c4e8951794ab815cec77
│  │  │  └─ 6c61626168a8dd6be67c1b99a2addee0e8cf6b
│  │  ├─ 2a
│  │  │  └─ 99f8243304a44730fe9445d6194b966f537db5
│  │  ├─ 2b
│  │  │  └─ cca0e14447336331a45dd99abf856e2ccbf2f5
│  │  ├─ 2e
│  │  │  └─ e4fcf215234a3619e85ac474d35960e808093f
│  │  ├─ 30
│  │  │  ├─ 6005af04f530f7873f79e14676d270ab3c730d
│  │  │  ├─ 89ddb68c816dda52542682a0f3be9e77a60108
│  │  │  └─ 9d944b98032681c9215102b85c5266cd67d2a7
│  │  ├─ 33
│  │  │  ├─ 17770b68a0adcbe3e456eb9211c4bdbb93de7a
│  │  │  └─ ad091d26d8a9dc95ebdf616e217d985ec215b8
│  │  ├─ 34
│  │  │  └─ 0538822645014490b64564af1e4e89c7ac9c1b
│  │  ├─ 3a
│  │  │  └─ 1bdd7d99c89609f9b41e6ed77369f994c6f24c
│  │  ├─ 3b
│  │  │  └─ 4ea7548c56bb4b33b0ebfbfa8c078fbfbbe5c0
│  │  ├─ 3f
│  │  │  └─ 1f5dc058ea44f8438c12188682c3112c9e788c
│  │  ├─ 41
│  │  │  └─ 3d151b1837cc1197aa943a21319b4c3409a256
│  │  ├─ 44
│  │  │  └─ fc1dedb5d514e7b0a4c57bb1f0da019ba55976
│  │  ├─ 45
│  │  │  └─ a77d51aeabf582abeb86eea75185310b7df63d
│  │  ├─ 49
│  │  │  └─ 7c52bd15f98695d7a2395fb689742388dbacd9
│  │  ├─ 4b
│  │  │  └─ 669ba23f7f25bf1f96c468bc749a3a90bc9600
│  │  ├─ 50
│  │  │  └─ 4aec9e227ca038bded406c5986c10159402ad7
│  │  ├─ 53
│  │  │  ├─ 7e52a5b041590c254e995ceb88e93ede75bc58
│  │  │  └─ d703c67d8db0ea4a6300f84ca27975e56ca7d3
│  │  ├─ 54
│  │  │  └─ faa530bc41cabc082e5330805ab3dd7cc5d325
│  │  ├─ 5a
│  │  │  └─ 1ef36fa455c35fb96bf5593b62b082d8adca53
│  │  ├─ 5b
│  │  │  └─ 2b69b34b0fc2b3e0cbfa84829936d55159a32d
│  │  ├─ 5c
│  │  │  └─ f29e8bc026a679ed444cea689564c2ee20e019
│  │  ├─ 5d
│  │  │  └─ fdf1e67a885c95b0e2993d8154c0e9f73ab2c4
│  │  ├─ 5f
│  │  │  └─ 10552aad583b4b104ad8790d317ec56defbb11
│  │  ├─ 61
│  │  │  ├─ 0d4208a9652bcd153685820c3aeee375d3adf6
│  │  │  ├─ 3283ed0bacfc51a4e919a5241f4ee55238e529
│  │  │  └─ 6a0616cebdee2bd6fb84792f028597a1dfdedd
│  │  ├─ 62
│  │  │  └─ d1f1ea35e0478d3d8c0127323f4fa19a110559
│  │  ├─ 63
│  │  │  ├─ 52fa4dbd040751f7a835b188da5d939fb1b7ad
│  │  │  ├─ 84fcd70d5c958c9b9a0036d1cb9eec81329b9d
│  │  │  └─ dded5c5aa806094dbcc298361e527e32d043b1
│  │  ├─ 65
│  │  │  └─ 56ce806d24b43e01181afa5091ce52c3062804
│  │  ├─ 66
│  │  │  └─ c85c584683406e261f9bbf25c751b93175ccd0
│  │  ├─ 6b
│  │  │  └─ 9cf489ceef6041994bef5169d3b47af0879caa
│  │  ├─ 6e
│  │  │  └─ 9f32bfb1676305e4fc803f7eaf58ca99a51e77
│  │  ├─ 74
│  │  │  └─ 441f97b27ca443b7c6c591634e0c70e2c261b3
│  │  ├─ 75
│  │  │  └─ d761cdf027c2393c2d4864f91bf1684d1a99ff
│  │  ├─ 76
│  │  │  └─ a6112b0a1e16fb9f64224557a259ffa0d728a4
│  │  ├─ 77
│  │  │  └─ b6fe9433b1d6832f8dd84427bc5dfda1de852d
│  │  ├─ 7a
│  │  │  ├─ 32010ea1deeb8bfcb145ed191fda8a38162845
│  │  │  └─ b6ef60ba9e64ad92ab110c320a01110bd3cdb4
│  │  ├─ 7b
│  │  │  └─ 5275225e4be12a11116e846c4870f394eafe2f
│  │  ├─ 7c
│  │  │  └─ 0a99fcca1de40568751489932226054499fc82
│  │  ├─ 7f
│  │  │  └─ b7298fc7b4d6e3ad2cb01f862e6c666ef65bae
│  │  ├─ 80
│  │  │  └─ 3aa2c66b1e262f01a2036b01404c81b6bc684e
│  │  ├─ 82
│  │  │  ├─ 57cafaf71ed3bcec717b7292c4f154ce8d3a90
│  │  │  └─ c2e20ccc2bae01b6589f5f391cb20f34db41fd
│  │  ├─ 87
│  │  │  └─ e3a3a38843b27e135699a4eb6a5e427e105e14
│  │  ├─ 8a
│  │  │  └─ c859bdc495903d11cfa1a42244764e8b03ad85
│  │  ├─ 8b
│  │  │  └─ 4f41a9087a621b48ce0ab4f87af4f8d84afc8f
│  │  ├─ 8c
│  │  │  ├─ 4250a2584293d1f4e4176ce70330af3157cb61
│  │  │  └─ f600a956ec356349c83efaee28056ef85b9466
│  │  ├─ 8d
│  │  │  └─ 0f5c3c1452a115b0b754dadcd5ac6dd606acde
│  │  ├─ 90
│  │  │  └─ e8f2dfc4c95df0dad32bcf3c19b127a7b8f1e6
│  │  ├─ 93
│  │  │  ├─ 1f07ba9fb1df67a356bf0acab8cfe5598c9001
│  │  │  ├─ 586ba8e35e3f6a1920530f2507542ee5290c98
│  │  │  └─ 89e94e681f84ae79fa4f0500f895bd9d49b97c
│  │  ├─ 96
│  │  │  ├─ 05c4e41abfd8be42dbe550dce8851d9ae41151
│  │  │  ├─ 58ec7f79fe6aaee1beb9edea9c36a19cb931a9
│  │  │  ├─ 900a6b8e879ecdd31714140dceaae50f02e001
│  │  │  └─ f4bad7342d47241ac7bb5ed1340728aa2b282a
│  │  ├─ 97
│  │  │  └─ 5fdbc429afca64ae6bfce6fb9d38afac978d70
│  │  ├─ 99
│  │  │  └─ d027f22277e73e64e6b347f4a32d370be0f92a
│  │  ├─ 9c
│  │  │  ├─ 18cc91d5a150fb3541bffe97b47e94502ce410
│  │  │  └─ 6c4d9b8dfad338d482155887e88bf593253d79
│  │  ├─ a3
│  │  │  └─ 13ce18e8b01e943476ad83deabce3f8f08f2d4
│  │  ├─ a4
│  │  │  └─ 08ba5fa5d5e49a921c04d694555967baf3593b
│  │  ├─ a8
│  │  │  └─ 9a862abc9d319c128987268c5db36cb8f3b2a2
│  │  ├─ aa
│  │  │  └─ 38200a55bce417a9bd50ed4b11da846034b5bf
│  │  ├─ ac
│  │  │  ├─ a42e91c26b901f31bab579502ff77bc7d3d9da
│  │  │  ├─ d1595ea4f5df42fecfb251a1114eed2e94377e
│  │  │  └─ efd8f48bb64c419f1e5ded435e4d496fbfe9ce
│  │  ├─ ae
│  │  │  └─ c8d881b1ef6e6ed0097e4df09becc19fda16c9
│  │  ├─ b0
│  │  │  └─ 77ca80871780259dfea6868f4e2b12a731aff5
│  │  ├─ b1
│  │  │  ├─ 04916917cca5dc79acd4b579eb73e597cd59db
│  │  │  └─ b19ea8b73e76f2f6f450b5ec6c20187b087202
│  │  ├─ b2
│  │  │  └─ a44acdbfa2eafef72add7f43dbbd3a16f2ee03
│  │  ├─ b5
│  │  │  └─ 28a80e759338183a6a7c179a1ef352eed737bf
│  │  ├─ b8
│  │  │  └─ d9ac0a332a4e3ba796e175164b2202d4f6e969
│  │  ├─ bc
│  │  │  └─ 9c3fb3196a4038230de22c959e4e4bbd817b90
│  │  ├─ bd
│  │  │  └─ cac39f952c3d7a86e2f2d7c8c41f37724a02b0
│  │  ├─ be
│  │  │  ├─ 13019a5a21b184176869cd4b68d9513206f7da
│  │  │  └─ 5441de19a27257a5724b58f8ffbb4abe42a596
│  │  ├─ bf
│  │  │  └─ 81cf6aa19e9a46d7dc6224340285d57dd4bbcf
│  │  ├─ c0
│  │  │  └─ fac6e7d34b5d561e63fc872e5da6f901215112
│  │  ├─ c2
│  │  │  └─ 54211fba5963889cb0cddf7e219c98d79e1a5f
│  │  ├─ c6
│  │  │  └─ b87a39f01fb1cc8fa1e65f1dd637a81d099907
│  │  ├─ c7
│  │  │  └─ 9ba4e084d89aa057c3245466d732aa3ea07a8b
│  │  ├─ c8
│  │  │  ├─ b4dafef0f9f6920f330aa63737bf9cb7ef5caa
│  │  │  └─ f0988193aed0b1e37f36b9998188deb541b423
│  │  ├─ cb
│  │  │  └─ 09f16aa84e12eba069417ad9df183850b868da
│  │  ├─ cd
│  │  │  └─ d531d360e3dc67e0813fbd77894af640de2af9
│  │  ├─ ce
│  │  │  └─ 65d4b4d540b0d5eb5b08d963d79b451e30305e
│  │  ├─ d0
│  │  │  └─ 460f0eb92355b149da03cc20d3deb203919c08
│  │  ├─ d6
│  │  │  └─ 25eb8eade39f399ea666641faa537e3287a7d9
│  │  ├─ d8
│  │  │  └─ a99763b353960c6b2528d8b49414fcc4698112
│  │  ├─ d9
│  │  │  └─ 95e3a575375fed3a793372e9c70d205f65f775
│  │  ├─ db
│  │  │  └─ 686a272577376c0faef4e789197ebb0f6aef87
│  │  ├─ dc
│  │  │  └─ 95ec77565732aee0f0da6e6950c2e75d3c10b8
│  │  ├─ de
│  │  │  └─ a8dd0f74d3148a706fba199a6718df23835ba5
│  │  ├─ df
│  │  │  └─ 6ce5fd63cc2bd9066d0c607a451a576271e900
│  │  ├─ e1
│  │  │  └─ 9b8ae66db4d2c0430e75282078d0f4a9b320d0
│  │  ├─ e3
│  │  │  └─ 5b7b45a508680bfebc699c112eb13d7404699a
│  │  ├─ e5
│  │  │  └─ 99a50e6ab5962e32166ccda399048b62081598
│  │  ├─ e6
│  │  │  └─ 36da9ea70afb4d6e8e486856cbd52fb2e6bddd
│  │  ├─ e9
│  │  │  └─ fcaf02f517a08883af6fc45220a394fb7f773a
│  │  ├─ ea
│  │  │  └─ feaaee670485257ac0b17636ab3992b8c16816
│  │  ├─ f5
│  │  │  └─ 7282de60bb3197357cad0cd1e6187b3b2a666b
│  │  ├─ f7
│  │  │  └─ 9dc0359d1c785ff906ea7c241c686f6fd2d532
│  │  ├─ f8
│  │  │  └─ da040ef99cbe4fc35e99987f7536d0bf161167
│  │  ├─ fa
│  │  │  └─ 0dbcf2499c4af2ae806a99a7487e47fe6b309f
│  │  ├─ fb
│  │  │  └─ a3aeb202e904eae254e01f6fbd359995bbab20
│  │  ├─ fc
│  │  │  ├─ 63d5ec8041d1ef23ab1207359dc41d4f6a8426
│  │  │  └─ c9887291b5472d3535881e4654490edb491d88
│  │  ├─ fe
│  │  │  └─ 654fedcbe1993ef8077fad0272957fcd182484
│  │  ├─ info
│  │  └─ pack
│  ├─ ORIG_HEAD
│  └─ refs
│     ├─ heads
│     │  ├─ main
│     │  └─ master
│     ├─ remotes
│     │  └─ origin
│     │     └─ main
│     └─ tags
├─ .github
│  └─ copilot-instructions.md
├─ .gitignore
├─ bun.lockb
├─ components.json
├─ eslint.config.js
├─ index.html
├─ package-lock.json
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
│  ├─ utils
│  └─ vite-env.d.ts
├─ tailwind.config.js
├─ tsconfig.app.json
├─ tsconfig.json
├─ tsconfig.node.json
├─ tsconfig.server.json
└─ vite.config.ts

```