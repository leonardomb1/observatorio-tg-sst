<script lang="ts">
	import { answerChart } from '#lib/charts/answer.ts';
	import Chart from '#lib/charts/Chart.svelte';
	import { specFormat, type ConsultaMessage } from '#lib/consulta.ts';
	import type { Column } from '#lib/csv.ts';
	import Panel from '#lib/components/Panel.svelte';
	import { catSource } from '#lib/sources.ts';
	import Button from '#lib/components/Button.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Markdown from './Markdown.svelte';
	import Steps from './Steps.svelte';

	type Part = ConsultaMessage['parts'][number];
	type Row = Record<string, string | number | null>;
	type Segment =
		| { kind: 'steps'; parts: Part[] }
		| { kind: 'text'; text: string }
		| { kind: 'chart'; part: Extract<Part, { type: 'tool-mostrar_grafico' }> };

	interface Props {
		message: ConsultaMessage;
		publishedUntil: { year: number; month: number };
		/** True while this message is still being streamed. */
		streaming: boolean;
		/** Present when this question may be rewritten; asks it again with the new text. */
		onrewrite?: ((text: string) => void) | undefined;
	}

	let { message, publishedUntil, streaming, onrewrite }: Props = $props();

	let editing = $state(false);
	let draft = $state('');

	let copied = $state(false);

	const source = $derived(catSource(publishedUntil));

	/** Consecutive reasoning and lookup parts collapse into one "steps" line, as in chat tools. */
	const segments = $derived.by(() => {
		const out: Segment[] = [];
		for (const part of message.parts) {
			if (part.type === 'text') {
				if (part.text.trim()) out.push({ kind: 'text', text: part.text });
			} else if (part.type === 'tool-mostrar_grafico') {
				out.push({ kind: 'chart', part });
			} else if (
				part.type === 'reasoning' ||
				part.type === 'tool-consultar_dados' ||
				part.type === 'tool-buscar_documentos'
			) {
				const last = out.at(-1);
				if (last?.kind === 'steps') last.parts.push(part);
				else out.push({ kind: 'steps', parts: [part] });
			}
		}
		return out;
	});

	const answerText = $derived(
		message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('\n\n')
	);
	const hits = $derived(
		message.parts.flatMap((part) =>
			part.type === 'tool-buscar_documentos' && part.state === 'output-available'
				? part.output.results
				: []
		)
	);
	const cited = $derived.by(() => {
		const numbers = new Set(
			[...answerText.matchAll(/\[(\d{1,4})\]/g)].map((match) => Number(match[1]))
		);
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

	async function copy() {
		await navigator.clipboard.writeText(answerText.trim());
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

{#if message.role === 'user'}
	{#if editing && onrewrite}
		<form
			class="edit"
			onsubmit={(event) => {
				event.preventDefault();
				if (!draft.trim()) return;
				editing = false;
				onrewrite(draft.trim());
			}}
		>
			<label class="visually-hidden" for="editar-{message.id}">Nova pergunta</label>
			<textarea id="editar-{message.id}" bind:value={draft} rows="3" maxlength="4000"></textarea>
			<p class="hint">As respostas a partir desta pergunta serão substituídas.</p>
			<div class="edit-actions">
				<Button onclick={() => (editing = false)}>Cancelar</Button>
				<Button type="submit" variant="primary" disabled={!draft.trim()}>Perguntar de novo</Button>
			</div>
		</form>
	{:else}
		<div class="question">
			{#each message.parts as part, index (index)}
				{#if part.type === 'text'}<p>{part.text}</p>{/if}
			{/each}
		</div>
		{#if onrewrite}
			<div class="actions own">
				<button
					type="button"
					onclick={() => {
						draft = answerText;
						editing = true;
					}}><Icon name="pencil" size={0.9} />Editar pergunta</button
				>
			</div>
		{/if}
	{/if}
{:else}
	<div class="answer">
		{#each segments as segment, index (index)}
			{#if segment.kind === 'steps'}
				<Steps parts={segment.parts} active={streaming && index === segments.length - 1} />
			{:else if segment.kind === 'text'}
				<Markdown text={segment.text} {refs} />
			{:else if segment.part.state === 'output-available'}
				{@const { spec, rows, columns } = segment.part.output}
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
				</div>
			{:else if segment.part.state === 'output-error'}
				<p class="meta">Não foi possível montar o gráfico: {segment.part.errorText}</p>
			{:else}
				<p class="meta">Montando o gráfico…</p>
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

		{#if !streaming && answerText.trim()}
			<div class="actions">
				<button type="button" onclick={copy}>{copied ? 'Copiado' : 'Copiar resposta'}</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	.edit {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		align-self: stretch;
	}

	.edit textarea {
		inline-size: 100%;
		padding: var(--space-3);
		border: 1px solid var(--ink);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		font: inherit;
		resize: vertical;
	}

	.hint {
		color: var(--ink-2);
		font-size: var(--text-xs);
	}

	.edit-actions {
		display: flex;
		gap: var(--space-2);
		justify-content: flex-end;
	}

	.own {
		align-self: flex-end;
		margin-block-start: var(--space-1);
	}

	.question {
		align-self: flex-end;
		max-inline-size: min(36rem, 85%);
		padding: var(--space-3) var(--space-4);
		border: var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.answer {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.meta {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.chart {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.sources summary {
		color: var(--ink-2);
		cursor: pointer;
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

	.actions button {
		display: inline-flex;
		gap: var(--space-1);
		align-items: center;
		padding: 0;
		border: 0;
		background: none;
		color: var(--ink-3);
		font: inherit;
		font-size: var(--text-xs);
	}

	.actions button:hover {
		color: var(--ink);
	}
</style>
