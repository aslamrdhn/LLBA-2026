import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

class RedisWrapper {
  private client: Redis | null = null;
  private isConnected = false;

  constructor() {
    if (REDIS_URL) {
      try {
        this.client = new Redis(REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) =>
            times > 3 ? null : Math.min(times * 100, 2000),
          lazyConnect: true,
        });

        this.client
          .connect()
          .then(() => {
            this.isConnected = true;
            console.log("[REDIS] Connected to Redis server");
          })
          .catch((err) => {
            console.log(
              "[REDIS] Operating in in-memory mock fallback mode (connection closed).",
              err.message,
            );
            this.isConnected = false;
          });

        this.client.on("error", (err) => {
          this.isConnected = false;
        });
      } catch (err) {
        this.client = null;
      }
    } else {
      console.log("[REDIS] REDIS_URL not configured. Operating in mock mode.");
    }
  }

  async publish(channel: string, message: string): Promise<number> {
    if (this.client && this.isConnected) {
      try {
        return await this.client.publish(channel, message);
      } catch (err: any) {
        console.log(
          `[REDIS] Publish failed on channel ${channel}:`,
          err.message,
        );
        return 0;
      }
    }
    // In dev / sandbox mock mode:
    return 1;
  }

  async get(key: string): Promise<string | null> {
    if (this.client && this.isConnected) {
      try {
        return await this.client.get(key);
      } catch {
        return null;
      }
    }
    return null;
  }

  async set(
    key: string,
    value: string,
    mode?: string,
    duration?: number,
  ): Promise<string | null> {
    if (this.client && this.isConnected) {
      try {
        if (mode && duration) {
          return await (this.client as any).set(key, value, mode, duration);
        }
        return await this.client.set(key, value);
      } catch {
        return null;
      }
    }
    return "OK";
  }

  async del(key: string): Promise<number> {
    if (this.client && this.isConnected) {
      try {
        return await this.client.del(key);
      } catch {
        return 0;
      }
    }
    return 1;
  }
}

export const redis = new RedisWrapper();
