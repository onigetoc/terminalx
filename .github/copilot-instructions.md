# React Terminal Emulator
You are a seasoned React developer specializing in creating immersive browser experiences.

## Project Context
Create a React-based terminal emulator that provides a realistic command-line interface experience in the browser. The terminal emulator should have a realistic UI with common terminal features, including a draggable and resizable window.

### Key Features
- Implement a realistic terminal UI with common terminal features
- Develop a draggable and resizable terminal window
- Support basic commands like `npm -v`, `node -v`, `npm run dev`
- Incorporate terminal window controls (minimize, maximize, close)
- Enable command history navigation using up/down arrows
- Simulate custom command output
- Allow for configurable prompt and theme
- Implement copy/paste support
- Very simple code usage for the user you want to use our Terminal in is project who execute command from the terminal and outside the terminal with the function executeCommand

## Code Style and Structure
- Write concise, technical JavaScript code with accurate examples
- Use functional and declarative programming patterns; avoid classes
- Prefer iteration and modularization over code duplication
- Use descriptive variable names with auxiliary verbs

## Tech Stack
- Vite
- React
- Vitest
- Tailwind CSS
- typescript
- React Lucide
- HTML/CSS
- CSS Framework (e.g., Tailwind CSS)

## Naming Conventions
- Use lowercase with dashes for directories (e.g., components/terminal-window)
- Favor named exports for components and utilities
- Use PascalCase for component files (e.g., TerminalWindow.js)
- Use camelCase for utility files (e.g., terminalUtils.js)

## State Management
- Use React Context for global state when needed
- Implement proper state persistence using local storage
- Implement proper cleanup in useEffect hooks

## Syntax and Formatting
- Use "function" keyword for pure functions
- Avoid unnecessary curly braces in conditionals
- Use declarative JSX
- Implement proper JavaScript syntax for message types

## UI and Styling
- Use a CSS framework (e.g., Tailwind CSS) for styling
- Implement a realistic terminal UI with common terminal features
- Consider browser-specific constraints (window dimensions, permissions)
- Follow Material Design guidelines for browser applications
- When adding new UI components, document the installation command

## Performance Optimization
- Minimize bundle size using code splitting
- Implement proper lazy loading for non-critical components
- Optimize terminal rendering
- Use proper caching strategies
- Implement proper cleanup for event listeners and observers

## Error Handling
- Log errors appropriately for debugging
- Provide user-friendly error messages
- Handle network failures gracefully

## Testing
- Write unit tests for utilities and components
- Implement E2E tests for critical flows
- Test across different browsers and versions
- Test memory usage and performance

## Security
- Implement Content Security Policy
- Sanitize user inputs
- Handle sensitive data properly
- Follow browser application security best practices
- Implement proper CORS handling

## Git Usage
Commit Message Prefixes:
- "fix:" for bug fixes
- "feat:" for new features
- "perf:" for performance improvements
- "docs:" for documentation changes
- "style:" for formatting changes
- "refactor:" for code refactoring
- "test:" for adding missing tests
- "chore:" for maintenance tasks

Rules:
- Use lowercase for commit messages
- Keep the summary line concise
- Include description for non-obvious changes
- Reference issue numbers when applicable

## Development Workflow
- Use proper version control
- Implement proper code review process
- Test in multiple environments
- Follow semantic versioning for releases
- Maintain changelog


Create a search functionality in the terminal that allows the user to search for words or phrases within the terminal content while excluding elements with the class terminal-command. The search should be similar to that in Google Chrome, where occurrences of the search are highlighted with a gray background, and the current occurrence is highlighted with an orange background. The necessary CSS is already present in terminal.css. The search should be conducted via a search box that only searches within the terminal content.

When the user types letters, the first occurrence should be highlighted immediately, without the need to press Enter. When the user types additional letters, the current occurrence should remain highlighted as long as the letters match. The user should be able to navigate between occurrences using the arrow keys and the Enter key. Scrolling should work when the search is before or after the current occurrence.

The search functionality should be exactly like that of a webpage search in Google Chrome or in the VS Code Terminal. The functional requirements are as follows:

Search within the terminal content, excluding elements with the class terminal-command
Highlight occurrences of the search with a gray background
Highlight the current occurrence with an orange background
Allow the user to navigate between occurrences using the arrow keys and the Enter key
Scroll the terminal content when the search is before or after the current occurrence
Immediately highlight the first occurrence when the user types letters, without needing to press Enter.

To ensure a seamless development experience, consider creating and updating a `.cursorrules`, `.windsurfrules` or `.github/copilot-instructions.md` file to document best practices and provide guidance for future contributors. This will help maintain a consistent coding style and facilitate collaboration.


## Project structure tree
```
terminal/
├── components.json
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── project_structure.text
├── README.md
├── src/
│   ├── components/
│   │   ├── Terminal/
│   │   │   ├── config/
│   │   │   │   └── terminalConfig.ts
│   │   │   ├── server/
│   │   │   │   ├── commandService.ts
│   │   │   │   └── index.ts
│   │   │   ├── services/
│   │   │   │   ├── customCommands.ts
│   │   │   │   ├── encodingUtils.txt
│   │   │   │   ├── terminalApi.ts
│   │   │   │   ├── terminalFormatter.tsx
│   │   │   │   └── terminalFormatter.txt
│   │   │   ├── styles/
│   │   │   │   └── terminal.css
│   │   │   ├── Terminal.tsx
│   │   │   ├── TerminalSearch.tsx
│   │   │   ├── TerminalUI.tsx
│   │   │   └── utils/
│   │   │       ├── commandOS.ts
│   │   │       └── terminalUtils.ts
│   │   └── ui/
│   │       └── [UI Components].tsx
│   ├── hooks/
│   │   └── use-toast.ts
│   ├── index.css
│   ├── lib/
│   │   └── utils.ts
│   ├── main.tsx
│   ├── pages/
│   │   └── Index.tsx
│   ├── styles/
│   ├── types/
│   │   └── window.d.ts
│   └── vite-env.d.ts
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.server.json
└── vite.config.ts
```

# Best Practices for Terminal Output Rendering

- Use the FormattedOutput component to render all terminal output.  
- Do not call formatTextWithLinks directly as it may lead to duplicate link creation.
- This ensures that:
  - All URLs and file paths are correctly highlighted
  - Only one instance of link formatting is applied per output  
- Future contributions should adhere to this rule to maintain a consistent user experience.
