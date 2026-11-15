declare global {
  namespace Express {
    interface Request {
      /** Set by the authenticate middleware; only read it on routes that use it. */
      userId: string;
    }
  }
}

export {};
