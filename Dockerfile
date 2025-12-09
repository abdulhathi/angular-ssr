# =========================
# 1) Build stage
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# =========================
# 2) Runtime stage
# =========================
FROM node:20-alpine AS runner

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

ENV PORT=8080

COPY --from=builder /app/packag*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD [ "node", "dist/angular-ssr/server/server.mjs" ]