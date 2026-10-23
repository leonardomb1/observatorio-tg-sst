<script lang="ts" generics="Row">
	import type { Snippet } from 'svelte';
	import { toCsv, type Column } from '#lib/csv.ts';
	import type { YearStatus } from '#lib/status.ts';
	import DataTable from './DataTable.svelte';
	import Icon from './Icon.svelte';
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
			<p class="subtitle">
				{subtitle}
				{#if status && status !== 'consolidado'}<StatusBadge {status} {period} />{/if}
			</p>
		</div>
		<div class="tools">
			<div class="views" role="group" aria-label="Forma de exibição">
				<button
					type="button"
					aria-pressed={view === 'chart'}
					aria-label="Ver gráfico"
					onclick={() => (view = 'chart')}><Icon name="chart" /></button
				>
				<button
					type="button"
					aria-pressed={view === 'table'}
					aria-label="Ver tabela"
					onclick={() => (view = 'table')}><Icon name="table" /></button
				>
			</div>
			<button type="button" class="tool" aria-label="Baixar dados em CSV" onclick={downloadCsv}
				><Icon name="download" /></button
			>
			{#if note}<InfoNote label="Sobre este indicador">{@render note()}</InfoNote>{/if}
		</div>
	</header>

	<div>
		{#if view === 'chart'}
			<svelte:boundary>
				{@render chart()}
				{#snippet failed()}
					<p class="error">Não foi possível desenhar o gráfico. Os dados estão na tabela.</p>
				{/snippet}
			</svelte:boundary>
		{:else}
			<DataTable caption={title} {columns} {rows} />
		{/if}
	</div>

	<footer class="foot">
		<a href={source.href} rel="external">{source.name}</a>, {source.updatedAt}
	</footer>
</section>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding-block: var(--space-4);
		border-block-start: 1px solid var(--ink);
	}

	.head {
		display: flex;
		gap: var(--space-3) var(--space-4);
		align-items: flex-start;
		justify-content: space-between;
	}

	h3 {
		font-size: var(--text-lg);
		line-height: var(--leading-tight);
	}

	.subtitle {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: baseline;
		margin-block-start: var(--space-1);
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.tools {
		display: flex;
		flex: none;
		gap: var(--space-1);
		align-items: center;
	}

	.views {
		display: flex;
		padding: 2px;
		border: var(--border);
		border-radius: var(--radius);
	}

	.views button,
	.tool {
		display: grid;
		place-items: center;
		inline-size: 2rem;
		block-size: 2rem;
		padding: 0;
		border: 0;
		border-radius: var(--radius);
		background: none;
		color: var(--ink-2);
	}

	.views button:hover,
	.tool:hover {
		color: var(--ink);
	}

	.views button[aria-pressed='true'] {
		background: var(--surface);
		color: var(--ink);
	}

	.error {
		padding-block: var(--space-6);
		color: var(--ink-2);
	}

	.foot {
		color: var(--ink-3);
		font-size: var(--text-xs);
	}

	.foot a {
		color: var(--ink-2);
	}
</style>
