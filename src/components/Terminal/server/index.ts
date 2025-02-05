import express, { Request, Response } from 'express';
import cors from 'cors';
import { executeCommand, getCurrentDirectory, initializeDirectory } from './commandService';

const app = express();
const port = 3002;

// Configure middleware
app.use(cors());
app.use(express.json());

// Set response headers for all routes
app.use((req: Request, res: Response, next) => {
  res.header('Content-Type', 'application/json; charset=utf-8');
  next();
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

app.listen(port, () => {
  console.log(`Terminal server running on port ${port}`);
});
