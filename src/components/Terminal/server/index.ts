import express, { Request, Response } from 'express';
import cors from 'cors';
import { executeCommand, getCurrentDirectory, initializeDirectory } from './commandService';
import { SERVER_CONFIG } from '../config/serverConfig';
import net from 'net';
import fs from 'fs';
import path from 'path';

const app = express();

// Fonction pour vérifier si un port est disponible
async function findAvailablePort(startPort: number, endPort: number): Promise<number> {
  for (let port = startPort; port <= endPort; port++) {
    try {
      await new Promise((resolve, reject) => {
        const server = net.createServer()
          .listen(port)
          .once('error', reject)
          .once('listening', () => {
            server.close();
            resolve(port);
          });
      });
      return port;
    } catch {
      continue;
    }
  }
  throw new Error('No available ports found');
}

// Fonction pour sauvegarder le port dans un fichier
async function savePortToFile(port: number) {
  try {
    const portFile = path.join(__dirname, '../config/current-port.json');
    await fs.promises.writeFile(portFile, JSON.stringify({ port }));
  } catch (error) {
    console.error('Failed to save port:', error);
  }
}

// Démarrage du serveur avec gestion des ports
async function startServer() {
  try {
    // Commencer par le port le plus bas
    const port = await findAvailablePort(
      SERVER_CONFIG.PORT_RANGE.START,
      SERVER_CONFIG.PORT_RANGE.END
    );

    // Sauvegarder le port pour que le client puisse le récupérer
    await savePortToFile(port);

    // Configure middleware et routes
    app.use(cors());
    app.use(express.json());
    
    // Route de base pour vérifier que le serveur répond
    app.get('/', (req: Request, res: Response) => {
      res.json({ status: 'Terminal server running' });
    });

    // Set response headers for all routes
    app.use((req: Request, res: Response, next) => {
      res.header('Content-Type', 'application/json; charset=utf-8');
      next();
    });

    // Ajouter avant les autres routes
    app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    app.post('/execute', async (req: Request, res: Response) => {
      try {
        const { command } = req.body;
        if (!command || typeof command !== 'string') {
          return res.status(400).json({ error: 'Invalid command' });
        }
        const result = await executeCommand(command);
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ 
          error: 'Error executing command',
          details: error.message
        });
      }
    });

    // Initialize directory endpoint
    app.post('/init-directory', async (req: Request, res: Response) => {
      try {
        const { directory } = req.body;
        const success = await initializeDirectory(directory);
        if (success) {
          res.json({ currentDirectory: getCurrentDirectory() });
        } else {
          res.status(500).json({ error: 'Failed to initialize directory' });
        }
      } catch (error: any) {
        res.status(500).json({ 
          error: 'Error initializing directory',
          details: error.message
        });
      }
    });

    app.get('/current-directory', (req: Request, res: Response) => {
      try {
        const currentDir = getCurrentDirectory();
        res.json({ currentDirectory: currentDir });
      } catch {
        res.status(500).json({ error: 'Error getting current directory' });
      }
    });

    // Démarre le serveur sur le port trouvé
    const server = app.listen(port, () => {
      console.log(`Terminal server running on port ${port}`);
      // Sauvegarder le port immédiatement après le démarrage réussi
      savePortToFile(port).catch(console.error);
    });

    // Gestion propre de l'arrêt du serveur
    process.on('SIGTERM', () => {
      server.close(() => {
        console.log('Server terminated');
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Lance le serveur
startServer();
