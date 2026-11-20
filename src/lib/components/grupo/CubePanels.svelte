<script lang="ts" module>
	import type { Dimension } from '#lib/filters.ts';
	import type { Metric } from '#lib/metrics.ts';

	interface Common {
		/** The panel's measure; with more than one, the panel offers a switch between them. */
		metrics?: readonly Metric[];
		/** Bars drawn at most; the table keeps every row. */
		top?: number;
	}

	export type Part = Common &
		(
			| { kind: 'serie' }
			/** Month by month across all years. */
			| { kind: 'mensal' }
			| { kind: 'mapa' }
			/** Municipalities of the selected state on a map, or the largest of the country without one. */
			| { kind: 'municipios' }
			| { kind: 'dim'; dim: Dimension }
			| {
					kind: 'extra';
					key: string;
					/** Name of the breakdown, as in "por {title}". */
					title: string;
					/** Ordinal categories in display order; otherwise ranked by value. */
					order?: readonly string[];
			  }
		);
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BrazilMap from '#lib/charts/BrazilMap.svelte';
	import Chart from '#lib/charts/Chart.svelte';
	import { columnBars, rankingBars, timeLine, yearBars } from '#lib/charts/options.ts';
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
		/** Names for keys the datamart stores as codes, by dimension or extra key. */
		labels?: Record<string, Record<string, string>>;
	}

	let { view, metric, parts, source, slug, labels = {} }: Props = $props();

	const selection = $derived(readFilters(page.url.searchParams).selection);
	/** "Capítulo da CID-10" becomes "capítulo da CID-10", keeping acronyms. */
	const lowerFirst = (text: string) => text.charAt(0).toLocaleLowerCase('pt-BR') + text.slice(1);
	const UNKNOWN = 'Não informado';
	const MONTHS = [
		'jan',
		'fev',
		'mar',
		'abr',
		'mai',
		'jun',
		'jul',
		'ago',
		'set',
		'out',
		'nov',
		'dez'
	];
	const TOP = 10;
	const MUNICIPAL_TOP = 15;

	let chosen = $state<Record<number, number>>({});
	const measureOf = (part: Part, index: number) => part.metrics?.[chosen[index] ?? 0] ?? metric;

	const nameOf = (key: string, code: string | null) => {
		if (code === null) return UNKNOWN;
		const named = labels[key]?.[code];
		if (named) return named;
		const dim = DIMENSIONS[key as Dimension] as (typeof DIMENSIONS)[Dimension] | undefined;
		return dim?.options.find((option) => option.value === code)?.label ?? code;
	};

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

	/** The largest rows up to `limit`, plus the selected one wherever it ranks. */
	const cut = (rows: readonly Row[], limit: number | undefined) =>
		limit === undefined ? rows : rows.filter((row, position) => position < limit || row.highlight);

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
			return `${names}: ${formatPercent(lead.row.share)} ${measure.of} ${measure.noun}`;
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

	function select(changes: Record<string, string | null>) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- same page, only the search changes
		void goto(withParams(page.url, changes), { replace: true, reset: false });
	}

	/** Clicking a bar filters the page by it; clicking the selected one clears the filter. */
	function drill(dim: Dimension, rows: readonly Row[], label: string) {
		const row = rows.find((each) => each.label === label);
		if (!row?.key) return;
		const selected = selection[dim]?.value === row.key;
		const slug =
			DIMENSIONS[dim].options.find((option) => option.value === row.key)?.slug ?? row.key;
		const value = selected ? null : slug;
		select(dim === 'uf' ? { uf: value, municipio: null } : { [dim]: value });
	}

	function selectUf(uf: string) {
		const option = DIMENSIONS.uf.options.find((each) => each.value === uf);
		if (option) select({ uf: option.slug, municipio: null });
	}
</script>

