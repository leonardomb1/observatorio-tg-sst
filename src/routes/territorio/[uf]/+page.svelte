<script lang="ts">
	import { resolve } from '$app/paths';
	import BrazilMap from '#lib/charts/BrazilMap.svelte';
	import Chart from '#lib/charts/Chart.svelte';
	import { compareLines } from '#lib/charts/options.ts';
	import KpiCard from '#lib/components/KpiCard.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import { formatDecimal, formatInteger } from '#lib/format.ts';
	import { leader, listNames } from '#lib/findings.ts';
	import { catSource } from '#lib/sources.ts';
	import { yearStatusLabel } from '#lib/status.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const solid = $derived(data.municipalities.filter((row) => row.enoughJobs));
	const municipalLead = $derived(
		leader(
			solid,
			(row) => row.accidentRate,
			(rate) => formatDecimal(rate)
		)
	);
	const minimumJobs = $derived(data.municipalities[0]?.minimumJobs ?? null);

	const source = $derived(catSource(data.calendar.publishedUntil));
	const year = $derived(data.calendar.lastConsolidated);
	const current = $derived(data.rows.find((row) => row.year === year));
	const national = $derived(data.brazil.find((row) => row.year === year));
	const years = $derived(data.rows.map((row) => row.year));
	const byYear = (rows: typeof data.brazil, pick: (row: (typeof rows)[number]) => number | null) =>
		years.map((each) => {
			const row = rows.find((candidate) => candidate.year === each);
			return row?.status === 'consolidado' ? pick(row) : null;
		});
	const multiple = $derived(
		current?.accidentRate && national?.accidentRate
			? current.accidentRate / national.accidentRate
			: null
	);
	const merged = $derived(
		data.rows.map((row) => ({
			...row,
			brazilAccidentRate: data.brazil.find((each) => each.year === row.year)?.accidentRate ?? null
		}))
	);
</script>

<svelte:head>
	<title>{data.uf}: acidentes de trabalho — Observatório SST</title>
	<meta
		name="description"
		content="Taxa de acidentes e de óbitos de trabalho por 100 mil vínculos formais em {data.uf}, comparada ao Brasil."
	/>
</svelte:head>

<div class="l-stack page">
	<header class="l-stack">
		<a href="{resolve('/(historia)')}#estados" class="back">← Estados</a>
		<h1>{data.uf}</h1>
		{#if multiple}
			<p>
				Em {year}, a taxa de acidentes de {data.uf} foi {formatDecimal(multiple, 2)} vez a do Brasil,
				a {formatInteger(data.position)}ª maior entre {formatInteger(data.total)} unidades federativas.
			</p>
		{/if}
	</header>

	{#if current && national}
		<section class="kpis" aria-label="Indicadores de {year}">
			<KpiCard
				label="Taxa de acidentes"
				icon="activity"
				value={current.accidentRate}
				format={(value) => formatDecimal(value)}
				unit="por 100 mil vínculos"
				context="Brasil: {formatDecimal(national.accidentRate)}"
			/>
			<KpiCard
				label="Taxa de óbitos"
				icon="heart-pulse"
				value={current.deathRate}
				format={(value) => formatDecimal(value, 2)}
				unit="por 100 mil vínculos"
				context="Brasil: {formatDecimal(national.deathRate, 2)}"
			/>
			<KpiCard
				label="Acidentes com CAT"
				icon="file"
				value={current.allAccidents}
				format={formatInteger}
				context={String(year)}
			/>
			<KpiCard
				label="Óbitos"
				icon="user"
				value={current.allDeaths}
				format={formatInteger}
				context={String(year)}
			/>
		</section>
	{/if}

	<Panel
		title="Taxa de acidentes de {data.uf} e do Brasil"
		subtitle="Acidentes com CAT por 100 mil vínculos formais, sem administração pública; só anos consolidados no gráfico"
		status="consolidado"
		period="anos fechados"
		{source}
		columns={[
			{ key: 'year', label: 'Ano' },
			{
				key: 'accidentRate',
				label: `${data.uf}: acidentes por 100 mil`,
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			},
			{
				key: 'brazilAccidentRate',
				label: 'Brasil: acidentes por 100 mil',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			},
			{
				key: 'deathRate',
				label: `${data.uf}: óbitos por 100 mil`,
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null, 2)
			},
			{ key: 'status', label: 'Situação', format: (cell) => yearStatusLabel[cell as 'consolidado'] }
		]}
		rows={merged}
		slug="taxa-acidentes-{data.uf}"
	>
		{#snippet note()}
			<p>
				Anos parciais ou provisórios ficam fora do gráfico porque faltam arquivos mensais na fonte;
				os valores estão na tabela, marcados.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Taxa de acidentes de {data.uf} comparada à do Brasil nos anos consolidados."
				height="18rem"
				option={(tokens) =>
					compareLines(
						tokens,
						years,
						{ label: data.uf, values: byYear(data.rows, (row) => row.accidentRate) },
						{ label: 'Brasil', values: byYear(data.brazil, (row) => row.accidentRate) },
						(value) => formatDecimal(value, 0)
					)}
			/>
		{/snippet}
	</Panel>

	{#if data.municipalities.length > 1}
		<Panel
			title={!municipalLead
				? `Taxa de acidentes nos municípios de ${data.uf}`
				: municipalLead.tied.length
					? `${listNames([municipalLead.row, ...municipalLead.tied].map((row) => row.name))} empatam na maior taxa de acidentes em ${year}`
					: `${municipalLead.row.name} tem a maior taxa de acidentes de ${data.uf} em ${year}`}
			subtitle="Acidentes com CAT por 100 mil vínculos formais, sem administração pública, por município do empregador, {year}"
			{source}
			columns={[
				{ key: 'name', label: 'Município' },
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
					key: 'accidents',
					label: 'Acidentes',
					numeric: true,
					format: (cell) => formatInteger(cell as number)
				},
				{
					key: 'jobs',
					label: 'Vínculos',
					numeric: true,
					format: (cell) => formatInteger(cell as number)
				}
			]}
			rows={data.municipalities.toSorted((a, b) => (b.accidentRate ?? 0) - (a.accidentRate ?? 0))}
			slug="taxa-acidentes-municipios-{data.sigla}-{year}"
		>
			{#snippet note()}
				{#if minimumJobs !== null}
					<p>
						Municípios com menos de {formatInteger(minimumJobs)} vínculos ficam em cinza no mapa: com
						base pequena, um único acidente muda muito a taxa. Eles continuam na tabela.
					</p>
				{/if}
				<p>Os acidentes são atribuídos ao município do empregador, como no anuário oficial.</p>
			{/snippet}
			{#snippet chart()}
				<BrazilMap
					scope={{ kind: 'municipalities', uf: data.sigla }}
					areas={data.municipalities.map((row) => ({
						key: row.code,
						label: row.name,
						value: row.enoughJobs ? row.accidentRate : null
					}))}
					format={(rate) => formatDecimal(rate)}
					label="Mapa da taxa de acidentes por município de {data.uf} em {year}."
					height="32rem"
					missing="Base insuficiente: menos de {formatInteger(minimumJobs)} vínculos"
				/>
			{/snippet}
		</Panel>
	{/if}
</div>

<style>
	.page {
		--stack-gap: var(--space-6);
	}

	.back {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.kpis {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		grid-template-rows: repeat(3, auto);
		gap: var(--space-1) var(--space-5);
	}
</style>
