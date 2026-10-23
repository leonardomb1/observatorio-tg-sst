<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import BrazilMap from '#lib/charts/BrazilMap.svelte';
	import Chart from '#lib/charts/Chart.svelte';
	import { rankingBars } from '#lib/charts/options.ts';
	import Icon from '#lib/components/Icon.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import StorySection from '#lib/components/StorySection.svelte';
	import { formatDecimal, formatInteger } from '#lib/format.ts';
	import { leader, listNames, timesAbove } from '#lib/findings.ts';
	import { catSource } from '#lib/sources.ts';
	import { inYear } from '#lib/status.ts';
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
	const lead = $derived(leader(sorted, value, format));
	const times = $derived(
		lead && !lead.tied.length && national ? timesAbove((value(lead.row) ?? 0) / national) : null
	);
	const TOP = 10;
	let all = $state(false);
</script>

<StorySection id="estados" icon="map" title="Onde o risco é maior">
	{#snippet lede()}
		<p>
			{#if lead && above !== null}
				{inYear(filters.year, filters.status)},
				{#if times}{lead.row.name} teve {times} a taxa de {measure} do Brasil, e{/if}
				{formatInteger(above)} de {formatInteger(sorted.length)} unidades federativas ficaram acima da
				média nacional.
			{/if}
		</p>
	{/snippet}

	<Filters section="estados" year={filters.year} metric={filters.metric} years={filters.years} />

	<Panel
		title={!lead
			? `Taxa de ${measure} por estado`
			: lead.tied.length
				? `${listNames([lead.row, ...lead.tied].map((row) => row.name))} empatam na maior taxa de ${measure} em ${filters.year}`
				: `${lead.row.name} tem a maior taxa de ${measure} em ${filters.year}`}
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
				O estado com mais acidentes não é necessariamente o de maior risco: a taxa divide os
				acidentes pelo emprego formal. Os acidentes são atribuídos ao município do empregador, como
				no anuário oficial.
			</p>
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
			<div class="split">
				<BrazilMap
					scope={{ kind: 'states' }}
					areas={ufs.map((row) => ({ key: row.uf, label: row.name, value: value(row) }))}
					{format}
					label="Mapa da taxa de {measure} por estado em {filters.year}; clique em um estado para ver a série dele."
					onselect={(uf) => {
						void goto(resolve('/territorio/[uf]', { uf: uf.toLowerCase() }));
					}}
				/>
				<div class="ranking">
					<Chart
						label="Taxa de {measure} por estado em {filters.year}, em ordem decrescente."
						height="{(all ? sorted.length : TOP) * 1.6 + 2}rem"
						option={(tokens) =>
							rankingBars(
								tokens,
								(all ? sorted : sorted.slice(0, TOP)).map((row) => ({
									label: row.name,
									value: value(row)
								})),
								format,
								national === null ? undefined : { value: national, label: 'Brasil' }
							)}
					/>
					<button type="button" class="more" aria-expanded={all} onclick={() => (all = !all)}>
						<Icon name="chevron-down" />{all
							? 'Mostrar só os 10 maiores'
							: `Ver os ${formatInteger(sorted.length)} estados`}
					</button>
				</div>
			</div>
		{/snippet}
	</Panel>
</StorySection>

<style>
	.split {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(24rem, 100%), 1fr));
		gap: var(--space-6);
		align-items: start;
	}

	.ranking {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.more {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
		align-self: flex-start;
		padding: var(--space-1) var(--space-2);
		border: 0;
		background: none;
		color: var(--ink-2);
		font: inherit;
		font-size: var(--text-sm);
	}

	.more:hover {
		color: var(--ink);
	}

	.more[aria-expanded='true'] :global(svg) {
		rotate: 180deg;
	}
</style>
