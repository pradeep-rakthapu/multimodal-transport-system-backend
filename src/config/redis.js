import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: process.env.REDIS_TLS === "true" ? {
    tls: true,
    rejectUnauthorized: false
  } : {}
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});

await redisClient.connect();

export default redisClient;
