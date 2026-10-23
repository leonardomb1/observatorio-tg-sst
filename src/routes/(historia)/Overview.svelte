<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import { rankingBars, yearBars } from '#lib/charts/options.ts';
	import KpiCard from '#lib/components/KpiCard.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import { formatDecimal, formatInteger, formatMonthYear } from '#lib/format.ts';
	import { leader, listNames, timesAbove } from '#lib/findings.ts';
	import { catSource } from '#lib/sources.ts';
	import { yearStatusLabel, type YearStatus } from '#lib/status.ts';
	import { reveal } from '#lib/viewport.ts';
	import type { PageData } from './$types';

	type Props = PageData['overview'] & Pick<PageData, 'calendar'>;

	let { calendar, year, series, brazil, lethality }: Props = $props();

	const source = $derived(catSource(calendar.publishedUntil));
	/** How each accident type reads inside a sentence, as subject and as the term of comparison. */
	const TYPE_TEXT: Record<string, { subject: string; object: string }> = {
		Trajeto: { subject: 'No trajeto', object: 'o de trajeto' },
		Típico: { subject: 'No acidente típico', object: 'o típico' },
		Doença: { subject: 'Na doença do trabalho', object: 'a doença do trabalho' }
	};

	const peak = $derived(
		leader(
			series.filter((row) => row.status === 'consolidado'),
			(row) => row.accidentRate,
			(value) => formatDecimal(value)
		)
	);
	const deadliest = $derived(
		leader(
			lethality,
			(row) => row.deathsPer100kAccidents,
			(value) => formatInteger(value)
		)
	);
	const safest = $derived(
		lethality.reduce<(typeof lethality)[number] | null>(
			(low, row) => (low && low.deathsPer100kAccidents <= row.deathsPer100kAccidents ? low : row),
			null
		)
	);
	const lethalityTitle = $derived.by(() => {
		if (!deadliest || deadliest.tied.length || !safest) return null;
		const subject = TYPE_TEXT[deadliest.row.type]?.subject;
		const object = TYPE_TEXT[safest.type]?.object;
		const times = timesAbove(deadliest.row.deathsPer100kAccidents / safest.deathsPer100kAccidents);
		return subject && object && times
			? `${subject}, cada acidente é ${times} mais letal que ${object}`
			: null;
	});
</script>

