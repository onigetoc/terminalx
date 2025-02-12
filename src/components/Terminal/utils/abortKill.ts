import { ChildProcess } from 'child_process';

export const abortChildProcess = (childProcess: ChildProcess, controller: AbortController) => {
  controller.abort();
  if (childProcess && !childProcess.killed) {
    childProcess.kill('SIGINT'); // Send SIGINT to gracefully stop the process
  }
};

