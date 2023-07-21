export const FALLBACK_DEPTH = 20;
export const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST,
  username: process.env.REDIS_USER,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
};
