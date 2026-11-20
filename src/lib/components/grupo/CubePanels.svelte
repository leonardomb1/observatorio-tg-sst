<script lang="ts" module>
	import type { Dimension } from '#lib/filters.ts';
	import type { Metric } from '#lib/metrics.ts';

	export type Part =
		| { kind: 'serie'; metric?: Metric }
		| { kind: 'mapa'; metric?: Metric }
		| { kind: 'dim'; dim: Dimension; metric?: Metric }
		| {
				kind: 'extra';
				key: string;
				/** Name of the breakdown, as in "por {title}". */
				title: string;
				/** Ordinal categories in display order; otherwise ranked by value. */
				order?: readonly string[];
				metric?: Metric;
		  };
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BrazilMap from '#lib/charts/BrazilMap.svelte';
	import Chart from '#lib/charts/Chart.svelte';
	import { columnBars, rankingBars, yearBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import type { Column } from '#lib/csv.ts';
	import { AGE_BANDS, DIMENSIONS, readFilters, withParams } from '#lib/filters.ts';
	import { changeSince, leader, listNames } from '#lib/findings.ts';
	import { formatPercent } from '#lib/format.ts';
	import type { CubeView, Slice } from '#lib/server/catalog/cubos.ts';
	import { yearStatusLabel } from '#lib/status.ts';
	import ScopeNote from './ScopeNote.svelte';

	interface Props {
		view: CubeView;
		metric: Metric;
		parts: readonly Part[];
		source: { name: string; href: string; updatedAt: string };
		/** Prefix of the CSV file names. */
		slug: string;
	}

	let { view, metric, parts, source, slug }: Props = $props();

	const selection = $derived(readFilters(page.url.searchParams).selection);
	const UNKNOWN = 'Não informado';

	const labelOf = (dim: Dimension, key: string | null) =>
		key === null
			? UNKNOWN
			: (DIMENSIONS[dim].options.find((option) => option.value === key)?.label ?? key);

	interface Row {
		key: string | null;
		label: string;
		value: number | null;
		share: number | null;
		highlight: boolean;
	}

	function toRows(
		slices: readonly Slice[],
		measure: Metric,
		label: (key: string | null) => string,
		selected: string | null
	): Row[] {
		const values = slices.map((slice) => measure.value(slice));
		const total = measure.additive
			? values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
			: null;
		return slices.map((slice, index) => {
			const value = values[index] ?? null;
			return {
				key: slice.key,
				label: label(slice.key),
				value,
				share: total && value !== null ? value / total : null,
				highlight: selected !== null && slice.key === selected
			};
		});
	}

	function ranked(rows: readonly Row[]) {
		return rows
			.filter((row) => row.key !== null && row.value !== null)
			.toSorted((a, b) => (b.value ?? 0) - (a.value ?? 0));
	}

	function ordered(rows: readonly Row[], order: readonly string[]) {
		return order
			.map((key) => rows.find((row) => row.key === key))
			.filter((row): row is Row => row !== undefined);
	}

	/** "Parda: 45,2% dos óbitos", or the highest value when shares do not apply. */
	function finding(rows: readonly Row[], measure: Metric, fallback: string) {
		const lead = leader(
			rows.filter((row) => row.key !== null),
			(row) => row.value,
			measure.format
		);
		if (lead?.row.value == null) return fallback;
		const names = listNames([lead.row, ...lead.tied].map((row) => row.label));
		if (measure.additive && lead.row.share !== null && !lead.tied.length) {
			return `${names}: ${formatPercent(lead.row.share)} dos ${measure.noun}`;
		}
		const label = measure.label.toLocaleLowerCase('pt-BR');
		return lead.tied.length
			? `${names} empatam no valor mais alto de ${label}: ${measure.format(lead.row.value)}`
			: `${names} tem o valor mais alto de ${label}: ${measure.format(lead.row.value)}`;
	}

	const sliceColumns = (first: string, measure: Metric): Column<Row>[] => [
		{ key: 'label', label: first },
		{
			key: 'value',
			label: measure.label,
			numeric: true,
			format: (cell: unknown) => (cell === null ? '—' : measure.format(cell as number))
		},
		...(measure.additive
			? [
					{
						key: 'share' as const,
						label: 'Participação',
						numeric: true,
						format: (cell: unknown) => formatPercent(cell as number | null)
					}
				]
			: [])
	];

	const period = $derived(String(view.year));

	function seriesTitle(measure: Metric) {
		const points = view.years.map((row) => ({ ...row, value: measure.value(row) }));
		const current = points.find((row) => row.year === view.year);
		if (current?.value == null) return `${measure.label} por ano`;
		const previous = points.find((row) => row.year === view.year - 1);
		const change =
			previous?.value && previous.status === 'consolidado' && current.status === 'consolidado'
				? `, ${changeSince(current.value / previous.value - 1, previous.year)}`
				: '';
		return `${measure.label}: ${measure.format(current.value)} em ${view.year}${change}`;
	}

	function selectUf(uf: string) {
		const option = DIMENSIONS.uf.options.find((each) => each.value === uf);
		if (!option) return;
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- same page, only the search changes
		void goto(withParams(page.url, { uf: option.slug }), { replace: true, reset: false });
	}

	const TOP = 10;
</script>

<ScopeNote ignored={view.ignored} requestedYear={view.requestedYear} shownYear={view.year} />

<div class="l-grid panels">
	{#each parts as part, index (index)}
		{@const measure = part.metric ?? metric}
		{#if part.kind === 'serie'}
			{@const points = view.years.map((row) => ({
				year: row.year,
				status: row.status,
				statusLabel: yearStatusLabel[row.status],
				value: measure.value(row)
			}))}
			<Panel
				title={seriesTitle(measure)}
				subtitle="{measure.unit}, por ano"
				{source}
				columns={[
					{ key: 'year', label: 'Ano' },
					{ key: 'statusLabel', label: 'Situação do ano' },
					{
						key: 'value',
						label: measure.label,
						numeric: true,
						format: (cell) => (cell === null ? '—' : measure.format(cell as number))
					}
				]}
				rows={points}
				slug="{slug}-por-ano"
			>
				{#snippet note()}
					<p>
						Barras claras com contorno tracejado são anos parciais ou provisórios: ainda recebem
						registros e não se comparam aos anos fechados.
					</p>
				{/snippet}
				{#snippet chart()}
					<Chart
						label="{measure.label} por ano; anos fechados em barras escuras."
						height="18rem"
						option={(tokens) => yearBars(tokens, points, measure.format)}
					/>
				{/snippet}
			</Panel>
		{:else if part.kind === 'mapa'}
			{@const rows = toRows(
				view.slices.uf ?? [],
				measure,
				(key) => labelOf('uf', key),
				selection.uf?.value ?? null
			)}
			{@const sorted = ranked(rows)}
			{@const top = sorted.filter((row, position) => position < TOP || row.highlight)}
			<div class="wide">
				<Panel
					title={finding(rows, measure, `${measure.label} por estado`)}
					subtitle="{measure.unit}, por UF, {view.year}"
					status={view.status}
					{period}
					{source}
					columns={sliceColumns('Unidade federativa', measure)}
					rows={sorted}
					slug="{slug}-uf-{view.year}"
				>
					{#snippet note()}
						<p>Clique em um estado para filtrar a página inteira por ele.</p>
					{/snippet}
					{#snippet chart()}
						<div class="split">
							<BrazilMap
								scope={{ kind: 'states' }}
								areas={rows
									.filter((row) => row.key !== null)
									.map((row) => ({ key: row.key ?? '', label: row.label, value: row.value }))}
								format={measure.format}
								label="Mapa de {measure.label.toLocaleLowerCase(
									'pt-BR'
								)} por estado em {view.year}; clique em um estado para filtrar a página."
								onselect={selectUf}
							/>
							<Chart
								label="{measure.label} nos estados de maior valor em {view.year}."
								height="{top.length * 1.6 + 1}rem"
								option={(tokens) =>
									rankingBars(
										tokens,
										top.map((row) => ({
											label: row.label,
											value: row.value,
											highlight: row.highlight
										})),
										measure.format
									)}
							/>
						</div>
					{/snippet}
				</Panel>
			</div>
		{:else}
			{@const dim = part.kind === 'dim' ? part.dim : null}
			{@const slices = dim
				? (view.slices[dim] ?? [])
				: (view.extras[part.kind === 'extra' ? part.key : ''] ?? [])}
			{@const title = dim ? DIMENSIONS[dim].label : part.kind === 'extra' ? part.title : ''}
			{@const rows = toRows(
				slices,
				measure,
				(key) => (dim ? labelOf(dim, key) : (key ?? UNKNOWN)),
				dim ? (selection[dim]?.value ?? null) : null
			)}
			{@const order = dim === 'idade' ? AGE_BANDS : part.kind === 'extra' ? part.order : undefined}
			{@const shown = order ? ordered(rows, order) : ranked(rows)}
			<Panel
				title={finding(rows, measure, `${measure.label} por ${title.toLocaleLowerCase('pt-BR')}`)}
				subtitle="{measure.unit}, por {title.toLocaleLowerCase('pt-BR')}, {view.year}"
				status={view.status}
				{period}
				{source}
				columns={sliceColumns(title, measure)}
				rows={order
					? [...shown, ...rows.filter((row) => !shown.includes(row))]
					: ranked(rows).concat(rows.filter((row) => row.key === null || row.value === null))}
				slug="{slug}-{dim ?? (part.kind === 'extra' ? part.key : '')}-{view.year}"
			>
				{#snippet note()}
					<p>
						O gráfico omite os registros sem {title.toLocaleLowerCase('pt-BR')} informado; a tabela os
						traz.
					</p>
				{/snippet}
				{#snippet chart()}
					{#if order}
						<Chart
							label="{measure.label} por {title.toLocaleLowerCase('pt-BR')} em {view.year}."
							height="16rem"
							option={(tokens) =>
								columnBars(
									tokens,
									shown.map((row) => ({ label: row.label, value: row.value })),
									measure.format,
									shown.length <= 12
								)}
						/>
					{:else}
						<Chart
							label="{measure.label} por {title.toLocaleLowerCase(
								'pt-BR'
							)} em {view.year}, em ordem decrescente."
							height="{Math.max(shown.length, 2) * 1.8 + 1}rem"
							option={(tokens) =>
								rankingBars(
									tokens,
									shown.map((row) => ({
										label: row.label,
										value: row.value,
										highlight: row.highlight
									})),
									measure.format
								)}
						/>
					{/if}
				{/snippet}
			</Panel>
		{/if}
	{/each}
</div>

<style>
	.panels {
		--grid-min: 30rem;
		--grid-gap: var(--space-7) var(--space-6);
	}

	.wide {
		grid-column: 1 / -1;
	}

	.split {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(20rem, 100%), 1fr));
		gap: var(--space-5);
		align-items: start;
	}
</style>
