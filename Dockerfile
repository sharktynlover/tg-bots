FROM oven/bun:1.2-alpine

WORKDIR /app

COPY package.json bun.lock* ./
COPY apps/bot-gateway/package.json apps/bot-gateway/
COPY apps/schedule-service/package.json apps/schedule-service/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile

COPY . .

ENV TZ=Asia/Yekaterinburg
CMD ["bun", "run", "apps/bot-gateway/src/main.ts"]
