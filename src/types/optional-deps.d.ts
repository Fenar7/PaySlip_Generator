// Type declarations for optional dependencies that may not be installed.
// These enable dynamic import() calls to compile without errors while allowing
// graceful runtime fallback when the packages are unavailable.

declare module "posthog-js" {
  interface PostHog {
    init(apiKey: string, options?: Record<string, unknown>): void;
    capture(event: string, properties?: Record<string, unknown>): void;
    identify(userId: string, traits?: Record<string, unknown>): void;
    reset(): void;
    __loaded?: boolean;
  }
  const posthog: PostHog;
  export default posthog;
}

declare module "ioredis" {
  interface RedisOptions {
    maxRetriesPerRequest?: number | null;
    connectTimeout?: number;
    lazyConnect?: boolean;
  }
  class IORedis {
    constructor(url: string, options?: RedisOptions);
    connect(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ...args: (string | number)[]): Promise<string>;
    del(key: string): Promise<number>;
    exists(key: string): Promise<number>;
    ping(): Promise<string>;
    disconnect(): void;
  }
  export default IORedis;
}

declare module "@sentry/nextjs" {
  export function captureException(
    error: unknown,
    context?: { extra?: Record<string, unknown> }
  ): void;
  export function captureMessage(message: string, level?: string): void;
  export function setUser(
    user: { id: string; email?: string; organization?: string } | null
  ): void;
  export function addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    data?: Record<string, unknown>;
    level?: string;
  }): void;
}

declare module "@aws-sdk/client-s3" {
  export class S3Client {
    constructor(config: { region?: string });
    send(command: unknown): Promise<unknown>;
  }
  export class PutObjectCommand {
    constructor(input: {
      Bucket: string;
      Key: string;
      Body: Buffer;
      ContentType: string;
    });
  }
  export class GetObjectCommand {
    constructor(input: { Bucket: string; Key: string });
  }
  export class DeleteObjectCommand {
    constructor(input: { Bucket: string; Key: string });
  }
}

declare module "@aws-sdk/s3-request-presigner" {
  export function getSignedUrl(
    client: import("@aws-sdk/client-s3").S3Client,
    command: unknown,
    options?: { expiresIn?: number }
  ): Promise<string>;
}
