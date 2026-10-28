FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
ENV NODE_ENV=production SERVICE=all PORT=8080
EXPOSE 8080
USER node
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1
CMD ["node", "src/main.js"]
