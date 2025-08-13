import { createClient } from 'redis';

const isTLS = process.env.REDIS_URL.startsWith('rediss://');

const redisClient = createClient({
  url: process.env.REDIS_URL,
  ...(isTLS && { socket: { tls: true, rejectUnauthorized: false } })
});

redisClient.on('error', err => console.error('❌ Redis Error:', err));

await redisClient.connect();

export default redisClient;
