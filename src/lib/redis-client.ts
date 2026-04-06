import "server-only";

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  ping(): Promise<boolean>;
}

async function createUpstashClient(): Promise<RedisClient | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const { Redis } = await import("@upstash/redis");
    const client = new Redis({ url, token });

    return {
      async get(key) {
        try {
          return (await client.get<string>(key)) ?? null;
        } catch {
          return null;
        }
      },
      async set(key, value, ttlSeconds) {
        try {
          if (ttlSeconds) {
            await client.set(key, value, { ex: ttlSeconds });
          } else {
            await client.set(key, value);
          }
        } catch {
          // fail-open
        }
      },
      async del(key) {
        try {
          await client.del(key);
        } catch {
          // fail-open
        }
      },
      async exists(key) {
        try {
          return (await client.exists(key)) === 1;
        } catch {
          return false;
        }
      },
      async ping() {
        try {
          const result = await client.ping();
          return result === "PONG";
        } catch {
          return false;
        }
      },
    };
  } catch {
    return null;
  }
}

async function createIORedisClient(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    const { default: IORedis } = await import("ioredis");
    const client = new IORedis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });

    await client.connect();

    return {
      async get(key) {
        try {
          return await client.get(key);
        } catch {
          return null;
        }
      },
      async set(key, value, ttlSeconds) {
        try {
          if (ttlSeconds) {
            await client.set(key, value, "EX", ttlSeconds);
          } else {
            await client.set(key, value);
          }
        } catch {
          // fail-open
        }
      },
      async del(key) {
        try {
          await client.del(key);
        } catch {
          // fail-open
        }
      },
      async exists(key) {
        try {
          return (await client.exists(key)) === 1;
        } catch {
          return false;
        }
      },
      async ping() {
        try {
          const result = await client.ping();
          return result === "PONG";
        } catch {
          return false;
        }
      },
    };
  } catch {
    return null;
  }
}

const noopClient: RedisClient = {
  async get() {
    return null;
  },
  async set() {},
  async del() {},
  async exists() {
    return false;
  },
  async ping() {
    return false;
  },
};

let _redis: RedisClient | null = null;

async function getRedisClient(): Promise<RedisClient> {
  if (_redis) return _redis;

  // Prefer native Redis (ElastiCache) over Upstash
  _redis = (await createIORedisClient()) ?? (await createUpstashClient()) ?? noopClient;
  return _redis;
}

// Lazy-init exported instance — consumers await `redis` via the getter
export const redis = new Proxy(noopClient, {
  get(target, prop: keyof RedisClient) {
    return async (...args: unknown[]) => {
      const client = await getRedisClient();
      const method = client[prop];
      if (typeof method === "function") {
        return (method as (...a: unknown[]) => unknown).apply(client, args);
      }
      return (target[prop] as (...a: unknown[]) => unknown).apply(target, args);
    };
  },
});
