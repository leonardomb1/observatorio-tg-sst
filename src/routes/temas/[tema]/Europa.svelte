<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import { compareLines, rankingBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import { formatDecimal, formatInteger } from '#lib/format.ts';
	import type { EuropeComparison } from '#lib/server/catalog/europa.ts';
	import { topicSource } from '#lib/sources.ts';

	interface Props {
		data: EuropeComparison;
	}

	let { data }: Props = $props();

	const source = $derived(topicSource('eurostat', `comparação em ${data.year}`));
	const ranked = $derived(
		data.sectors
			.filter((row) => row.ratio !== null && row.deaths >= 10)
			.toSorted((a, b) => (b.brazilRate ?? 0) - (a.brazilRate ?? 0))
			.slice(0, 15)
	);
	const top = $derived(ranked[0]);
	const national = $derived(data.totals.find((row) => row.year === data.year));
	const years = $derived(data.totals.map((row) => row.year));
</script>

<div class="l-grid panels">
	<Panel
		title={national?.brazil && national.eu
			? `Em ${data.year}, a taxa de óbitos no trabalho no Brasil foi ${formatDecimal(national.brazil / national.eu)} vezes a da União Europeia`
			: 'Taxa de óbitos no trabalho, Brasil e União Europeia'}
		subtitle="Óbitos por 100 mil: Brasil sobre vínculos formais (anos consolidados), UE-27 sobre pessoas ocupadas"
		{source}
		columns={[
			{ key: 'year', label: 'Ano' },
			{
				key: 'brazil',
				label: 'Brasil',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null, 2)
			},
			{
				key: 'eu',
				label: 'UE-27',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null, 2)
			}
		]}
		rows={data.totals}
		slug="obitos-brasil-ue27-por-ano"
	>
		{#snippet note()}
			<p>
				A taxa brasileira é um piso: conta só os óbitos com CAT e só o emprego formal. A europeia é
				a taxa padronizada do Eurostat, sobre toda a população ocupada. Anos brasileiros com lacunas
				de publicação da CAT ficam sem ponto.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Óbitos no trabalho por 100 mil, Brasil e União Europeia, por ano."
				height="18rem"
				option={(tokens) =>
					compareLines(
						tokens,
						years,
						{ label: 'Brasil', values: data.totals.map((row) => row.brazil) },
						{ label: 'UE-27', values: data.totals.map((row) => row.eu) },
						(value) => formatDecimal(value)
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title={top?.ratio && top.brazilRate
			? `${top.name}, a atividade mais letal no Brasil, mata ${formatDecimal(top.ratio)} vezes mais que na União Europeia`
			: `Atividades mais letais no Brasil, ${data.year}`}
		subtitle="Óbitos por 100 mil vínculos formais nas 15 divisões de atividade mais letais do Brasil, {data.year}; a tabela traz a taxa europeia e a razão"
		{source}
		columns={[
			{ key: 'name', label: 'Divisão de atividade' },
			{
				key: 'ratio',
				label: 'Brasil ÷ UE-27',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			},
			{
				key: 'brazilRate',
				label: 'Brasil (por 100 mil)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null, 2)
			},
			{
				key: 'euRate',
				label: 'UE-27 (por 100 mil)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null, 2)
			},
			{
				key: 'deaths',
				label: 'Óbitos no Brasil',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			}
		]}
		rows={ranked}
		slug="atividades-mais-letais-brasil-ue27-{data.year}"
	>
		{#snippet note()}
			<p>
				As divisões da NACE europeia coincidem com as da CNAE. Entram as atividades com ao menos 50
				mil vínculos e 10 óbitos no ano, para que a razão não dependa de poucos casos.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Óbitos por 100 mil vínculos nas atividades mais letais do Brasil em {data.year}."
				height="30rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						ranked.map((row) => ({ label: row.name, value: row.brazilRate })),
						(value) => formatDecimal(value)
					)}
			/>
		{/snippet}
	</Panel>
</div>

<style>
	.panels {
		--grid-min: 30rem;
		--grid-gap: var(--space-7) var(--space-6);
	}
</style>
