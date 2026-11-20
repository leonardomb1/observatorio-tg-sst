<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import { rankingBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import { formatDecimal, formatInteger } from '#lib/format.ts';
	import type { WorldComparison } from '#lib/server/catalog/internacional.ts';
	import { topicSource } from '#lib/sources.ts';

	interface Props {
		data: WorldComparison;
	}

	let { data }: Props = $props();

	const BRAZIL = 'Brasil (observatório)';
	const source = $derived(topicSource('ilostat', `último ano de cada país`));
	const rows = $derived(
		[
			...data.countries.map((row) => ({ ...row, highlight: false })),
			...(data.brazil.rate === null
				? []
				: [
						{
							iso3: 'BRA',
							name: BRAZIL,
							year: data.brazil.year,
							rate: data.brazil.rate,
							highlight: true
						}
					])
		].toSorted((a, b) => b.rate - a.rate)
	);
	const position = $derived(rows.findIndex((row) => row.highlight) + 1);
</script>

<Panel
	title={position
		? `O Brasil fica em ${formatInteger(position)}º entre ${formatInteger(rows.length)} países na taxa de acidentes fatais`
		: 'Taxa de acidentes de trabalho fatais por país'}
	subtitle="Óbitos por acidente de trabalho por 100 mil trabalhadores, último ano de cada país desde 2018"
	{source}
	columns={[
		{ key: 'name', label: 'País' },
		{ key: 'year', label: 'Ano' },
		{
			key: 'rate',
			label: 'Óbitos por 100 mil',
			numeric: true,
			format: (cell) => formatDecimal(cell as number, 2)
		}
	]}
	{rows}
	slug="oit-taxa-fatal-paises"
>
	{#snippet note()}
		<p>
			Cada país mede com a própria fonte (seguro de acidentes, inspeção do trabalho, pesquisa) e
			sobre a própria base de trabalhadores; países com seguro restrito ao emprego formal ou com
			subnotificação aparecem com taxas baixas. A comparação mostra ordens de grandeza, não um
			ranking exato.
		</p>
		<p>
			O Brasil entra com a taxa do observatório, {formatDecimal(data.brazil.rate, 2)} óbitos com CAT por
			100 mil vínculos formais em {data.brazil.year}{#if data.brazilIlo}; a OIT só tem o Brasil até {data
					.brazilIlo.year} ({formatDecimal(data.brazilIlo.rate, 2)}){/if}.
		</p>
		{#if data.excluded.length}
			<p>
				Fora do gráfico por valor implausível: {data.excluded
					.map((row) => `${row.name} (${formatDecimal(row.rate, 0)} em ${row.year})`)
					.join(', ')}.
			</p>
		{/if}
	{/snippet}
	{#snippet chart()}
		<Chart
			label="Taxa de acidentes fatais por 100 mil trabalhadores por país, com o Brasil destacado."
			height="{rows.length * 1.4 + 2}rem"
			option={(tokens) =>
				rankingBars(
					tokens,
					rows.map((row) => ({
						label: `${row.name} (${row.year})`,
						value: row.rate,
						highlight: row.highlight
					})),
					(value) => formatDecimal(value, 2)
				)}
		/>
	{/snippet}
</Panel>
