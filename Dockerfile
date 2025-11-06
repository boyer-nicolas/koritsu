FROM oven/bun:1

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile --prefer-offline --ignore-scripts

RUN bun run build

RUN bun run check

RUN bun run lint

RUN bun run test

