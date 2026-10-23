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
	const value = (row: (typeof data.sectors)[number]) => (deaths ? row.deathRate : row.accidentRate);
	const format = (number: number) => formatDecimal(number, deaths ? 2 : 1);
	const sorted = $derived(data.sectors.toSorted((a, b) => (value(b) ?? 0) - (value(a) ?? 0)));
	const top = $derived(sorted.slice(0, 20));
	const status = $derived(data.years.find((row) => row.year === data.year)?.status ?? 'parcial');

	function href(changes: Record<string, string>) {
		const params = new SvelteURLSearchParams(page.url.search);
		for (const [key, next] of Object.entries(changes)) params.set(key, next);
		return `${resolve('/setores')}?${params.toString()}`;
	}
</script>

<svelte:head>
	<title>Acidentes de trabalho por atividade econômica — Observatório SST</title>
	<meta
		name="description"
		content="Atividades econômicas (classes CNAE) com maior taxa de acidentes e de óbitos de trabalho por 100 mil vínculos formais."
	/>
</svelte:head>

<div class="l-stack page">
	<header class="l-stack">
		<h1>Atividades econômicas</h1>
		<p>
			Taxas por classe CNAE de quatro dígitos. Só entram classes com pelo menos 50 mil vínculos,
			para que um único óbito não desloque a taxa.
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
				{ value: 'obitos', label: 'Óbitos', href: href({ medida: 'obitos' }) },
				{ value: 'acidentes', label: 'Acidentes', href: href({ medida: 'acidentes' }) }
			]}
		/>
	</div>

	<Panel
		title={top[0]
			? `${top[0].name}: a maior taxa de ${deaths ? 'óbitos' : 'acidentes'} em ${data.year}`
			: 'Taxa por atividade'}
		subtitle="{deaths
			? 'Óbitos'
			: 'Acidentes com CAT'} por 100 mil vínculos formais, {data.year}, 20 maiores taxas"
		{status}
		period={String(data.year)}
		{source}
		columns={[
			{ key: 'code', label: 'CNAE' },
			{ key: 'name', label: 'Atividade' },
			{
				key: 'deathRate',
				label: 'Óbitos por 100 mil',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null, 2)
			},
			{
				key: 'accidentRate',
				label: 'Acidentes por 100 mil',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
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
		slug="taxa-{data.metric}-cnae-{data.year}"
	>
		{#snippet note()}
			<p>
				A tabela traz todas as {formatInteger(data.sectors.length)} classes acima da base mínima; o gráfico
				mostra as 20 maiores.
			</p>
			<p>
				A comparação com o Brasil usa a taxa nacional sem administração pública; aqui as classes
				usam todos os vínculos da própria classe.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Vinte atividades com maior taxa de {deaths ? 'óbitos' : 'acidentes'} em {data.year}."
				height="44rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						top.map((row) => ({ label: row.name, value: value(row) })),
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
</div>

<style>
	.page {
		--stack-gap: var(--space-6);
	}

	.filters {
		--stack-gap: var(--space-3);
	}
</style>
