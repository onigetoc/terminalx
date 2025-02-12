import React from 'react';
import type { ReactNode } from 'react';
import Ansi from 'ansi-to-react';

// Utility function to properly decode text ensuring UTF-8 compatibility
function decodeText(text: string): string {
  try {
    // Try to decode potential escaped unicode characters
    return decodeURIComponent(escape(text));
  } catch (e) {
    // If decoding fails, return original text
    return text;
  }
}

// Improved regex patterns for URLs and file paths
const URL_REGEX = /https?:\/\/[^\s"')]+/g;
const PATH_REGEX = /(?:["]?[A-Za-z]:\\(?:[^\\/:*?<>|\r\n]+\\)*[^\\/:*?<>|\r\n]+["]?|\(["]?[A-Za-z]:\\(?:[^\\/:*?<>|\r\n]+\\)*[^\\/:*?<>|\r\n]+["]?\))/g;

// Regex pour détecter les drapeaux de commande (options)
const FLAG_PATTERN = /(\s|^)(-{1,2}[a-zA-Z0-9]+)/g;

interface FormatOptions {
  convertPaths?: boolean;
}

/**
 * Format command with syntax highlighting 
 */
export function formatCommand(command: string): React.ReactNode {
  const [cmd, ...args] = command.split(/\s+/);

  return (
    <span className="terminal-command">
      <span className="text-yellow-300">{cmd}</span>
      {args.map((part, index) => (
        <React.Fragment key={index}>
          {' '}
          {part.startsWith('-') ? (
            <span className="text-gray-400">{part}</span>
          ) : (
            part
          )}
        </React.Fragment>
      ))}
    </span>
  );
}

/**
 * Format text to detect and convert URLs and file paths to clickable links
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

      // Clean the path by removing surrounding quotes if present
      const rawPath = pathMatch[0];
      const cleanPath = rawPath.replace(/^["']|["']$/g, '');

      pathParts.push({
        type: 'path',
        content: cleanPath
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
  // Clean the path by removing parentheses and quotes
  const cleanPath = part.content.replace(/^[\("]+|[\)"]$/g, '');
  return (
    <span
      key={`path-${index}`}
      className="terminal-link text-[#3b8eea] hover:underline cursor-pointer"
      onClick={() => {
        executeCommand(`explorer ${cleanPath}`, 0);
      }}
    >
      {part.content}
    </span>
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
 * Component that combines link formatting and ANSI processing
 */
export function FormattedOutput({ text, executeCommand }: FormattedOutputProps): JSX.Element {
  // First, decode the text to ensure proper character encoding
  const decodedText = decodeText(text);
  
  // Check if the text contains ANSI escape codes
  const hasAnsiCodes = /\[\d+m/.test(decodedText);

  return (
    <div className="terminal-output">
      {hasAnsiCodes ? (
        <pre className="whitespace-pre-wrap break-words">
          <Ansi useClasses>{decodedText}</Ansi>
        </pre>
      ) : (
        formatTextWithLinks(decodedText, executeCommand)
      )}
    </div>
  );
}
