import express, { Request, Response } from 'express';
import cors from 'cors';
import { executeCommand, getCurrentDirectory } from './commandService';

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

app.post('/execute', async (req: Request, res: Response) => {
  try {
    const { command } = req.body;
    const result = await executeCommand(command);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Error executing command' });
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
