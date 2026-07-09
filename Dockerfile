FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
RUN npm install -g pm2
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-ui ./dist-ui
COPY --from=build /app/package*.json ./
COPY --from=build /app/bin ./bin
RUN npm ci --omit=dev --ignore-scripts
EXPOSE 9823
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:9823/api/ping || exit 1
USER node
CMD ["pm2-runtime", "dist/server.js"]
