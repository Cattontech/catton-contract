import { createClient } from 'redis';

class Cache {
  private client;

  constructor() {
    this.client = createClient({
      url: `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || '6379'}`,
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
    this.client.connect();
  }

  async get(key: string): Promise<any> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.client.set(key, JSON.stringify(value), {
      EX: ttl,
    });
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}

export default new Cache();