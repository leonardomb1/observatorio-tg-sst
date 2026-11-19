<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import { compareLines, rankingBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import { formatDecimal, formatInteger, formatPercent } from '#lib/format.ts';
	import type { HealthDeaths } from '#lib/server/catalog/sim.ts';
	import { topicSource } from '#lib/sources.ts';

	interface Props {
		data: HealthDeaths;
	}

	let { data }: Props = $props();

	const source = $derived(
		topicSource(
			'sim',
			`óbitos de ${data.years[0]?.year ?? '—'} a ${data.years.at(-1)?.year ?? '—'}`
		)
	);
	const years = $derived(data.years.map((row) => row.year));
	const comparable = $derived(
		data.years.filter((row) => !row.simPreliminary && row.catComplete && row.catDeaths)
	);
	const latest = $derived(comparable.at(-1));
	const ratio = $derived(latest?.catDeaths ? latest.simDeaths / latest.catDeaths : null);
	const ranked = $derived(data.states.toSorted((a, b) => (a.filledPct ?? 0) - (b.filledPct ?? 0)));
	const lowest = $derived(ranked[0]);
	const highest = $derived(ranked.at(-1));
	const yearRow = $derived(data.years.find((row) => row.year === data.year));
	const road = $derived(data.causes.find((row) => row.cause === 'Trânsito'));
	const causesTotal = $derived(data.causes.reduce((sum, row) => sum + row.deaths, 0));
</script>

<div class="l-grid panels">
	<Panel
		title={latest && ratio
			? `Em ${latest.year}, o SUS registrou ${formatDecimal(ratio)} vez as mortes no trabalho que a CAT registrou`
			: 'Óbitos por acidente de trabalho no SIM e com CAT'}
		subtitle="Óbitos com o campo acidente de trabalho marcado no SIM e óbitos com CAT, por ano"
		{source}
		columns={[
			{ key: 'year', label: 'Ano' },
			{
				key: 'simDeaths',
				label: 'Óbitos no SIM',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			},
			{
				key: 'catDeaths',
				label: 'Óbitos com CAT',
				numeric: true,
				format: (cell) => formatInteger(cell as number | null)
			},
			{
				key: 'filledPct',
				label: 'Campo preenchido nas causas externas (%)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			}
		]}
		rows={data.years}
		slug="obitos-trabalho-sim-e-cat"
	>
		{#snippet note()}
			<p>
				O SIM, registro de óbitos do SUS, alcança o informal, o autônomo e o servidor, que não geram
				CAT. Os anos sem linha são os que não se comparam: o último ano do SIM é preliminar, e a CAT
				tem anos com lacunas de publicação.
			</p>
			<p>
				A contagem do SIM também é um piso: o campo acidente de trabalho só é preenchido em cerca de
				um quarto dos óbitos por causas externas.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Óbitos por acidente de trabalho no SIM e com CAT, por ano, só nos anos comparáveis."
				height="18rem"
				option={(tokens) =>
					compareLines(
						tokens,
						years,
						{
							label: 'SIM',
							values: data.years.map((row) => (row.simPreliminary ? null : row.simDeaths))
						},
						{
							label: 'CAT',
							values: data.years.map((row) => (row.catComplete ? row.catDeaths : null))
						},
						(value) => formatInteger(value)
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title={lowest?.filledPct != null && highest?.filledPct != null
			? `O campo acidente de trabalho vai de ${formatPercent(lowest.filledPct / 100)} preenchido em ${lowest.uf} a ${formatPercent(highest.filledPct / 100)} em ${highest.uf}`
			: `Preenchimento do campo acidente de trabalho, ${data.year}`}
		subtitle="Óbitos por causas externas com o campo acidente de trabalho respondido (sim ou não), por UF de ocorrência, {data.year}"
		{source}
		columns={[
			{ key: 'uf', label: 'UF' },
			{
				key: 'filledPct',
				label: 'Campo preenchido (%)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			},
			{
				key: 'simDeaths',
				label: 'Óbitos de trabalho no SIM',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			},
			{
				key: 'catDeaths',
				label: 'Óbitos com CAT',
				numeric: true,
				format: (cell) => formatInteger(cell as number | null)
			}
		]}
		rows={ranked}
		slug="sim-preenchimento-por-uf-{data.year}"
	>
		{#snippet note()}
			<p>
				Onde o campo quase nunca é preenchido, o SIM pode registrar menos mortes no trabalho que a
				própria CAT. A diferença entre estados mede a qualidade da declaração de óbito, não o risco.
			</p>
			<p>A UF do SIM é a de ocorrência; a da CAT, a do empregador.</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Preenchimento do campo acidente de trabalho por UF em {data.year}."
				height="40rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						data.states.map((row) => ({ label: row.uf, value: row.filledPct })),
						(value) => formatPercent(value / 100),
						yearRow?.filledPct != null
							? {
									value: yearRow.filledPct,
									label: `Brasil: ${formatPercent(yearRow.filledPct / 100)}`
								}
							: undefined
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title={road && causesTotal
			? `O trânsito responde por ${formatPercent(road.deaths / causesTotal)} das mortes no trabalho registradas pelo SUS em ${data.year}`
			: `Óbitos de trabalho por grupo de causa, ${data.year}`}
		subtitle="Óbitos com o campo acidente de trabalho marcado no SIM, por grupo da causa básica, {data.year}"
		{source}
		columns={[
			{ key: 'cause', label: 'Grupo de causa' },
			{
				key: 'deaths',
				label: 'Óbitos',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			}
		]}
		rows={data.causes}
		slug="sim-obitos-trabalho-por-causa-{data.year}"
	>
		{#snippet chart()}
			<Chart
				label="Óbitos por acidente de trabalho no SIM por grupo de causa em {data.year}."
				height="20rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						data.causes.map((row) => ({ label: row.cause, value: row.deaths })),
						(value) => formatInteger(value)
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