{#snippet switcher(part: Part, index: number)}
	{#if part.metrics && part.metrics.length > 1}
		<div class="switch" role="group" aria-label="Medida do painel">
			{#each part.metrics as option, position (option.label)}
				<button
					type="button"
					aria-pressed={(chosen[index] ?? 0) === position}
					onclick={() => (chosen[index] = position)}>{option.label}</button
				>
			{/each}
		</div>
	{/if}
{/snippet}

<ScopeNote ignored={view.ignored} requestedYear={view.requestedYear} shownYear={view.year} />

<div class="l-grid panels">
	{#each parts as part, index (index)}
		{@const measure = measureOf(part, index)}
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
					{@render switcher(part, index)}
					<Chart
						label="{measure.label} por ano; anos fechados em barras escuras."
						height="18rem"
						option={(tokens) => yearBars(tokens, points, measure.format)}
					/>
				{/snippet}
			</Panel>
		{:else if part.kind === 'mensal'}
			{@const points = view.months.map((row) => ({
				period: `${MONTHS[row.month - 1] ?? String(row.month)}/${String(row.year).slice(2)}`,
				value: measure.value(row)
			}))}
			{@const peak = leader(points, (row) => row.value, measure.format)}
			<div class="wide">
				<Panel
					title={peak
						? `${measure.label} mês a mês; o maior valor foi em ${peak.row.period}`
						: `${measure.label} mês a mês`}
					subtitle="{measure.unit}, por mês"
					{source}
					columns={[
						{ key: 'period', label: 'Mês' },
						{
							key: 'value',
							label: measure.label,
							numeric: true,
							format: (cell) => (cell === null ? '—' : measure.format(cell as number))
						}
					]}
					rows={points}
					slug="{slug}-mensal"
				>
					{#snippet note()}
						<p>
							Os meses mais recentes ainda recebem registros e tendem a subir; quedas no fim da
							série não são, por si, uma redução.
						</p>
					{/snippet}
					{#snippet chart()}
						{@render switcher(part, index)}
						<Chart
							label="{measure.label} mês a mês."
							height="16rem"
							option={(tokens) =>
								timeLine(
									tokens,
									points.map((row) => row.period),
									points.map((row) => row.value),
									measure.format
								)}
						/>
					{/snippet}
				</Panel>
			</div>
		{:else if part.kind === 'mapa'}
			{@const rows = toRows(
				view.slices.uf ?? [],
				measure,
				(key) => nameOf('uf', key),
				selection.uf?.value ?? null
			)}
			{@const sorted = ranked(rows)}
			{@const top = cut(sorted, part.top ?? TOP)}
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
						<p>Clique em um estado, no mapa ou na barra, para filtrar a página inteira por ele.</p>
					{/snippet}
					{#snippet chart()}
						{@render switcher(part, index)}
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
								onselect={(name) => {
									drill('uf', top, name);
								}}
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
		{:else if part.kind === 'municipios'}
			{@const uf = selection.uf?.value ?? null}
			{@const rows = toRows(
				view.slices.municipio ?? [],
				measure,
				(key) => nameOf('municipio', key),
				selection.municipio?.value ?? null
			)}
			{@const sorted = ranked(rows)}
			{@const top = cut(sorted, part.top ?? MUNICIPAL_TOP)}
			<div class="wide">
				<Panel
					title={finding(rows, measure, `${measure.label} por município`)}
					subtitle="{measure.unit}, por município do empregador, {uf
						? (selection.uf?.label ?? uf)
						: 'os maiores do país'}, {view.year}"
					status={view.status}
					{period}
					{source}
					columns={sliceColumns('Município', measure)}
					rows={sorted}
					slug="{slug}-municipios-{view.year}"
				>
					{#snippet note()}
						{#if uf}
							<p>Clique em um município para filtrar a página por ele.</p>
						{:else}
							<p>Escolha um estado para ver o mapa de todos os seus municípios.</p>
						{/if}
					{/snippet}
					{#snippet chart()}
						{@render switcher(part, index)}
						<div class="split">
							{#if uf}
								<BrazilMap
									scope={{ kind: 'municipalities', uf }}
									areas={rows
										.filter((row) => row.key !== null)
										.map((row) => ({ key: row.key ?? '', label: row.label, value: row.value }))}
									format={measure.format}
									label="Mapa de {measure.label.toLocaleLowerCase(
										'pt-BR'
									)} por município em {view.year}; clique em um município para filtrar a página."
									onselect={(code) => {
										select({ municipio: code });
									}}
									missing="Sem registro"
								/>
							{/if}
							<Chart
								label="{measure.label} nos municípios de maior valor em {view.year}."
								height="{top.length * 1.6 + 1}rem"
								onselect={(name) => {
									drill('municipio', top, name);
								}}
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
			{@const key = part.kind === 'dim' ? part.dim : part.key}
			{@const dim = part.kind === 'dim' ? part.dim : null}
			{@const slices = dim ? (view.slices[dim] ?? []) : (view.extras[key] ?? [])}
			{@const title = dim ? DIMENSIONS[dim].label : part.kind === 'extra' ? part.title : ''}
			{@const rows = toRows(
				slices,
				measure,
				(code) => nameOf(key, code),
				dim ? (selection[dim]?.value ?? null) : null
			)}
			{@const order = dim === 'idade' ? AGE_BANDS : part.kind === 'extra' ? part.order : undefined}
			{@const shown = order ? ordered(rows, order) : cut(ranked(rows), part.top)}
			<Panel
				title={finding(rows, measure, `${measure.label} por ${lowerFirst(title)}`)}
				subtitle="{measure.unit}, por {lowerFirst(title)}, {view.year}"
				status={view.status}
				{period}
				{source}
				columns={sliceColumns(title, measure)}
				rows={order
					? [...shown, ...rows.filter((row) => !shown.includes(row))]
					: ranked(rows).concat(rows.filter((row) => row.key === null || row.value === null))}
				slug="{slug}-{key}-{view.year}"
			>
				{#snippet note()}
					<p>
						O gráfico omite os registros sem {lowerFirst(title)} informado{part.top
							? ` e mostra os ${String(part.top)} maiores`
							: ''}; a tabela traz todos.
					</p>
					{#if dim}
						<p>
							Clique em uma barra para filtrar a página inteira por ela; clique de novo para tirar o
							filtro.
						</p>
					{/if}
				{/snippet}
				{#snippet chart()}
					{@render switcher(part, index)}
					{#if order}
						<Chart
							label="{measure.label} por {lowerFirst(title)} em {view.year}."
							height="16rem"
							onselect={dim
								? (name) => {
										drill(dim, shown, name);
									}
								: undefined}
							option={(tokens) =>
								columnBars(
									tokens,
									shown.map((row) => ({
										label: row.label,
										value: row.value,
										highlight: row.highlight
									})),
									measure.format,
									shown.length <= 12
								)}
						/>
					{:else}
						<Chart
							label="{measure.label} por {lowerFirst(title)} em {view.year}, em ordem decrescente."
							height="{Math.max(shown.length, 2) * 1.8 + 1}rem"
							onselect={dim
								? (name) => {
										drill(dim, shown, name);
									}
								: undefined}
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

	.switch {
		display: inline-flex;
		flex-wrap: wrap;
		margin-block-end: var(--space-3);
		padding: 2px;
		border: var(--border);
		border-radius: var(--radius);
		font-size: var(--text-xs);
	}

	.switch button {
		padding: var(--space-1) var(--space-2);
		border: 0;
		border-radius: var(--radius);
		background: none;
		color: var(--ink-2);
		font: inherit;
	}

	.switch button[aria-pressed='true'] {
		background: var(--surface);
		color: var(--ink);
	}
</style>
