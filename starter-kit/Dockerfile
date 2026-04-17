FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
  && npm install --no-save --no-audit --no-fund typescript @types/node @types/react @types/react-dom \
  && npm cache clean --force

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev -- --hostname 0.0.0.0 --port 3000"]
