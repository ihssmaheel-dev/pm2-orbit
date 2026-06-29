FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-ui ./dist-ui
COPY --from=build /app/package*.json ./
COPY --from=build /app/bin ./bin
RUN npm ci --omit=dev
EXPOSE 9823
CMD ["node", "dist/server.js"]
