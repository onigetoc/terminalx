import React, { useEffect, useState } from 'react';

/**
 * TerminalSpinner
 * Spinner "braille" inspiré du pattern proposé par Gemini, adapté au terminal du projet.
 * - Animation du spinner via les frames braille (⠋ ⠙ ⠹ ...)
 * - Statut personnalisable + nom de la commande en cours
 * - Barre de progression style CLI indéterminée (pas de fausse progression %)
 * puisque la durée réelle d'exécution n'est pas connue côté client.
 */

interface TerminalSpinnerProps {
  /** Commande en cours d'exécution (affichée à côté du statut) */
  command?: string;
  /** Message de statut affiché */
  status?: string;
  /** Afficher la barre de progression style CLI */
  showProgressBar?: boolean;
  className?: string;
}

/** Frames braille utilisées par le spinner (identiques au pattern Gemini) */
export const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/** Longueur et taille du "chunk" pour la barre de progression indéterminée */
const BAR_LENGTH = 20;
const CHUNK_SIZE = 5;

export function TerminalSpinner({
  command,
  status = 'Executing command...',
  showProgressBar = true,
  className = '',
}: TerminalSpinnerProps): JSX.Element {
  const [frameIndex, setFrameIndex] = useState(0);
  const [barPos, setBarPos] = useState(0);

  // Animation du spinner braille
  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % BRAILLE_FRAMES.length);
    }, 80);

    return () => clearInterval(interval);
  }, []);

  // Barre de progression indéterminée : un "chunk" de blocs glisse de gauche à droite
  useEffect(() => {
    const interval = setInterval(() => {
      setBarPos((prev) => (prev > BAR_LENGTH + CHUNK_SIZE - 1 ? 0 : prev + 1));
    }, 120);

    return () => clearInterval(interval);
  }, []);

  const renderProgressBar = () => {
    let bar = '';
    for (let i = 0; i < BAR_LENGTH; i++) {
      bar += i >= barPos && i < barPos + CHUNK_SIZE ? '█' : '░';
    }
    return `[${bar}]`;
  };

  return (
    <div className={`terminal-spinner ${className}`}>
      <span className="terminal-spinner-frame" aria-hidden="true">
        {BRAILLE_FRAMES[frameIndex]}
      </span>
      <span className="terminal-spinner-status">
        {status}
        {command ? `: ${command}` : ''}
      </span>
      {showProgressBar && (
        <span className="terminal-spinner-bar">{renderProgressBar()}</span>
      )}
    </div>
  );
}

export default TerminalSpinner;
