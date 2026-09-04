import fastify, { FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { executeCommand, getCurrentDirectory, initializeDirectory } from './commandService';
import { attachPtyServer } from './ptyServer';
import { SERVER_CONFIG } from '../config/serverConfig';
import net from 'net';
import fs from 'fs';
import os from 'os';
import path from 'path';

const app = fastify({ logger: false });

// Register CORS plugin
app.register(cors);

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

    // Route de base pour vérifier que le serveur répond
    app.get('/', async () => {
      return { status: 'Terminal server running' };
    });

    // Health check route
    app.get('/health', async () => {
      return { status: 'ok' };
    });

    // Execute command route
    app.post('/execute', async (request: FastifyRequest<{
      Body: { command: string }
    }>) => {
      const { command } = request.body;
      if (!command || typeof command !== 'string') {
        throw new Error('Invalid command');
      }
      return executeCommand(command);
    });

    // Initialize directory endpoint
    app.post('/init-directory', async (request: FastifyRequest<{
      Body: { directory: string }
    }>) => {
      const { directory } = request.body;
      const success = await initializeDirectory(directory);
      if (!success) {
        throw new Error('Failed to initialize directory');
      }
      return { currentDirectory: getCurrentDirectory() };
    });

    app.get('/current-directory', async () => {
      return { currentDirectory: getCurrentDirectory() };
    });

    // Upload d'un fichier glissé-déposé ou collé depuis le terminal
    // interactif. Les navigateurs ne donnent pas le vrai chemin disque
    // (contrairement à VS Code qui a accès à Node), on stocke donc le
    // contenu dans le dossier temporaire système et on renvoie le chemin
    // absolu, que l'utilisateur (ou opencode/claude) peut ensuite lire.
    // Corps JSON : { filename, dataBase64 } — évite une dépendance multipart.
    app.post('/pty/upload', { bodyLimit: 32 * 1024 * 1024 }, async (request: FastifyRequest<{
      Body: { filename?: string; dataBase64?: string }
    }>) => {
      const { filename, dataBase64 } = request.body || {};
      if (!filename || typeof filename !== 'string' || !dataBase64 || typeof dataBase64 !== 'string') {
        throw new Error('Invalid upload: filename and dataBase64 are required');
      }
      if (dataBase64.length > 28 * 1024 * 1024) {
        throw new Error('File too large (max ~20MB)');
      }
      const safe = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_') || 'pasted-image.png';
      const dir = path.join(os.tmpdir(), 'terminalx-uploads');
      await fs.promises.mkdir(dir, { recursive: true });
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`;
      const fullPath = path.join(dir, unique);
      // Écriture directe en base64 : évite le type Buffer (incompatible avec
      // @types/node@20 sur ce projet, cf. erreurs pré-existantes).
      await fs.promises.writeFile(fullPath, dataBase64, 'base64');
      return { path: fullPath };
    });

    // Ajoute une gestion d'erreur globale
    app.setErrorHandler((error, request, reply) => {
      app.log.error(error);
      reply.status(500).send({
        error: error.message || 'Internal Server Error',
        statusCode: 500
      });
    });

    // Démarre le serveur sur le port trouvé
    try {
      await app.listen({ port, host: 'localhost' });
      console.log(`Terminal server running on port ${port}`);

      // Attache le serveur WebSocket pour le terminal interactif (PTY).
      // Ceci permet de lancer des CLIs interactives (Claude, OpenCode, vim…).
      attachPtyServer(app.server);

      // Sauvegarder le port immédiatement après le démarrage réussi
      await savePortToFile(port);
    } catch (err) {
      app.log.error('Error starting server:', err);
      process.exit(1);
    }

    // Gestion propre de l'arrêt du serveur
    process.on('SIGTERM', async () => {
      await app.close();
      console.log('Server terminated');
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Lance le serveur
startServer();
