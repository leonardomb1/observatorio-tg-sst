# Observatório SST

Public observatory of occupational accidents in Brazil, built from open government microdata (CAT, INSS benefits, RAIS, CAGED, AEAT, ILO) with a natural-language query assistant. Final project (TG) at Fatec Indaiatuba.

## Development

```sh
bun install
cp .env.example .env
bun run dev
```

Checks: `bun run check`, `bun run lint`, `bun run knip`, `bun run test:unit`, `bun run test:e2e`.

## Deployment

`docker compose up -d` builds the app and a pgvector Postgres. The app joins the shared external `proxy` network as `observatorio-app:3000`, where Caddy reaches it and it reaches `starrocks-fe:9030` directly; it is also published on `127.0.0.1:3007`. Outside the server (local development over WireGuard) use `STARROCKS_HOST=10.8.0.1`.

Not wired yet: the Caddy site block (it must send `X-Forwarded-Proto: https` on the tunnel listener, as tabula's does), the read-only StarRocks user, and CI publishing to ghcr.

See `CLAUDE.md` for architecture and house rules.
