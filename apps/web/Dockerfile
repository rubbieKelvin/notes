# Build context: repository root (pnpm workspace)
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY apps/web apps/web
RUN pnpm --filter web build

FROM nginx:1.27-alpine
# nginx's entrypoint fills ${API_UPSTREAM} (only defined variables, so $host etc. stay) into conf.d/default.conf
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
ENV API_UPSTREAM=server:8080
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
