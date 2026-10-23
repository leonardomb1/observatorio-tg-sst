<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import Chart from '#lib/charts/Chart.svelte';
	import { rankingBars } from '#lib/charts/options.ts';
	import Choices from '#lib/components/Choices.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import { formatDecimal, formatInteger } from '#lib/format.ts';
	import { catSource } from '#lib/sources.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const source = $derived(catSource(data.calendar.publishedUntil));
	const deaths = $derived(data.metric === 'obitos');
	const value = (row: (typeof data.ufs)[number]) => (deaths ? row.deathRate : row.accidentRate);
	const format = (number: number) => formatDecimal(number, deaths ? 2 : 1);
	const sorted = $derived(data.ufs.toSorted((a, b) => (value(b) ?? 0) - (value(a) ?? 0)));
	const status = $derived(data.years.find((row) => row.year === data.year)?.status ?? 'parcial');

	function href(changes: Record<string, string>) {
		const params = new SvelteURLSearchParams(page.url.search);
		for (const [key, next] of Object.entries(changes)) params.set(key, next);
		return `${resolve('/territorio')}?${params.toString()}`;
	}
</script>

<svelte:head>
	<title>Acidentes de trabalho por estado — Observatório SST</title>
	<meta
		name="description"
		content="Taxa de acidentes e de óbitos de trabalho por 100 mil vínculos formais em cada unidade federativa."
	/>
</svelte:head>

<div class="l-stack page">
	<header class="l-stack">
		<h1>Estados</h1>
		<p>
			O estado com mais acidentes não é necessariamente o de maior risco: a taxa divide os acidentes
			pelo emprego formal. Os acidentes são atribuídos ao município do empregador, como no anuário
			oficial.
		</p>
	</header>

	<div class="l-stack filters">
		<Choices
			label="Ano"
			current={String(data.year)}
			choices={data.years.map((row) => ({
				value: String(row.year),
				label: String(row.year),
				status: row.status,
				href: href({ ano: String(row.year) })
			}))}
		/>
		<Choices
			label="Medida"
			current={data.metric}
			choices={[
				{ value: 'acidentes', label: 'Acidentes', href: href({ medida: 'acidentes' }) },
				{ value: 'obitos', label: 'Óbitos', href: href({ medida: 'obitos' }) }
			]}
		/>
	</div>

	<Panel
		title={sorted[0]
			? `${sorted[0].name} tem a maior taxa de ${deaths ? 'óbitos' : 'acidentes'} em ${data.year}`
			: 'Taxa por estado'}
		subtitle="{deaths
			? 'Óbitos'
			: 'Acidentes com CAT'} por 100 mil vínculos formais, sem administração pública, {data.year}"
		{status}
		period={String(data.year)}
		{source}
		columns={[
			{ key: 'name', label: 'Unidade federativa' },
			{ key: 'region', label: 'Região' },
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
				key: 'deaths',
				label: 'Óbitos',
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
		rows={sorted}
		slug="taxa-{data.metric}-uf-{data.year}"
	>
		{#snippet note()}
			<p>
				Denominador: vínculos formais da RAIS em 31/12, sem a divisão 84 da CNAE (administração
				pública). Acidentes de empregadores dessa divisão também ficam fora do numerador.
			</p>
			{#if status !== 'consolidado'}
				<p>
					{data.year} não é um ano consolidado: faltam arquivos mensais na fonte ou comunicações ainda
					estão chegando. As taxas tendem a subir.
				</p>
			{/if}
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Taxa de {deaths
					? 'óbitos'
					: 'acidentes'} por estado em {data.year}, em ordem decrescente."
				height="40rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						sorted.map((row) => ({ label: row.name, value: value(row) })),
						format,
						data.brazil
							? {
									value: (deaths ? data.brazil.deathRate : data.brazil.accidentRate) ?? 0,
									label: 'Brasil'
								}
							: undefined
					)}
			/>
		{/snippet}
	</Panel>

	<nav aria-label="Estados">
		<h2>Ver um estado</h2>
		<ul class="ufs">
			{#each data.ufs as uf (uf.uf)}
				<li><a href={resolve('/territorio/[uf]', { uf: uf.uf.toLowerCase() })}>{uf.name}</a></li>
			{/each}
		</ul>
	</nav>
</div>

<style>
	.page {
		--stack-gap: var(--space-6);
	}

	.filters {
		--stack-gap: var(--space-3);
	}

	h2 {
		font-size: var(--text-lg);
	}

	.ufs {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
		gap: var(--space-2) var(--space-4);
		margin-block-start: var(--space-3);
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}
</style>
