FROM node:24-bookworm-slim

WORKDIR /app
COPY package.json ./
COPY public ./public
COPY src ./src

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8082

EXPOSE 8082
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s CMD node -e "fetch('http://127.0.0.1:8082/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "src/server.js"]

