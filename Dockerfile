# Stage 1: deps — installs all packages, shared by build stages
FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm i --no-frozen-lockfile

# Stage 2: build-api
FROM deps AS build-api
COPY . .
RUN NX_DAEMON=false NX_NO_CLOUD=true npx nx run api:build --configuration=production

# Stage 3: api-prod-deps — installs only production deps, compiles native modules
FROM node:22-alpine AS api-prod-deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY apps/api/package.json ./
RUN npm install --omit=dev

# Stage 4: build-web
FROM deps AS build-web
ARG API_URL=http://api:3000
ENV API_URL=${API_URL}
ENV NEXT_STANDALONE=true
COPY . .
RUN cd apps/web && node_modules/.bin/next build && mkdir -p public

# Stage 5: api-runner — lean production image for the Express API
FROM node:22-alpine AS api-runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build-api /workspace/dist/apps/api ./dist
COPY --from=api-prod-deps /app/node_modules ./node_modules

RUN mkdir -p data logs
EXPOSE 3000
CMD ["node", "dist/src/main.js"]

# Stage 6: web-runner — lean production image for Next.js standalone
FROM node:22-alpine AS web-runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# outputFileTracingRoot is set to the workspace root, so standalone output
# mirrors the monorepo layout: server.js lives at apps/web/server.js
COPY --from=build-web /workspace/apps/web/.next/standalone ./
COPY --from=build-web /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=build-web /workspace/apps/web/public ./apps/web/public

EXPOSE 3001
CMD ["node", "apps/web/server.js"]