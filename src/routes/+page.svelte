<script lang="ts">
	import { resolve } from '$app/paths';
	import Chart from '#lib/charts/Chart.svelte';
	import { rankingBars, yearBars } from '#lib/charts/options.ts';
	import KpiCard from '#lib/components/KpiCard.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import { formatDecimal, formatInteger, formatMonthYear } from '#lib/format.ts';
	import { catSource } from '#lib/sources.ts';
	import { yearStatusLabel } from '#lib/status.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const source = $derived(catSource(data.calendar.publishedUntil));
	const topUfs = $derived(
		data.ufs.toSorted((a, b) => (b.accidentRate ?? 0) - (a.accidentRate ?? 0)).slice(0, 10)
	);
	const commute = $derived(data.lethality.find((row) => row.type === 'Trajeto'));
	const typical = $derived(data.lethality.find((row) => row.type === 'Típico'));
	const consolidated = $derived(data.series.filter((row) => row.status === 'consolidado'));
	const peak = $derived(
		consolidated.reduce<(typeof consolidated)[number] | null>(
			(best, row) => (best && (best.accidentRate ?? 0) >= (row.accidentRate ?? 0) ? best : row),
			null
		)
	);
	const ratio = $derived(
		commute && typical ? commute.deathsPer100kAccidents / typical.deathsPer100kAccidents : null
	);
</script>

<svelte:head>
	<title>Observatório SST — acidentes de trabalho no Brasil</title>
	<meta
		name="description"
		content="Taxas de acidentes e óbitos de trabalho por 100 mil vínculos formais, por estado e setor, calculadas a partir de microdados públicos da CAT e da RAIS."
	/>
</svelte:head>

<div class="l-stack page">
	<header class="l-stack intro">
		<h1>Acidentes de trabalho no Brasil</h1>
		<p>
			Acidentes comunicados ao INSS por meio da CAT, divididos pelo emprego formal da RAIS. As taxas
			excluem a administração pública, cujos servidores estatutários não emitem CAT. Dados
			publicados até {formatMonthYear(
				data.calendar.publishedUntil.year,
				data.calendar.publishedUntil.month
			)}; o último ano consolidado é {data.year}.
		</p>
	</header>

	{#if data.brazil}
		<section class="kpis" aria-label="Indicadores de {data.year}">
			<KpiCard
				label="Taxa de acidentes"
				value={formatDecimal(data.brazil.accidentRate)}
				unit="por 100 mil vínculos"
				context="{data.year}, Brasil"
			/>
			<KpiCard
				label="Taxa de óbitos"
				value={formatDecimal(data.brazil.deathRate, 2)}
				unit="por 100 mil vínculos"
				context="{data.year}, Brasil"
			/>
			<KpiCard
				label="Acidentes com CAT"
				value={formatInteger(data.brazil.allAccidents)}
				context="{data.year}, com município do empregador identificado"
			/>
			<KpiCard
				label="Óbitos"
				value={formatInteger(data.brazil.allDeaths)}
				context="{data.year}, registrados na CAT"
			/>
		</section>
	{/if}

	<div class="l-grid panels">
		<Panel
			title={peak
				? `Entre os anos consolidados, a maior taxa foi a de ${peak.year}`
				: 'Taxa de acidentes por ano'}
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
					format: (value) => yearStatusLabel[value as 'consolidado']
				}
			]}
			rows={data.series}
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
							data.series.map((row) => ({
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
			title={ratio
				? `No trajeto, cada acidente é ${formatDecimal(ratio)} vezes mais letal`
				: 'Letalidade por tipo de acidente'}
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
			rows={data.lethality}
			slug="letalidade-por-tipo"
		>
			{#snippet note()}
				<p>Anos incluídos: {data.lethality[0]?.years.replaceAll(',', ', ')}.</p>
				<p>
					O acidente de trajeto ocorre no deslocamento entre a casa e o trabalho; muitos são
					acidentes de trânsito.
				</p>
			{/snippet}
			{#snippet chart()}
				<Chart
					label="Óbitos por 100 mil acidentes: trajeto, doença e típico."
					height="10rem"
					option={(tokens) =>
						rankingBars(
							tokens,
							data.lethality.map((row) => ({
								label: row.type,
								value: row.deathsPer100kAccidents,
								highlight: row.type === 'Trajeto'
							})),
							(value) => formatInteger(value)
						)}
				/>
			{/snippet}
		</Panel>

		<Panel
			title={topUfs[0]
				? `${topUfs[0].name} tem a maior taxa de acidentes do país`
				: 'Taxa de acidentes por estado'}
			subtitle="Acidentes com CAT por 100 mil vínculos formais, {data.year}, 10 maiores taxas"
			status="consolidado"
			period={String(data.year)}
			{source}
			columns={[
				{ key: 'name', label: 'Unidade federativa' },
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
				}
			]}
			rows={topUfs}
			slug="taxa-acidentes-uf-{data.year}"
		>
			{#snippet chart()}
				<Chart
					label="Dez estados com maior taxa de acidentes em {data.year}."
					height="20rem"
					option={(tokens) =>
						rankingBars(
							tokens,
							topUfs.map((row) => ({ label: row.name, value: row.accidentRate })),
							(value) => formatDecimal(value),
							data.brazil?.accidentRate
								? { value: data.brazil.accidentRate, label: 'Brasil' }
								: undefined
						)}
				/>
			{/snippet}
		</Panel>

		<Panel
			title={data.sectors[0]
				? `${data.sectors[0].name}: a maior taxa de óbitos por trabalhador`
				: 'Atividades com maior taxa de óbitos'}
			subtitle="Óbitos por 100 mil vínculos, {data.year}, classes CNAE com ao menos 50 mil vínculos"
			status="consolidado"
			period={String(data.year)}
			{source}
			columns={[
				{ key: 'code', label: 'CNAE' },
				{ key: 'name', label: 'Atividade' },
				{
					key: 'deathRate',
					label: 'Óbitos por 100 mil',
					numeric: true,
					format: (value) => formatDecimal(value as number | null, 2)
				},
				{
					key: 'jobs',
					label: 'Vínculos',
					numeric: true,
					format: (value) => formatInteger(value as number)
				}
			]}
			rows={data.sectors}
			slug="setores-letalidade-{data.year}"
		>
			{#snippet chart()}
				<Chart
					label="Dez atividades econômicas com maior taxa de óbitos em {data.year}."
					height="20rem"
					option={(tokens) =>
						rankingBars(
							tokens,
							data.sectors.map((row) => ({ label: row.name, value: row.deathRate })),
							(value) => formatDecimal(value, 2),
							data.brazil?.deathRate ? { value: data.brazil.deathRate, label: 'Brasil' } : undefined
						)}
				/>
			{/snippet}
		</Panel>
	</div>

	<nav class="l-cluster more" aria-label="Explorar">
		<a href={resolve('/territorio')}>Todos os estados</a>
		<a href={resolve('/setores')}>Todas as atividades</a>
	</nav>
</div>

<style>
	.page {
		--stack-gap: var(--space-7);
	}

	.intro {
		--stack-gap: var(--space-3);
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

	.more {
		--cluster-gap: var(--space-5);
	}
</style>
