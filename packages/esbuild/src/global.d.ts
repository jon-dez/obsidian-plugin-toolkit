declare global {
  const DEVELOPMENT_SERVER:
    | undefined
    | {
        port: number;
        host: string;
      };
}

export {};
