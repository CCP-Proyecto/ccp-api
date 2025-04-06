FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

ENV PORT=3000
ENV BETTER_AUTH_SECRET=secret
ENV BETTER_AUTH_URL=http://localhost:3000
ENV DATABASE_URL=postgres://postgres:postgres@localhost:5432/ccp

EXPOSE $PORT

RUN bun run db:generate

RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]

CMD ["bun", "run", "start"]
