<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import { rankingBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import StorySection from '#lib/components/StorySection.svelte';
	import { formatCompact, formatDecimal, formatInteger } from '#lib/format.ts';
	import { leader, listNames, timesAbove } from '#lib/findings.ts';
	import { catSource } from '#lib/sources.ts';
	import { inYear } from '#lib/status.ts';
	import Filters from './Filters.svelte';
	import type { PageData } from './$types';

	interface Props {
		calendar: PageData['calendar'];
		filters: PageData['filters'];
		sectors: PageData['sectors'];
	}

	let { calendar, filters, sectors }: Props = $props();

	const TOP = 20;

	const source = $derived(catSource(calendar.publishedUntil));
	const deaths = $derived(filters.metric === 'obitos');
	const measure = $derived(deaths ? 'óbitos' : 'acidentes');
	const value = (row: (typeof sectors)[number]) => (deaths ? row.deathRate : row.accidentRate);
	const format = (number: number) => formatDecimal(number, deaths ? 2 : 1);
	const sorted = $derived(
		sectors
			.filter((row) => value(row) !== null)
			.toSorted((a, b) => (value(b) ?? 0) - (value(a) ?? 0))
	);
	const top = $derived(sorted.slice(0, TOP));
	const national = $derived(deaths ? filters.brazil.deathRate : filters.brazil.accidentRate);
	const lead = $derived(leader(sorted, value, format));
	const times = $derived(
		lead && !lead.tied.length && national ? timesAbove((value(lead.row) ?? 0) / national) : null
	);
	const minimumJobs = $derived(sectors[0]?.minimumJobs ?? null);
</script>

<StorySection id="atividades" kicker="Atividades" title="Em que trabalho o risco se concentra">
	{#snippet lede()}
		<p>
			Taxas por classe CNAE de quatro dígitos.
			{#if minimumJobs !== null}
				Só entram classes com pelo menos {formatCompact(minimumJobs)} vínculos, para que um único óbito
				não desloque a taxa.
			{/if}
			{#if lead && times}
				{inYear(filters.year, filters.status)}, a taxa de {measure} de {lead.row.name.toLocaleLowerCase(
					'pt-BR'
				)} foi {times} a do Brasil.
			{/if}
		</p>
	{/snippet}

	<Filters section="atividades" year={filters.year} metric={filters.metric} years={filters.years} />

	<Panel
		title={!lead
			? `Taxa de ${measure} por atividade`
			: lead.tied.length
				? `${listNames([lead.row, ...lead.tied].map((row) => row.name))} empatam na maior taxa de ${measure} em ${filters.year}`
				: `${lead.row.name}: a maior taxa de ${measure} em ${filters.year}`}
		subtitle="{deaths
			? 'Óbitos'
			: 'Acidentes com CAT'} por 100 mil vínculos formais, {filters.year}, {top.length} maiores taxas"
		status={filters.status}
		period={String(filters.year)}
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
		slug="taxa-{filters.metric}-cnae-{filters.year}"
	>
		{#snippet note()}
			<p>
				A tabela traz todas as {formatInteger(sectors.length)} classes acima da base mínima; o gráfico
				mostra as {top.length} maiores.
			</p>
			<p>
				A comparação com o Brasil usa a taxa nacional sem administração pública; aqui as classes
				usam todos os vínculos da própria classe.
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
				label="As {top.length} atividades com maior taxa de {measure} em {filters.year}."
				height="44rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						top.map((row) => ({ label: row.name, value: value(row) })),
						format,
						national === null ? undefined : { value: national, label: 'Brasil' }
					)}
			/>
		{/snippet}
	</Panel>
</StorySection>
