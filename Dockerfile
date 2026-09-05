# Rudra Balaga - WhatsApp Web Worker Dockerfile
# Suitable for deployment on Render, Railway, Fly.io, or any Docker host.

FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY worker.js ./

RUN mkdir -p /app/auth_info
VOLUME ["/app/auth_info"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 CMD node -e "console.log('ok')" || exit 1

CMD ["node", "worker.js"]
