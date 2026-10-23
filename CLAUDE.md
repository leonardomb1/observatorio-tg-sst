# Observatório SST

Public web app for the Fatec TG "Observatório SST": dashboards and a natural-language assistant over Brazilian occupational accident data. Reads the StarRocks datamart `dm_sst` (built by the dbt repo `leonardomb1/observatorio-sst`, loaded by Windmill); owns a Postgres + pgvector database for app state and the document corpus.

## Stack

SvelteKit 3 (adapter-node) · Svelte 5 runes · TypeScript 6 strict · bun for install/build, node for runtime · plain CSS · ECharts · mysql2 (StarRocks) · Drizzle + postgres.js · zod · Vercel AI SDK (assistant) · Voyage AI embeddings.

## Commands

`bun run dev` · `bun run check` · `bun run lint` · `bun run knip` · `bun run test:unit` · `bun run test:e2e` · `bun run build` then `node build`

## House rules

- Comments: rare. Only a brief English doc comment above a function or class when the code is non-obvious. No inline narration, no comments restating code.
- Identifiers in English; domain terms stay Brazilian (`cnae`, `cbo`, `uf`, `cat`). All UI text in pt-BR, plain institutional language, no hype.
- No `utils.ts`, `helpers.ts` or barrel files. Put a function in the module of its concept. Import with explicit `.ts` extensions via `#lib/...`.
- Validate with zod only at the edges (env, URL params, request bodies, warehouse rows, LLM output). Trust types inside.
- No silent fallbacks. Missing data is `null` and renders as "—", never `0`. `try/catch` only where there is a real recovery.
- Abstract on the third repetition, not before.

## Svelte

- Runes only. `$derived` for anything computed; `$effect` only for external side effects (ECharts instance, observers). Never fetch in `$effect`.
- Filters live in the URL (permalinks, cache keys). Update with `goto(url, { replaceState: true, noScroll: true, keepFocus: true })`. Never in `$state`, cookies or localStorage.
- Data comes from server `load` functions with `setHeaders` for caching. No universal load for data.
- Do not use remote functions or async Svelte (`await` in markup) — experimental.
- No module-level `$state` holding per-user data (leaks across SSR requests).
- `{@attach}` instead of `use:` actions. `<svelte:boundary>` around each panel.

## Styling

- Plain CSS. No Tailwind, no utility framework. Global layers in `src/lib/styles` (`reset, tokens, base, layout`); component styles in the Svelte `<style>` block.
- Colours, spacing and type only through tokens in `tokens.css` (Stylelint enforces this in `.svelte` files).
- Visual direction "papel e tinta": near-monochrome UI, colour belongs to the data, `--accent` only for focus and highlighting the selected entity.
- Never ship browser-default UI: no `alert/confirm/prompt`, no unstyled native `<select>`, date inputs or `title` tooltips. Build themed components on accessible native primitives (`<dialog>`, Popover API, real inputs).

## Data and charts

- The browser never sends SQL. Every warehouse read goes through the named-query catalog in `src/lib/server/catalog/` (no SvelteKit imports there), shared by pages, the public API and assistant tools.
- StarRocks is accessed only by a read-only user limited to `dm_sst`. The app refuses `root`.
- Rates always name their denominator; partial and provisional years are flagged in data, never mixed silently with closed years.
- ECharts does not format pt-BR: always pass formatters from `#lib/format.ts`. Years are category strings, never numbers.
- Titles, sources and notes are HTML around the chart, not ECharts `title`. Every chart has a table view.
