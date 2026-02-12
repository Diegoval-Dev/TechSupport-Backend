#!/bin/sh

echo "Running migrations..."
npx prisma migrate deploy

echo "Starting server..."
exec node -r dotenv/config dist/server.js
