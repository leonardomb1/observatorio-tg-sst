<script lang="ts">
	import type { Column } from '#lib/csv.ts';
	import type { ConsultaMessage } from '#lib/consulta.ts';
	import DataTable from '#lib/components/DataTable.svelte';
	import { listNames } from '#lib/findings.ts';
	import { formatInteger } from '#lib/format.ts';

	type Part = ConsultaMessage['parts'][number];
	type Row = Record<string, string | number | null>;

	interface Props {
		parts: readonly Part[];
		/** True while this group is the tail of a message that is still streaming. */
		active: boolean;
	}

	let { parts, active }: Props = $props();

	let open = $state(false);

	const tools = $derived(
		parts.filter(
			(part) => part.type === 'tool-consultar_dados' || part.type === 'tool-buscar_documentos'
		)
	);
	const running = $derived(
		active &&
			parts.some((part) =>
				part.type === 'reasoning'
					? part.state === 'streaming'
					: 'state' in part &&
						(part.state === 'input-streaming' || part.state === 'input-available')
			)
	);
	const activity = $derived.by(() => {
		const last = parts.at(-1);
		if (last?.type === 'tool-consultar_dados') return 'Consultando o banco de dados';
		if (last?.type === 'tool-buscar_documentos') return 'Buscando nas normas';
		return 'Analisando a pergunta';
	});
	const summary = $derived.by(() => {
		const sources = [
			tools.some((part) => part.type === 'tool-consultar_dados') ? 'o banco de dados' : null,
			tools.some((part) => part.type === 'tool-buscar_documentos') ? 'as normas' : null
		].filter((source) => source !== null);
		return sources.length > 0 ? `Consultou ${listNames(sources)}` : 'Analisou a pergunta';
	});
	const failed = $derived(tools.filter((part) => part.state === 'output-error').length);

	function columnsOf(names: readonly string[], rows: readonly Row[]): Column<Row>[] {
		return names.map((key) => ({
			key,
			label: key,
			numeric: rows.some((row) => typeof row[key] === 'number')
		}));
	}
</script>

<div class="steps">
	<button type="button" class="toggle" aria-expanded={open} onclick={() => (open = !open)}>
		<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" /></svg>
		{#if running}
			<span class="working">{activity}…</span>
		{:else}
			<span>{summary}</span>
			{#if tools.length > 0}
				<span class="count"
					>· {tools.length}
					{tools.length === 1 ? 'passo' : 'passos'}</span
				>
			{/if}
			{#if failed > 0}
				<span class="count">· {failed} {failed === 1 ? 'refeito' : 'refeitos'}</span>
			{/if}
		{/if}
	</button>

	{#if open}
		<ol class="detail">
			{#each parts as part, index (index)}
				<li>
					{#if part.type === 'reasoning'}
						{#if part.text.trim()}<p class="note">{part.text}</p>{/if}
					{:else if part.type === 'tool-consultar_dados'}
						<p class="label">
							Banco de dados{part.input?.finalidade ? `: ${part.input.finalidade}` : ''}
							{#if part.state === 'output-available'}
								<span class="count"
									>· {formatInteger(part.output.rows.length)}
									{part.output.rows.length === 1 ? 'linha' : 'linhas'}</span
								>
							{/if}
						</p>
						{#if part.input?.sql}<pre><code>{part.input.sql}</code></pre>{/if}
						{#if part.state === 'output-error'}
							<p class="note">Consulta recusada: {part.errorText}</p>
						{:else if part.state === 'output-available' && part.output.rows.length > 0}
							<DataTable
								caption={part.input.finalidade}
								columns={columnsOf(part.output.columns, part.output.rows)}
								rows={part.output.rows}
							/>
						{/if}
					{:else if part.type === 'tool-buscar_documentos'}
						<p class="label">Normas: “{part.input?.consulta ?? ''}”</p>
						{#if part.state === 'output-available'}
							<p class="note">
								{part.output.results.length > 0
									? `${formatInteger(part.output.results.length)} trechos de ${listNames([
											...new Set(part.output.results.map((hit) => hit.title))
										])}`
									: 'Nenhum trecho encontrado nas normas do observatório.'}
							</p>
						{:else if part.state === 'output-error'}
							<p class="note">A busca falhou.</p>
						{/if}
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</div>

<style>
	.steps {
		font-size: var(--text-sm);
	}

	.toggle {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
		max-inline-size: 100%;
		padding: var(--space-1) 0;
		border: 0;
		background: none;
		color: var(--ink-2);
		font: inherit;
		text-align: start;
	}

	.toggle:hover {
		color: var(--ink);
	}

	.toggle svg {
		flex: none;
		inline-size: 0.8rem;
		block-size: 0.8rem;
		fill: none;
		stroke: currentcolor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.toggle[aria-expanded='true'] svg {
		rotate: 90deg;
	}

	.count {
		color: var(--ink-3);
	}

	.working {
		background: linear-gradient(90deg, var(--ink-3) 30%, var(--ink) 50%, var(--ink-3) 70%);
		background-clip: text;
		background-size: 200% 100%;
		color: transparent;
		animation: shimmer 2s linear infinite;
	}

	.detail {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-2) 0 var(--space-2) var(--space-4);
		margin-block-start: var(--space-1);
		margin-inline-start: var(--space-1);
		border-inline-start: 2px solid var(--rule);
		list-style: none;
	}

	.label {
		color: var(--ink);
	}

	.note {
		color: var(--ink-2);
	}

	pre {
		overflow-x: auto;
		padding: var(--space-3);
		margin-block: var(--space-2);
		border-radius: var(--radius);
		background: var(--surface);
		font-size: var(--text-xs);
		white-space: pre-wrap;
	}

	@keyframes shimmer {
		to {
			background-position: -200% 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.working {
			background: none;
			color: var(--ink-2);
			animation: none;
		}
	}
</style>
