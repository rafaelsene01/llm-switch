# Stage 1: deps — installs all packages, shared by build stages
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm i --no-frozen-lockfile

# Stage 2: build-api
FROM deps AS build-api
COPY . .
RUN NX_DAEMON=false NX_NO_CLOUD=true npx nx run api:build --configuration=production
RUN pnpm deploy --filter api --prod --legacy /api-deploy

# Stage 3: build-web
FROM deps AS build-web
ARG API_URL=http://api:3000
ENV API_URL=${API_URL}
COPY . .
RUN cd apps/web && node_modules/.bin/next build

# Stage 4: api-runner — lean production image for the Express API
FROM node:22-alpine AS api-runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build-api /workspace/dist/apps/api ./dist
COPY --from=build-api /api-deploy/node_modules ./node_modules

RUN mkdir -p data logs
EXPOSE 3000
CMD ["node", "dist/main.js"]

# Stage 5: web-runner — lean production image for Next.js standalone
FROM node:22-alpine AS web-runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

COPY --from=build-web /workspace/apps/web/.next/standalone ./
COPY --from=build-web /workspace/apps/web/.next/static ./.next/static
COPY --from=build-web /workspace/apps/web/public ./public

EXPOSE 3001
CMD ["node", "server.js"]