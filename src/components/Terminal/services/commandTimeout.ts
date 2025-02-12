interface CommandTimeoutOptions {
  timeout?: number;
  onTimeout?: () => void;
  onContinue?: () => void;
}

export class CommandTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandTimeoutError';
  }
}

export function createCommandWithTimeout<T>(
  promise: Promise<T>,
  options: CommandTimeoutOptions = {}
): { promise: Promise<T>; cancel: () => void } {
  const { 
    timeout = 3000,
    onTimeout,
    onContinue 
  } = options;

  let timeoutId: NodeJS.Timeout;
  let reject: (reason?: any) => void;

  const timeoutPromise = new Promise<T>((_, rej) => {
    reject = rej;
    timeoutId = setTimeout(() => {
      onTimeout?.();
      rej(new CommandTimeoutError('Command timed out after 30 seconds'));
    }, timeout);
  });

  const cancel = () => {
    clearTimeout(timeoutId);
    reject(new CommandTimeoutError('Command cancelled'));
  };

  const wrappedPromise = Promise.race([promise, timeoutPromise])
    .then((result) => {
      clearTimeout(timeoutId);
      onContinue?.();
      return result;
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      throw error;
    });

  return {
    promise: wrappedPromise,
    cancel
  };
}