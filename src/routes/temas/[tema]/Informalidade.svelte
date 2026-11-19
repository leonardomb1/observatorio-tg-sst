<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import { compareLines, rankingBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import { formatDecimal, formatInteger, formatPercent } from '#lib/format.ts';
	import type { Informality } from '#lib/server/catalog/informalidade.ts';
	import { topicSource } from '#lib/sources.ts';

	interface Props {
		data: Informality;
	}

	let { data }: Props = $props();

	const lastQuarter = $derived(data.quarters.at(-1)?.quarter ?? null);
	const source = $derived(
		topicSource(
			'pnad',
			lastQuarter
				? `PNAD até o ${lastQuarter % 100}º trimestre de ${Math.floor(lastQuarter / 100)}`
				: 'PNAD Contínua'
		)
	);
	const ranked = $derived(data.states.toSorted((a, b) => a.tiesPerHundred - b.tiesPerHundred));
	const lowest = $derived(ranked[0]);
	const fourth = $derived(data.quarters.filter((row) => row.quarter % 100 === 4));
	const years = $derived([...new Set(fourth.map((row) => Math.floor(row.quarter / 100)))]);
	const series = (sex: string) =>
		years.map(
			(year) =>
				fourth.find((row) => row.sex === sex && Math.floor(row.quarter / 100) === year)?.ratePct ??
				null
		);
	const latest = $derived(data.quarters.filter((row) => row.quarter === lastQuarter));
	const total = $derived(latest.find((row) => row.sex === 'Total'));
	const rows = $derived(
		years.map((year) => ({
			year,
			total: series('Total')[years.indexOf(year)] ?? null,
			men: series('Homens')[years.indexOf(year)] ?? null,
			women: series('Mulheres')[years.indexOf(year)] ?? null
		}))
	);
</script>

<div class="l-grid panels">
	<Panel
		title={lowest
			? `${lowest.uf} tem ${formatInteger(lowest.tiesPerHundred)} vínculos formais para cada 100 pessoas ocupadas, o menor alcance do emprego formal no país`
			: `Vínculos formais por 100 ocupados, ${data.year}`}
		subtitle="Vínculos ativos da RAIS em 31 de dezembro por 100 pessoas ocupadas na PNAD do 4º trimestre, por UF, {data.year}"
		{source}
		columns={[
			{ key: 'uf', label: 'UF' },
			{
				key: 'tiesPerHundred',
				label: 'Vínculos por 100 ocupados',
				numeric: true,
				format: (cell) => formatDecimal(cell as number)
			},
			{
				key: 'informalityPct',
				label: 'Taxa de informalidade (%)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			},
			{
				key: 'employedThousands',
				label: 'Ocupados (mil)',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			}
		]}
		rows={ranked}
		slug="vinculos-por-100-ocupados-{data.year}"
	>
		{#snippet note()}
			<p>
				As taxas do observatório dividem os acidentes pelos vínculos formais. Onde há poucos
				vínculos por ocupado, a taxa fala de uma parte pequena de quem trabalha, e o risco de quem
				está fora do emprego formal não aparece nela.
			</p>
			<p>
				É uma razão, não uma proporção de pessoas: a RAIS conta vínculos (uma pessoa pode ter mais
				de um) e inclui estatutários, por isso passa de 100 no Distrito Federal.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Vínculos formais por 100 pessoas ocupadas por UF em {data.year}."
				height="40rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						data.states.map((row) => ({ label: row.uf, value: row.tiesPerHundred })),
						(value) => formatDecimal(value),
						{ value: 100, label: '100 por 100' }
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title={total && lastQuarter
			? `${formatPercent(total.ratePct / 100)} das pessoas ocupadas estavam na informalidade no ${lastQuarter % 100}º trimestre de ${Math.floor(lastQuarter / 100)}`
			: 'Taxa de informalidade'}
		subtitle="Pessoas ocupadas em situação de informalidade, em % das ocupadas, Brasil; o gráfico mostra o 4º trimestre de cada ano"
		{source}
		columns={[
			{ key: 'year', label: 'Ano' },
			{
				key: 'total',
				label: 'Total (%)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			},
			{
				key: 'men',
				label: 'Homens (%)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			},
			{
				key: 'women',
				label: 'Mulheres (%)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			}
		]}
		{rows}
		slug="taxa-de-informalidade-por-ano"
	>
		{#snippet note()}
			<p>
				Informalidade pelo critério do IBGE: empregado sem carteira, trabalhador doméstico sem
				carteira, empregador e conta própria sem CNPJ, e trabalhador familiar auxiliar. A série
				começa no fim de 2015.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Taxa de informalidade de homens e mulheres no 4º trimestre de cada ano."
				height="18rem"
				option={(tokens) =>
					compareLines(
						tokens,
						years,
						{ label: 'Homens', values: series('Homens') },
						{ label: 'Mulheres', values: series('Mulheres') },
						(value) => formatPercent(value / 100)
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
