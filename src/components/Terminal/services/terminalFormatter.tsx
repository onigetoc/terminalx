import React from 'react';
import type { ReactNode } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import Ansi from 'ansi-to-react';

// Improved regex patterns
const URL_REGEX = /https?:\/\/[^\s"')]+/g;
const PATH_REGEX = /[A-Za-z]:\\(?:[^\\/:*?"<>|\r\n]+\\)+[^\\/:*?"<>|\r\n'")]+/g;

interface FormatOptions {
  convertPaths?: boolean;
}

interface LinkProps {
  href: string;
  children: string;
  className?: string;
}

/**
 * Format command with syntax highlighting
 */
export function formatCommand(command: string): JSX.Element {
  const words = command.split(' ');
  const firstWord = words[0] ?? '';
  const rest = command.slice(firstWord.length);

  // Match parameters (-x or --xxx) and quoted strings
  const paramRegex = /(\s-[a-zA-Z]+|\s--[a-zA-Z-]+)|("[^"]*")|('[^']*')/g;

  const formattedRest = rest.replace(paramRegex, match => {
    if (match.startsWith(' -')) {
      return `<span class="text-gray-400">${match}</span>`;
    }
    return `<span class="text-[#3b8eea]">${match}</span>`;
  });

  return (
    <>
      <span className="text-yellow-300">{firstWord}</span>
      <span
        className="terminal-command"
        dangerouslySetInnerHTML={{ __html: formattedRest }}
      />
    </>
  );
}

/**
 * Creates a clickable link component
 */
function createLink(content: string, href: string, key: number): JSX.Element {
  const handleClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.open(href, '_blank');
  };

  return (
    <a
      key={key}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="terminal-link"
      onClick={handleClick}
    >
      {content}
    </a>
  );
}

/**
 * Format text to detect and convert URLs to clickable links
 */
export function formatTextWithLinks(text: string, executeCommand: (cmd: string, display?: number) => void): JSX.Element {
  const parts: Array<{ type: 'text' | 'url' | 'path'; content: string }> = [];
  let lastIndex = 0;
  let match;

  // First find all URLs
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }
    parts.push({
      type: 'url',
      content: match[0]
    });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }

  // Process each text part for file paths
  const finalParts = parts.flatMap(part => {
    if (part.type !== 'text') return [part];

    const pathParts: typeof parts = [];
    let textLastIndex = 0;
    let pathMatch;

    while ((pathMatch = PATH_REGEX.exec(part.content)) !== null) {
      if (pathMatch.index > textLastIndex) {
        pathParts.push({
          type: 'text',
          content: part.content.slice(textLastIndex, pathMatch.index)
        });
      }
      pathParts.push({
        type: 'path',
        content: pathMatch[0]
      });
      textLastIndex = pathMatch.index + pathMatch[0].length;
    }

    if (textLastIndex < part.content.length) {
      pathParts.push({
        type: 'text',
        content: part.content.slice(textLastIndex)
      });
    }

    return pathParts;
  });

  return (
    <pre className="whitespace-pre-wrap break-words font-mono">
      {finalParts.map((part, index) => {
        if (part.type === 'url') {
          return (
            <a
              key={`url-${index}`}
              href={part.content}
              className="terminal-link"
              onClick={(e) => {
                e.preventDefault();
                window.open(part.content, '_blank', 'noopener,noreferrer');
              }}
            >
              {part.content}
            </a>
          );
        }
        if (part.type === 'path') {
          return (
            <a
              key={`path-${index}`}
              className="terminal-link text-[#3b8eea] hover:underline cursor-pointer"
              onClick={() => {
                executeCommand(`explorer "${part.content}"`, 0);
              }}
            >
              {part.content}
            </a>
          );
        }
        return <span key={`text-${index}`}>{part.content}</span>;
      })}
    </pre>
  );
}

// Update the FormattedOutput component
export interface FormattedOutputProps {
  text: string;
  executeCommand: (cmd: string, display?: number) => void;
}

/**
 * Component that combines link formatting
 */
export function FormattedOutput({ text, executeCommand }: FormattedOutputProps): JSX.Element {
  // Check if the text contains ANSI escape codes
  const hasAnsiCodes = /\u001b\[\d+m/.test(text);

  return (
    <div className="terminal-output">
      {hasAnsiCodes ? (
        <Ansi>{text}</Ansi>
      ) : (
        formatTextWithLinks(text, executeCommand)
      )}
    </div>
  );
}
