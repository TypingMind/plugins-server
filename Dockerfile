FROM node:current-slim AS builder

ARG UID=3000
ARG GID=3000

WORKDIR /app

COPY --chown=$UID:$GID . .

RUN npm ci && npm run build && chown -R $UID:$GID /app

FROM node:current-slim AS prod

ARG UID=3000
ARG GID=3000

ENV NODE_ENV="production"
ENV PORT="8080"
ENV HOST="0.0.0.0"

WORKDIR /app

COPY --from=builder --chown=$UID:$GID /app/dist /app/dist
COPY --from=builder /app/package*.json /app/

RUN npm ci --omit=dev --ignore-scripts && chown -R $UID:$GID /app

USER $UID:$GID

CMD ["dist/index.js"]
