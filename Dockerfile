FROM node:20-alpine

WORKDIR /app

# Install OpenSSL 1.1.x for Prisma compatibility
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client with a dummy URL for build time
RUN DATABASE_URL="postgresql://dummy:dummy@localhost/dummy" npx prisma generate || true

RUN npm run build

COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3000

ENTRYPOINT ["/app/start.sh"]