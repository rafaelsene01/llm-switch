# Stage 1: deps — installs all packages, shared by build stages
FROM node:22-alpine AS deps
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN npm ci

# Stage 2: build-api
FROM deps AS build-api
COPY . .
RUN npx nx run api:build --configuration=production

# Stage 3: build-web
FROM deps AS build-web
ARG API_URL=http://api:3000
ENV API_URL=${API_URL}
COPY . .
RUN npx nx run web:build --configuration=production

# Stage 4: api-runner — lean production image for the Express API
FROM node:22-alpine AS api-runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build-api /workspace/dist/apps/api ./dist
COPY --from=build-api /workspace/apps/api/package.json ./
RUN npm install --production --ignore-scripts

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