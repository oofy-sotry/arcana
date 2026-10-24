# Arcana 온라인 서버 — 빌드 컨텍스트는 저장소 루트 (packages/game-core를 함께 쓰므로)
# docker build -f apps/server/Dockerfile .
FROM node:24-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY packages/game-core/package.json packages/game-core/
# 서버와 그 워크스페이스 의존성(game-core)만, 운영 의존성만 설치
RUN pnpm install --frozen-lockfile --prod --filter server...

FROM node:24-bookworm-slim
LABEL org.opencontainers.image.source=https://github.com/oofy-sotry/arcana
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps --chown=node:node /app ./
COPY --chown=node:node packages/game-core packages/game-core
COPY --chown=node:node apps/server apps/server
# DB 폴더 — compose에서 볼륨을 붙인다 (node 사용자가 써야 함)
RUN mkdir -p apps/server/data && chown node:node apps/server/data
USER node
WORKDIR /app/apps/server
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "index.js"]
