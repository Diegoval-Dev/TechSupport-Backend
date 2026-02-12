declare module 'express-timeout-handler' {
  import { Request, Response, NextFunction } from 'express';

  interface TimeoutHandlerOptions {
    timeout: number;
    onTimeout?: (req: Request, res: Response, next: NextFunction) => void;
  }

  function timeout(
    options: TimeoutHandlerOptions,
  ): (req: Request, res: Response, next: NextFunction) => void;

  export = timeout;
}