<section data-section="" class="l-stack overview" aria-labelledby="visao-geral-title">
	<header class="l-stack intro">
		<h1 id="visao-geral-title">Acidentes de trabalho no Brasil</h1>
		<p class="lede">
			Acidentes comunicados ao INSS por meio da CAT, divididos pelo emprego formal da RAIS. As taxas
			excluem a administração pública, cujos servidores estatutários não emitem CAT. Dados
			publicados até {formatMonthYear(calendar.publishedUntil.year, calendar.publishedUntil.month)};
			o último ano consolidado é {year}.
		</p>
	</header>

	{#if brazil}
		<div class="kpis" role="group" aria-label="Indicadores de {year}">
			<KpiCard
				label="Taxa de acidentes"
				value={brazil.accidentRate}
				format={(value) => formatDecimal(value)}
				unit="por 100 mil vínculos"
				context="{year}, Brasil"
			/>
			<KpiCard
				label="Taxa de óbitos"
				value={brazil.deathRate}
				format={(value) => formatDecimal(value, 2)}
				unit="por 100 mil vínculos"
				context="{year}, Brasil"
			/>
			<KpiCard
				label="Acidentes com CAT"
				value={brazil.allAccidents}
				format={formatInteger}
				context="{year}, com município do empregador identificado"
			/>
			<KpiCard
				label="Óbitos"
				value={brazil.allDeaths}
				format={formatInteger}
				context="{year}, registrados na CAT"
			/>
		</div>
	{/if}

	<div class="l-grid panels" {@attach reveal}>
		<Panel
			title={!peak
				? 'Taxa de acidentes por ano'
				: peak.tied.length
					? `Entre os anos consolidados, ${listNames([peak.row, ...peak.tied].map((row) => String(row.year)))} empatam com a maior taxa`
					: `Entre os anos consolidados, a maior taxa foi a de ${peak.row.year}`}
			subtitle="Acidentes com CAT por 100 mil vínculos formais, sem administração pública"
			status="consolidado"
			period="anos fechados"
			{source}
			columns={[
				{ key: 'year', label: 'Ano' },
				{
					key: 'accidentRate',
					label: 'Acidentes por 100 mil',
					numeric: true,
					format: (value) => formatDecimal(value as number | null)
				},
				{
					key: 'deathRate',
					label: 'Óbitos por 100 mil',
					numeric: true,
					format: (value) => formatDecimal(value as number | null, 2)
				},
				{
					key: 'status',
					label: 'Situação',
					format: (value) => yearStatusLabel[value as YearStatus]
				}
			]}
			rows={series}
			slug="taxa-acidentes-brasil"
		>
			{#snippet note()}
				<p>
					Barras claras com contorno tracejado são anos parciais ou provisórios: faltam arquivos
					mensais na fonte ou comunicações ainda estão chegando. Não compare esses anos com os
					consolidados.
				</p>
				<p>Denominador: estoque de vínculos formais da RAIS em 31/12, sem a divisão 84 da CNAE.</p>
			{/snippet}
			{#snippet chart()}
				<Chart
					label="Taxa de acidentes por 100 mil vínculos, por ano; anos consolidados em barras escuras."
					height="18rem"
					option={(tokens) =>
						yearBars(
							tokens,
							series.map((row) => ({
								year: row.year,
								status: row.status,
								value: row.accidentRate
							})),
							(value) => formatDecimal(value, 0)
						)}
				/>
			{/snippet}
		</Panel>

		<Panel
			title={lethalityTitle ?? 'Letalidade por tipo de acidente'}
			subtitle="Óbitos por 100 mil acidentes, somando os anos consolidados"
			{source}
			columns={[
				{ key: 'type', label: 'Tipo' },
				{
					key: 'deathsPer100kAccidents',
					label: 'Óbitos por 100 mil acidentes',
					numeric: true,
					format: (value) => formatInteger(value as number)
				},
				{
					key: 'accidents',
					label: 'Acidentes',
					numeric: true,
					format: (value) => formatInteger(value as number)
				},
				{
					key: 'deaths',
					label: 'Óbitos',
					numeric: true,
					format: (value) => formatInteger(value as number)
				}
			]}
			rows={lethality}
			slug="letalidade-por-tipo"
		>
			{#snippet note()}
				<p>Anos incluídos: {lethality[0]?.years.replaceAll(',', ', ')}.</p>
				<p>
					O acidente de trajeto ocorre no deslocamento entre a casa e o trabalho; muitos são
					acidentes de trânsito.
				</p>
			{/snippet}
			{#snippet chart()}
				<Chart
					label="Óbitos por 100 mil acidentes, por tipo: {lethality
						.map((row) => row.type.toLocaleLowerCase('pt-BR'))
						.join(', ')}."
					height="10rem"
					option={(tokens) =>
						rankingBars(
							tokens,
							lethality.map((row) => ({
								label: row.type,
								value: row.deathsPer100kAccidents,
								highlight: row.type === deadliest?.row.type
							})),
							(value) => formatInteger(value)
						)}
				/>
			{/snippet}
		</Panel>
	</div>
</section>

<style>
	.overview {
		--stack-gap: var(--space-7);
	}

	.intro {
		--stack-gap: var(--space-3);
	}

	.lede {
		font-size: var(--text-lg);
	}

	.kpis {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		grid-template-rows: repeat(3, auto);
		gap: var(--space-1) var(--space-5);
	}

	.panels {
		--grid-min: 30rem;
		--grid-gap: var(--space-7) var(--space-6);
	}
</style>
