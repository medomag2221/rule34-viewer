export const config = Object.freeze({
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 8082),
  timeoutMs: Number(process.env.UPSTREAM_TIMEOUT_MS || 15_000),
  proxyUrl: process.env.R34_PROXY_URL || 'https://rule34-api.netlify.app',
  apiKey: process.env.R34_API_KEY || '',
  userId: process.env.R34_USER_ID || '',
})

