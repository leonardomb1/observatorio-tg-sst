<script lang="ts">
	import { resolve } from '$app/paths';
	import Chart from '#lib/charts/Chart.svelte';
	import { rankingBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import StorySection from '#lib/components/StorySection.svelte';
	import { formatDecimal, formatInteger } from '#lib/format.ts';
	import { catSource } from '#lib/sources.ts';
	import Filters from './Filters.svelte';
	import type { PageData } from './$types';

	interface Props {
		calendar: PageData['calendar'];
		filters: PageData['filters'];
		ufs: PageData['ufs'];
	}

	let { calendar, filters, ufs }: Props = $props();

	const source = $derived(catSource(calendar.publishedUntil));
	const deaths = $derived(filters.metric === 'obitos');
	const measure = $derived(deaths ? 'óbitos' : 'acidentes');
	const value = (row: (typeof ufs)[number]) => (deaths ? row.deathRate : row.accidentRate);
	const format = (number: number) => formatDecimal(number, deaths ? 2 : 1);
	const sorted = $derived(
		ufs.filter((row) => value(row) !== null).toSorted((a, b) => (value(b) ?? 0) - (value(a) ?? 0))
	);
	const national = $derived(deaths ? filters.brazil.deathRate : filters.brazil.accidentRate);
	const above = $derived(
		national === null ? null : sorted.filter((row) => (value(row) ?? 0) > national).length
	);
	const top = $derived(sorted[0]);
	const multiple = $derived(top && national ? (value(top) ?? 0) / national : null);
	const byName = $derived(ufs.toSorted((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
</script>

<StorySection id="estados" kicker="Estados" title="Onde o risco é maior">
	{#snippet lede()}
		<p>
			O estado com mais acidentes não é necessariamente o de maior risco: a taxa divide os acidentes
			pelo emprego formal. Os acidentes são atribuídos ao município do empregador, como no anuário
			oficial.
			{#if top && multiple && above !== null}
				Em {filters.year}, {top.name} teve {formatDecimal(multiple)} vezes a taxa de {measure} do Brasil,
				e {formatInteger(above)} de {formatInteger(sorted.length)} unidades federativas ficaram acima
				da média nacional.
			{/if}
		</p>
	{/snippet}

	<Filters section="estados" year={filters.year} metric={filters.metric} years={filters.years} />

	<Panel
		title={top
			? `${top.name} tem a maior taxa de ${measure} em ${filters.year}`
			: `Taxa de ${measure} por estado`}
		subtitle="{deaths
			? 'Óbitos'
			: 'Acidentes com CAT'} por 100 mil vínculos formais, sem administração pública, {filters.year}"
		status={filters.status}
		period={String(filters.year)}
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
		slug="taxa-{filters.metric}-uf-{filters.year}"
	>
		{#snippet note()}
			<p>
				Denominador: vínculos formais da RAIS em 31/12, sem a divisão 84 da CNAE (administração
				pública). Acidentes de empregadores dessa divisão também ficam fora do numerador.
			</p>
			{#if filters.status !== 'consolidado'}
				<p>
					{filters.year} não é um ano consolidado: faltam arquivos mensais na fonte ou comunicações ainda
					estão chegando. As taxas tendem a subir.
				</p>
			{/if}
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Taxa de {measure} por estado em {filters.year}, em ordem decrescente."
				height="40rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						sorted.map((row) => ({ label: row.name, value: value(row) })),
						format,
						national === null ? undefined : { value: national, label: 'Brasil' }
					)}
			/>
		{/snippet}
	</Panel>

	<nav aria-labelledby="estados-lista" class="l-stack uf-nav">
		<h3 id="estados-lista">A série de cada estado</h3>
		<ul class="ufs">
			{#each byName as uf (uf.uf)}
				<li><a href={resolve('/territorio/[uf]', { uf: uf.uf.toLowerCase() })}>{uf.name}</a></li>
			{/each}
		</ul>
	</nav>
</StorySection>

<style>
	.uf-nav {
		--stack-gap: var(--space-3);
	}

	h3 {
		font-size: var(--text-lg);
	}

	.ufs {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
		gap: var(--space-2) var(--space-4);
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}
</style>
