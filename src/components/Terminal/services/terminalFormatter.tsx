import React from 'react';
import type { ReactNode } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

// Regular expressions for matching URLs
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

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
export function formatTextWithLinks(text: string): JSX.Element {
  console.log('Formatting text with links:', text);
  const segments: ReactNode[] = [];
  let lastIndex = 0;

  const urlMatches = Array.from(text.matchAll(URL_REGEX));
  urlMatches.forEach((match, i) => {
    const [url] = match;
    const index = match.index!;

    // Add text before the URL
    if (index > lastIndex) {
      segments.push(text.slice(lastIndex, index));
    }

    // Add the URL as a link
    segments.push(createLink(url, url, i));
    lastIndex = index + url.length;
  });

  // Add remaining text after URLs
  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  console.log('Segments after formatting:', segments);
  return <>{segments}</>;
}

export interface FormattedOutputProps {
  text: string;
}

/**
 * Component that combines link formatting
 */
export function FormattedOutput({ text }: FormattedOutputProps): JSX.Element {
  console.log('FormattedOutput received text:', text);
  const formattedText = formatTextWithLinks(text);
  console.log('Formatted text with links:', formattedText);

  return <>{formattedText}</>;
}
