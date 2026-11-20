<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import { rankingBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import type { Column } from '#lib/csv.ts';
	import { formatInteger, formatPercent } from '#lib/format.ts';
	import { leader, listNames, type Leader } from '#lib/findings.ts';
	import { catSource } from '#lib/sources.ts';
	import type { PageData } from './$types';

	interface Props {
		calendar: PageData['calendar'];
		causes: Awaited<PageData['causes']>;
	}

	let { calendar, causes }: Props = $props();

	type Family = (typeof causes.agents)[number];
	type FamilyRow = Family & { lethality: number | null };

	const TOP = 10;

	const source = $derived(catSource(calendar.publishedUntil));
	const year = $derived(causes.year);
	const period = $derived(String(causes.year));
	const cats = $derived(calendar.years.find((row) => row.year === causes.year)?.cats ?? null);

	const lethality = (row: Family) =>
		row.accidents > 0 ? (row.deaths / row.accidents) * 100_000 : null;
	const withLethality = (rows: readonly Family[]): FamilyRow[] =>
		rows.map((row) => ({ ...row, lethality: lethality(row) }));
	const topByDeaths = (rows: readonly Family[]) =>
		withLethality(rows.filter((row) => row.deaths > 0).slice(0, TOP));
	const coverageOf = (rows: readonly Family[]) =>
		cats ? rows.reduce((sum, row) => sum + row.accidents, 0) / cats : null;

	const agents = $derived(topByDeaths(causes.agents));
	const bodyParts = $derived(topByDeaths(causes.bodyParts));
	const injuries = $derived(topByDeaths(causes.injuries));
	const smallestBase = $derived(
		agents.length > 0 ? Math.min(...agents.map((row) => row.accidents)) : null
	);
	const mostInjured = $derived(
		causes.bodyParts.reduce<Family | null>(
			(best, row) => (best && best.accidents >= row.accidents ? best : row),
			null
		)
	);
	const byDeaths = (rows: readonly FamilyRow[]) =>
		leader(
			rows,
			(row) => row.deaths,
			(value) => formatInteger(value)
		);
	const agentLead = $derived(byDeaths(agents));
	const bodyLead = $derived(byDeaths(bodyParts));
	const injuryLead = $derived(byDeaths(injuries));
	const lethalLead = $derived(
		leader(
			agents,
			(row) => row.lethality,
			(value) => formatInteger(value)
		)
	);
	const deadliest = $derived(lethalLead && !lethalLead.tied.length ? lethalLead.row : null);

	/** Names the leader, or every family that shows the same count. */
	function familyTitle(
		lead: Leader<FamilyRow> | null,
		single: string,
		tied: string,
		empty: string
	) {
		if (!lead) return empty;
		if (lead.tied.length === 0) return `${lead.row.family}${single}`;
		return `${listNames([lead.row, ...lead.tied].map((row) => row.family))}${tied}`;
	}
	const agentDeaths = $derived(causes.agents.reduce((sum, row) => sum + row.deaths, 0));
	const topShare = $derived(
		agentDeaths > 0 ? agents.reduce((sum, row) => sum + row.deaths, 0) / agentDeaths : null
	);

	const familyColumns = (label: string): Column<FamilyRow>[] => [
		{ key: 'family', label },
		{
			key: 'deaths',
			label: 'Óbitos',
			numeric: true,
			format: (cell) => formatInteger(cell as number)
		},
		{
			key: 'accidents',
			label: 'Acidentes',
			numeric: true,
			format: (cell) => formatInteger(cell as number)
		},
		{
			key: 'lethality',
			label: 'Óbitos por 100 mil acidentes',
			numeric: true,
			format: (cell) => formatInteger(cell as number | null)
		}
	];
</script>

<div class="l-grid panels">
	<Panel
		title={familyTitle(
			agentLead,
			` é o agente com mais óbitos em ${year}`,
			` empatam como agentes com mais óbitos em ${year}`,
			`Óbitos por agente causador, ${year}`
		)}
		subtitle="Óbitos registrados na CAT por família de agente causador, {year}, {TOP} famílias com mais óbitos"
		status="consolidado"
		{period}
		{source}
		columns={familyColumns('Agente causador')}
		rows={withLethality(causes.agents)}
		slug="obitos-por-agente-{year}"
	>
		{#snippet note()}
			{#if topShare !== null}
				<p>
					As {TOP} famílias do gráfico somam {formatPercent(topShare)} dos óbitos com agente informado.
				</p>
			{/if}
			{@render coverageNote(coverageOf(causes.agents), 'agente causador')}
			<p>“Nic” é a abreviação da fonte para “não incluído em outra classificação”.</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="As {TOP} famílias de agente causador com mais óbitos em {year}."
				height="24rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						agents.map((row) => ({ label: row.family, value: row.deaths })),
						(value) => formatInteger(value)
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title={deadliest?.lethality
			? `${deadliest.family}: ${formatInteger(deadliest.lethality)} óbitos a cada 100 mil acidentes`
			: `Letalidade por agente causador, ${year}`}
		subtitle="Óbitos por 100 mil acidentes, {year}, entre as {TOP} famílias de agente com mais óbitos"
		status="consolidado"
		{period}
		{source}
		columns={familyColumns('Agente causador')}
		rows={agents}
		slug="letalidade-por-agente-{year}"
	>
		{#snippet note()}
			<p>
				A letalidade só é calculada para as {TOP} famílias com mais óbitos; a menor delas teve {formatInteger(
					smallestBase
				)} acidentes no ano. Em famílias pequenas, poucos casos produziriam taxas extremas.
			</p>
			<p>São os mesmos agentes do gráfico de óbitos; o mais letal está destacado.</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Óbitos por 100 mil acidentes nas {TOP} famílias de agente com mais óbitos em {year}."
				height="24rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						agents.map((row) => ({
							label: row.family,
							value: row.lethality,
							highlight: row.family === deadliest?.family
						})),
						(value) => formatInteger(value)
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title={familyTitle(
			bodyLead,
			': a parte do corpo mais presente nos óbitos',
			' empatam entre as partes do corpo mais presentes nos óbitos',
			`Óbitos por parte do corpo atingida, ${year}`
		)}
		subtitle="Óbitos registrados na CAT por parte do corpo atingida, {year}, {TOP} com mais óbitos"
		status="consolidado"
		{period}
		{source}
		columns={familyColumns('Parte do corpo')}
		rows={withLethality(causes.bodyParts)}
		slug="obitos-por-parte-do-corpo-{year}"
	>
		{#snippet note()}
			{#if mostInjured && mostInjured.family !== bodyLead?.row.family}
				<p>
					Contando todos os acidentes, a parte mais atingida é outra: {mostInjured.family}, com {formatInteger(
						mostInjured.accidents
					)} acidentes e {formatInteger(mostInjured.deaths)} óbitos.
				</p>
			{/if}
			<p>A tabela traz acidentes e óbitos de todas as partes.</p>
			{@render coverageNote(coverageOf(causes.bodyParts), 'parte do corpo')}
		{/snippet}
		{#snippet chart()}
			<Chart
				label="As {TOP} partes do corpo com mais óbitos em {year}."
				height="24rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						bodyParts.map((row) => ({ label: row.family, value: row.deaths })),
						(value) => formatInteger(value)
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title={familyTitle(
			injuryLead,
			': a lesão mais presente nos óbitos',
			' empatam entre as lesões mais presentes nos óbitos',
			`Óbitos por natureza da lesão, ${year}`
		)}
		subtitle="Óbitos registrados na CAT por natureza da lesão, {year}, {TOP} com mais óbitos"
		status="consolidado"
		{period}
		{source}
		columns={familyColumns('Natureza da lesão')}
		rows={withLethality(causes.injuries)}
		slug="obitos-por-natureza-da-lesao-{year}"
	>
		{#snippet note()}
			{@render coverageNote(coverageOf(causes.injuries), 'natureza da lesão')}
		{/snippet}
		{#snippet chart()}
			<Chart
				label="As {TOP} naturezas de lesão com mais óbitos em {year}."
				height="24rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						injuries.map((row) => ({ label: row.family, value: row.deaths })),
						(value) => formatInteger(value)
					)}
			/>
		{/snippet}
	</Panel>
</div>

{#snippet coverageNote(share: number | null, field: string)}
	{#if share !== null && share < 0.9995}
		<p>
			Esta classificação cobre {formatPercent(share)} das {formatInteger(cats)} CATs de {year}; as
			demais não têm {field} preenchido.
		</p>
	{/if}
	<p>Os nomes das categorias vêm da tabela da CAT, abreviados e sem acentos na origem.</p>
{/snippet}

<style>
	.panels {
		--grid-min: 30rem;
		--grid-gap: var(--space-7) var(--space-6);
	}
</style>
