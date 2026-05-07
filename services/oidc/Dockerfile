FROM node:24-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY services/oidc ./services/oidc

RUN pnpm install --frozen-lockfile --filter @cubid/oidc...
RUN pnpm --filter @cubid/oidc typecheck

ENV NODE_ENV=production
ENV OIDC_PORT=8080

EXPOSE 8080

CMD ["pnpm", "--filter", "@cubid/oidc", "start"]
