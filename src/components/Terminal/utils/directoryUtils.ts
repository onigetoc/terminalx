/**
 * Normalise un chemin en remplaçant les backslashes par des forward slashes.
 */
export function formatPath(path: string): string {
  return path?.replace(/\\/g, '/') || '';
}

/**
 * Gets the current directory from the server
 */
async function getCurrentDirectory(): Promise<string> {
  try {
    const response = await fetch('http://localhost:3002/current-directory');
    if (!response.ok) throw new Error('Failed to get current directory');
    const data = await response.json();
    return formatPath(data.currentDirectory);
  } catch (error) {
    console.error('Error getting current directory:', error);
    // Use default Windows path since we know the environment
    return formatPath('C:/Users/LENOVO');
  }
}

/**
 * Initializes the terminal directory
 * 1. First tries to use stored directory if available
 * 2. Otherwise uses server's current directory
 */
export async function initializeDirectory(): Promise<string> {
  try {
    // 1. Check localStorage first
    const storedDirectory = localStorage.getItem('terminalDirectory');
    
    if (storedDirectory) {
      try {
        // Try to initialize the server with stored directory
        const response = await fetch('http://localhost:3002/init-directory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ directory: storedDirectory })
        });
        
        if (response.ok) {
          const data = await response.json();
          return formatPath(data.currentDirectory);
        }
      } catch (error) {
        console.error('Failed to initialize stored directory:', error);
      }
    }

    // 2. Fall back to server's current directory
    return await getCurrentDirectory();
    
  } catch (error) {
    console.error('Directory initialization error:', error);
    // Use default Windows path as last resort
    return formatPath('C:/Users/LENOVO');
  }
}

/**
 * Updates the stored directory when cd command is used
 */
export function updateStoredDirectory(newDirectory: string): void {
  try {
    localStorage.setItem('terminalDirectory', formatPath(newDirectory));
  } catch (error) {
    console.error('Failed to update stored directory:', error);
  }
}
