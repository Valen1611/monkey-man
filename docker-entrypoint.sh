#!/bin/sh
set -e

# Database initialization (backend only — frontend skips this)
if [ -d "apps/${APP_NAME}/prisma" ] && [ -f "apps/${APP_NAME}/prisma/schema.prisma" ]; then
  echo "🔧 Running database migrations..."
  npx prisma db push --schema=apps/${APP_NAME}/prisma/schema.prisma --skip-generate
  echo "🌱 Running database seed..."
  node apps/${APP_NAME}/prisma/seed.js
fi

exec node apps/${APP_NAME}/server.js
