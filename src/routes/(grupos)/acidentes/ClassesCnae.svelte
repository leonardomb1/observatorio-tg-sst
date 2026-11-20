<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import { rankingBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import { formatDecimal, formatInteger } from '#lib/format.ts';
	import type { SectorRate } from '#lib/server/catalog/taxas.ts';

	interface Props {
		year: number;
		sectors: readonly SectorRate[];
		source: { name: string; href: string; updatedAt: string };
	}

	let { year, sectors, source }: Props = $props();

	const TOP = 20;
	let deaths = $state(false);
	const value = (row: SectorRate) => (deaths ? row.deathRate : row.accidentRate);
	const format = (number: number) => formatDecimal(number, deaths ? 2 : 1);
	const sorted = $derived(
		sectors
			.filter((row) => value(row) !== null)
			.toSorted((a, b) => (value(b) ?? 0) - (value(a) ?? 0))
	);
	const lead = $derived(sorted[0]);
</script>

<Panel
	title={lead
		? `${lead.name} tem a maior taxa de ${deaths ? 'óbitos' : 'acidentes'} entre as classes de atividade em ${year}`
		: `Classes de atividade por taxa, ${year}`}
	subtitle="{deaths
		? 'Óbitos'
		: 'Acidentes'} com CAT por 100 mil vínculos formais, por classe da CNAE com base suficiente, Brasil, {year}"
	{source}
	columns={[
		{ key: 'code', label: 'Classe CNAE' },
		{ key: 'name', label: 'Atividade' },
		{
			key: 'accidentRate',
			label: 'Acidentes por 100 mil',
			numeric: true,
			format: (cell) => formatDecimal(cell as number | null)
		},
		{
			key: 'deathRate',
			label: 'Óbitos por 100 mil',
			numeric: true,
			format: (cell) => formatDecimal(cell as number | null, 2)
		},
		{
			key: 'jobs',
			label: 'Vínculos',
			numeric: true,
			format: (cell) => formatInteger(cell as number)
		}
	]}
	rows={sorted}
	slug="classes-cnae-{year}"
>
	{#snippet note()}
		<p>
			Só entram as classes com vínculos suficientes para que um único óbito não mova a taxa; o
			gráfico mostra as {TOP} maiores e a tabela, todas.
		</p>
	{/snippet}
	{#snippet chart()}
		<div class="switch" role="group" aria-label="Medida do painel">
			<button type="button" aria-pressed={!deaths} onclick={() => (deaths = false)}
				>Acidentes</button
			>
			<button type="button" aria-pressed={deaths} onclick={() => (deaths = true)}>Óbitos</button>
		</div>
		<Chart
			label="Classes de atividade com maior taxa em {year}."
			height="{TOP * 1.6 + 1}rem"
			option={(tokens) =>
				rankingBars(
					tokens,
					sorted.slice(0, TOP).map((row) => ({ label: row.name, value: value(row) })),
					format
				)}
		/>
	{/snippet}
</Panel>

<style>
	.switch {
		display: inline-flex;
		margin-block-end: var(--space-3);
		padding: 2px;
		border: var(--border);
		border-radius: var(--radius);
		font-size: var(--text-xs);
	}

	.switch button {
		padding: var(--space-1) var(--space-2);
		border: 0;
		border-radius: var(--radius);
		background: none;
		color: var(--ink-2);
		font: inherit;
	}

	.switch button[aria-pressed='true'] {
		background: var(--surface);
		color: var(--ink);
	}
</style>
