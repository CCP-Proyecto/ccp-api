FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

ENV PORT=3001
ENV BETTER_AUTH_SECRET=secret
ENV BETTER_AUTH_URL=http://localhost:3001
ENV DATABASE_URL=postgres://postgres:postgres@localhost:5432/ccp

EXPOSE $PORT

CMD ["bun", "run", "start"]
