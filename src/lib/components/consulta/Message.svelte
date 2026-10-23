<script lang="ts">
	import { answerChart } from '#lib/charts/answer.ts';
	import Chart from '#lib/charts/Chart.svelte';
	import type { ConsultaMessage } from '#lib/consulta.ts';
	import { specFormat } from '#lib/consulta.ts';
	import type { Column } from '#lib/csv.ts';
	import DataTable from '#lib/components/DataTable.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import { formatInteger } from '#lib/format.ts';
	import { catSource } from '#lib/sources.ts';
	import Markdown from './Markdown.svelte';

	type Row = Record<string, string | number | null>;

	interface Props {
		message: ConsultaMessage;
		publishedUntil: { year: number; month: number };
	}

	let { message, publishedUntil }: Props = $props();

	const source = $derived(catSource(publishedUntil));

	const hits = $derived(
		message.parts.flatMap((part) =>
			part.type === 'tool-buscar_documentos' && part.state === 'output-available'
				? part.output.results
				: []
		)
	);
	const cited = $derived.by(() => {
		const text = message.parts.map((part) => (part.type === 'text' ? part.text : '')).join(' ');
		const numbers = new Set([...text.matchAll(/\[(\d{1,4})\]/g)].map((match) => Number(match[1])));
		return hits.filter((hit) => numbers.has(hit.ref));
	});
	const refs = $derived(new Set(hits.map((hit) => hit.ref)));

	function columnsOf(names: readonly string[], rows: readonly Row[]): Column<Row>[] {
		return names.map((key) => ({
			key,
			label: key,
			numeric: rows.some((row) => typeof row[key] === 'number')
		}));
	}

	function location(hit: (typeof hits)[number]): string {
		const item = hit.itemCode ? `item ${hit.itemCode}` : hit.trail;
		const pages =
			hit.pageStart === null
				? ''
				: hit.pageEnd && hit.pageEnd !== hit.pageStart
					? `, p. ${hit.pageStart}–${hit.pageEnd}`
					: `, p. ${hit.pageStart}`;
		return `${item}${pages}`;
	}
</script>

{#if message.role === 'user'}
	<div class="question">
		{#each message.parts as part, index (index)}
			{#if part.type === 'text'}<p>{part.text}</p>{/if}
		{/each}
	</div>
{:else}
	<div class="answer">
		{#each message.parts as part, index (index)}
			{#if part.type === 'text'}
				<Markdown text={part.text} {refs} />
			{:else if part.type === 'reasoning' && part.text.trim()}
				<p class="note">{part.text}</p>
			{:else if part.type === 'tool-consultar_dados'}
				<details class="query">
					<summary>
						{#if part.state === 'output-available'}
							{part.input.finalidade}
							<span class="meta"
								>{formatInteger(part.output.rows.length)}
								{part.output.rows.length === 1 ? 'linha' : 'linhas'}</span
							>
						{:else if part.state === 'output-error'}
							Consulta recusada <span class="meta">o assistente vai ajustar</span>
						{:else}
							<span class="pending"
								>Consultando{part.input?.finalidade ? `: ${part.input.finalidade}` : ''}</span
							>
						{/if}
					</summary>
					{#if part.input?.sql}<pre><code>{part.input.sql}</code></pre>{/if}
					{#if part.state === 'output-error'}<p class="meta">{part.errorText}</p>{/if}
					{#if part.state === 'output-available' && part.output.rows.length > 0}
						<DataTable
							caption={part.input.finalidade}
							columns={columnsOf(part.output.columns, part.output.rows)}
							rows={part.output.rows}
						/>
					{/if}
				</details>
			{:else if part.type === 'tool-mostrar_grafico'}
				{#if part.state === 'output-available'}
					{@const { spec, rows, columns } = part.output}
					{@const format = specFormat(spec)}
					<div class="chart">
						<Panel
							title={spec.titulo}
							subtitle={spec.subtitulo}
							{source}
							columns={columnsOf(columns, rows).map((column) => {
								const serie = spec.series.find((each) => each.coluna === column.key);
								return serie
									? {
											...column,
											label: serie.rotulo,
											format: (cell: Row[string]) => (typeof cell === 'number' ? format(cell) : '—')
										}
									: column;
							})}
							{rows}
							slug="consulta-{message.id}-{index}"
						>
							{#snippet chart()}
								<Chart
									label={spec.titulo}
									height={spec.tipo === 'barras'
										? `${Math.max(12, rows.length * 1.9 + 2)}rem`
										: '18rem'}
									option={(tokens) => answerChart(tokens, spec, rows)}
								/>
							{/snippet}
						</Panel>
						<details class="query">
							<summary>SQL do gráfico</summary>
							<pre><code>{part.input.sql}</code></pre>
						</details>
					</div>
				{:else if part.state === 'output-error'}
					<p class="meta">Não foi possível montar o gráfico: {part.errorText}</p>
				{:else}
					<p class="pending">Montando gráfico</p>
				{/if}
			{:else if part.type === 'tool-buscar_documentos'}
				<p class="meta">
					{#if part.state === 'output-available'}
						Documentos consultados: {part.input.consulta}
					{:else if part.state === 'output-error'}
						A busca em documentos falhou.
					{:else}
						<span class="pending">Buscando nos documentos</span>
					{/if}
				</p>
			{/if}
		{/each}

		{#if cited.length > 0}
			<section class="sources" aria-label="Fontes citadas">
				<h3>Fontes</h3>
				<ol>
					{#each cited as hit (hit.ref)}
						<li id="fonte-{hit.ref}" value={hit.ref}>
							<strong>{hit.title}</strong>, {location(hit)}
							<details>
								<summary>Trecho</summary>
								<p>{hit.content}</p>
							</details>
						</li>
					{/each}
				</ol>
			</section>
		{/if}
	</div>
{/if}

<style>
	.question {
		align-self: flex-end;
		max-inline-size: min(36rem, 90%);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius);
		background: var(--surface);
		white-space: pre-wrap;
	}

	.answer {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.note,
	.meta {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.note {
		max-inline-size: var(--measure);
		padding-inline-start: var(--space-3);
		border-inline-start: 2px solid var(--rule);
	}

	.meta {
		margin-inline-start: var(--space-2);
	}

	p.meta {
		margin-inline-start: 0;
	}

	.pending::after {
		content: '…';
		animation: blink 1.2s steps(2, start) infinite;
	}

	.query {
		font-size: var(--text-sm);
	}

	.sources summary {
		color: var(--ink-2);
		cursor: pointer;
	}

	.query summary {
		color: var(--ink-2);
		cursor: pointer;
	}

	.query[open] summary {
		margin-block-end: var(--space-2);
	}

	pre {
		overflow-x: auto;
		padding: var(--space-3);
		margin-block-end: var(--space-3);
		border-radius: var(--radius);
		background: var(--surface);
		font-size: var(--text-xs);
		white-space: pre-wrap;
	}

	.chart {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.sources {
		padding-block-start: var(--space-3);
		border-block-start: var(--border);
		font-size: var(--text-sm);
	}

	.sources h3 {
		margin-block-end: var(--space-2);
		font-size: var(--text-sm);
	}

	.sources ol {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding-inline-start: var(--space-5);
	}

	.sources li:target {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.sources details p {
		max-inline-size: var(--measure);
		margin-block-start: var(--space-1);
		color: var(--ink-2);
		white-space: pre-wrap;
	}

	@keyframes blink {
		to {
			visibility: hidden;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pending::after {
			animation: none;
		}
	}
</style>
