<script lang="ts" generics="Row">
	import type { Snippet } from 'svelte';
	import { toCsv, type Column } from '#lib/csv.ts';
	import type { YearStatus } from '#lib/status.ts';
	import DataTable from './DataTable.svelte';
	import InfoNote from './InfoNote.svelte';
	import StatusBadge from './StatusBadge.svelte';

	interface Source {
		name: string;
		href: string;
		updatedAt: string;
	}

	interface Props {
		/** States the finding, not the topic: "Trajeto mata 2,6 vezes mais por acidente". */
		title: string;
		/** Measure, unit and denominator. */
		subtitle: string;
		status?: YearStatus;
		period?: string;
		source: Source;
		columns: readonly Column<Row>[];
		rows: readonly Row[];
		/** File name for the CSV download, without extension. */
		slug: string;
		chart: Snippet;
		note?: Snippet;
	}

	let { title, subtitle, status, period, source, columns, rows, slug, chart, note }: Props =
		$props();

	const id = $props.id();
	let view = $state<'chart' | 'table'>('chart');

	function downloadCsv() {
		const url = URL.createObjectURL(
			new Blob([toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' })
		);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${slug}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	}
</script>

<section class="panel" aria-labelledby="{id}-title">
	<header class="head">
		<div class="titles">
			<h3 id="{id}-title">{title}</h3>
			<div class="subtitle">
				{subtitle}
				{#if note}<InfoNote label="Sobre este indicador">{@render note()}</InfoNote>{/if}
			</div>
		</div>
		{#if status}<StatusBadge {status} {period} />{/if}
	</header>

	<div class="views" role="group" aria-label="Forma de exibição">
		<button type="button" aria-pressed={view === 'chart'} onclick={() => (view = 'chart')}
			>Gráfico</button
		>
		<button type="button" aria-pressed={view === 'table'} onclick={() => (view = 'table')}
			>Tabela</button
		>
	</div>

	<div>
		{#if view === 'chart'}
			<svelte:boundary>
				{@render chart()}
				{#snippet failed()}
					<p class="error">Não foi possível desenhar o gráfico. Os dados estão na aba Tabela.</p>
				{/snippet}
			</svelte:boundary>
		{:else}
			<DataTable caption={title} {columns} {rows} />
		{/if}
	</div>

	<footer class="foot">
		<span>
			Fonte: <a href={source.href} rel="external">{source.name}</a>. Atualizado em {source.updatedAt}.
		</span>
		<button type="button" class="download" onclick={downloadCsv}>Baixar CSV</button>
	</footer>
</section>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding-block: var(--space-4);
		border-block-start: 1px solid var(--ink);
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		align-items: baseline;
		justify-content: space-between;
	}

	h3 {
		font-size: var(--text-lg);
	}

	.subtitle {
		margin-block-start: var(--space-1);
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.views {
		display: flex;
		gap: var(--space-4);
		border-block-end: var(--border);
	}

	.views button {
		padding: var(--space-1) 0;
		border: 0;
		border-block-end: 2px solid transparent;
		margin-block-end: -1px;
		background: none;
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.views button[aria-pressed='true'] {
		border-block-end-color: var(--ink);
		color: var(--ink);
	}

	.error {
		padding-block: var(--space-6);
		color: var(--ink-2);
	}

	.download {
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.18em;
	}

	.foot {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		justify-content: space-between;
		color: var(--ink-2);
		font-size: var(--text-xs);
	}
</style>
