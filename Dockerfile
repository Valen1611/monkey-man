FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
# Install dependencies without scripts to avoid approve-builds error
RUN pnpm config set ignore-scripts true && pnpm install --no-frozen-lockfile
# Manually generate prisma client
RUN pnpm --filter backend exec prisma generate

# Pass app name as arg (e.g. frontend, backend)
ARG APP_NAME
RUN pnpm --filter ${APP_NAME} build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG APP_NAME
ENV APP_NAME=${APP_NAME}
ARG PORT=3000
ENV PORT=${PORT}

COPY --from=builder /app/apps/${APP_NAME}/public ./apps/${APP_NAME}/public
COPY --from=builder --chown=node:node /app/apps/${APP_NAME}/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/${APP_NAME}/.next/static ./apps/${APP_NAME}/.next/static
# Copy prisma directory for sqlite db
COPY --from=builder --chown=node:node /app/apps/${APP_NAME}/prism[a] ./apps/${APP_NAME}/prisma
# Copy worker entry point (backend only; harmless if absent for frontend)
COPY --from=builder --chown=node:node /app/apps/${APP_NAME}/worke[r] ./apps/${APP_NAME}/worker
# Copy prisma CLI for runtime db push (backend only; harmless if absent for frontend)
COPY --from=builder --chown=node:node /app/node_modules/prism[a] ./node_modules/prisma
COPY --from=builder --chown=node:node /app/node_modules/@prisma/engine[s] ./node_modules/@prisma/engines

ENV HOSTNAME="0.0.0.0"

COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
CMD ["sh", "-c", "./docker-entrypoint.sh"]