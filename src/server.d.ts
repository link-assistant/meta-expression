export interface MetaExpressionServerOptions {
  host?: string;
  port?: number;
}

export interface StartedMetaExpressionServer {
  server: unknown;
  host: string;
  port: number;
}

export declare function createMetaExpressionServer(): unknown;

export declare function startMetaExpressionServer(
  options?: MetaExpressionServerOptions
): Promise<StartedMetaExpressionServer>;
