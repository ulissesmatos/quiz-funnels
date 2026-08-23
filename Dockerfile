# Imagem de produção do app Next.js em si — docker-compose.yml só sobe as
# dependências de dev (Postgres, MinIO, Mailpit), nunca o app.
#
# Migração de banco NÃO roda dentro deste container: `pnpm db:migrate` usa
# drizzle-kit, que é devDependency e fica de fora do build standalone de
# propósito (imagem final enxuta). Rode a migração à parte, contra o
# DATABASE_URL de produção, antes de subir uma versão nova:
#   pnpm db:migrate

FROM node:20-alpine AS base
RUN corepack enable

# ---- deps: só pra cachear a resolução de pacotes entre builds ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- runtime: só o output standalone + assets estáticos ----
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
