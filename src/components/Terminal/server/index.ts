import fastify, { FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { executeCommand, getCurrentDirectory, initializeDirectory } from './commandService';
import { SERVER_CONFIG } from '../config/serverConfig';
import net from 'net';
import fs from 'fs';
import path from 'path';

const app = fastify({ logger: true });

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
