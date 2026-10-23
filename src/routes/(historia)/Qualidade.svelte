<script lang="ts">
	import Panel from '#lib/components/Panel.svelte';
	import { formatDecimal, formatInteger, formatMonth, formatMonthYear } from '#lib/format.ts';
	import { catSource } from '#lib/sources.ts';
	import { COVERAGE, yearStatusHint, yearStatusLabel, type YearStatus } from '#lib/status.ts';
	import type { PageData } from './$types';

	type Month = Awaited<PageData['coverage']>[number];
	type MonthStatus = Month['status'];

	interface Props {
		calendar: PageData['calendar'];
		coverage: Awaited<PageData['coverage']>;
	}

	let { calendar, coverage }: Props = $props();

	const share = (ratio: number) => `${formatDecimal(ratio * 100, 0)}%`;
	const gap = share(COVERAGE.gap);
	const low = share(COVERAGE.low);

	const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

	const legend: { status: MonthStatus; mark: string; label: string; hint: string }[] = [
		{ status: 'ok', mark: '', label: 'Completo', hint: `pelo menos ${low} do volume esperado` },
		{
			status: 'baixo',
			mark: '−',
			label: 'Baixo',
			hint: `entre ${gap} e ${low} do esperado; o ano continua comparável`
		},
		{
			status: 'atipico',
			mark: '*',
			label: 'Atípico',
			hint: 'queda real, explicada, e não falha da fonte'
		},
		{
			status: 'lacuna',
			mark: '×',
			label: 'Lacuna',
			hint: `arquivo publicado com menos de ${gap} do esperado`
		},
		{ status: 'ausente', mark: '○', label: 'Ausente', hint: 'nenhuma CAT na fonte para o mês' },
		{
			status: 'nao_publicado',
			mark: '…',
			label: 'Não publicado',
			hint: 'o arquivo do mês ainda não saiu'
		}
	];
	const byStatus = Object.fromEntries(legend.map((entry) => [entry.status, entry])) as Record<
		MonthStatus,
		(typeof legend)[number]
	>;

	const source = $derived(catSource(calendar.publishedUntil));
	const years = $derived(
		calendar.years.map((year) => ({
			...year,
			months: MONTHS.map((month) =>
				coverage.find((row) => row.year === year.year && row.month === month)
			)
		}))
	);
	const consolidated = $derived(calendar.years.filter((row) => row.status === 'consolidado'));
	const notes = $derived(coverage.filter((row) => row.note !== null));
	const rows = $derived(
		coverage.map((row) => ({
			period: formatMonthYear(row.year, row.month),
			status: byStatus[row.status].label,
			cats: row.cats,
			expectedRatio: row.expectedRatio,
			note: row.note
		}))
	);

	function monthsWith(year: number, statuses: readonly MonthStatus[]) {
		return coverage
			.filter((row) => row.year === year && statuses.includes(row.status))
			.map((row) => formatMonth(row.month));
	}

	function listOf(items: readonly string[]) {
		if (items.length <= 1) return items.join('');
		return `${items.slice(0, -1).join(', ')} e ${items.at(-1) ?? ''}`;
	}

	/** Plain-language reasons a year is not consolidated, built from its months and the AEAT check. */
	function reasons(year: (typeof calendar.years)[number]): string[] {
		const out: string[] = [];
		const absent = monthsWith(year.year, ['ausente']);
		const gaps = monthsWith(year.year, ['lacuna']);
		const low = monthsWith(year.year, ['baixo']);
		const pending = monthsWith(year.year, ['nao_publicado']);
		if (absent.length > 0)
			out.push(
				`${absent.length === 1 ? 'Sem' : `${formatInteger(absent.length)} meses sem`} nenhuma CAT na fonte (${listOf(absent)}).`
			);
		if (gaps.length > 0)
			out.push(
				`${gaps.length === 1 ? 'Um mês publicado' : `${formatInteger(gaps.length)} meses publicados`} com menos de ${gap} do esperado (${listOf(gaps)}).`
			);
		if (pending.length > 0)
			out.push(`Arquivos ainda não publicados: ${listOf(pending)}. O total vai subir.`);
		if (low.length > 0 && year.status !== 'consolidado')
			out.push(`Também abaixo do esperado, mas acima de ${gap}: ${listOf(low)}.`);
		if (year.aeatCoveragePct !== null)
			out.push(
				`O microdado reúne ${formatDecimal(year.aeatCoveragePct)}% das CATs contadas no anuário oficial (AEAT) para o ano.`
			);
		return out;
	}

	const statusOrder: YearStatus[] = ['parcial', 'provisorio'];
	const flagged = $derived(
		calendar.years
			.filter((year) => year.status !== 'consolidado')
			.toSorted(
				(a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) || a.year - b.year
			)
	);
	const aeatConsolidated = $derived(consolidated.filter((year) => year.aeatCoveragePct !== null));
</script>

<Panel
	title="{formatInteger(consolidated.length)} dos {formatInteger(
		calendar.years.length
	)} anos da série estão completos o bastante para comparação"
	subtitle="Situação de cada mês da série de CAT, por ano do acidente e mês de emissão"
	{source}
	columns={[
		{ key: 'period', label: 'Mês' },
		{ key: 'status', label: 'Situação' },
		{
			key: 'cats',
			label: 'CATs',
			numeric: true,
			format: (cell) => formatInteger(cell as number)
		},
		{
			key: 'expectedRatio',
			label: 'Razão sobre o esperado',
			numeric: true,
			format: (cell) => formatDecimal(cell as number | null, 2)
		},
		{ key: 'note', label: 'Nota', format: (cell) => (cell as string | null) ?? '' }
	]}
	{rows}
	slug="cobertura-cat-mensal"
>
	{#snippet note()}
		<p>
			O volume esperado de cada mês é a mediana daquele mês nos anos fechados, ajustada ao nível do
			próprio ano. A razão mede se o ano está completo, não se houve mais ou menos acidentes.
		</p>
		<p>
			Um ano é consolidado quando nenhum mês está ausente ou abaixo de {gap} do esperado e o arquivo de
			dezembro já foi publicado.
		</p>
	{/snippet}
	{#snippet chart()}
		<div class="grid-wrap">
			<table class="grid">
				<caption class="visually-hidden">
					Situação de cada mês da série de CAT; linhas são anos, colunas são meses.
				</caption>
				<thead>
					<tr>
						<th scope="col">Ano</th>
						{#each MONTHS as month (month)}
							<th scope="col">{formatMonth(month)}</th>
						{/each}
						<th scope="col" class="year-status">Situação do ano</th>
					</tr>
				</thead>
				<tbody>
					{#each years as year (year.year)}
						<tr>
							<th scope="row">{year.year}</th>
							{#each year.months as month, index (index)}
								{#if month}
									<td data-month={month.status}>
										<span aria-hidden="true">{byStatus[month.status].mark}</span>
										<span class="visually-hidden">{byStatus[month.status].label}</span>
									</td>
								{:else}
									<td>
										<span aria-hidden="true">—</span>
										<span class="visually-hidden">Sem informação</span>
									</td>
								{/if}
							{/each}
							<td class="year-status" data-year={year.status}>{yearStatusLabel[year.status]}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/snippet}
</Panel>

<div class="l-grid explain">
	<section class="l-stack" aria-labelledby="qualidade-legenda">
		<h3 id="qualidade-legenda">Como ler a grade</h3>
		<ul class="legend">
			{#each legend as entry (entry.status)}
				<li>
					<span class="swatch" data-month={entry.status} aria-hidden="true">{entry.mark}</span>
					<span><strong>{entry.label}:</strong> {entry.hint}.</span>
				</li>
			{/each}
		</ul>
		{#each notes as row (`${row.year}-${row.month}`)}
			<p class="small">
				{formatMonthYear(row.year, row.month)}, marcado como atípico: “{row.note}”.
			</p>
		{/each}
	</section>

	<section class="l-stack" aria-labelledby="qualidade-anos">
		<h3 id="qualidade-anos">Por que alguns anos não entram nas comparações</h3>
		<dl class="years">
			{#each flagged as year (year.year)}
				<div>
					<dt>{year.year}: {yearStatusLabel[year.status].toLocaleLowerCase('pt-BR')}</dt>
					<dd>{[yearStatusHint[year.status], ...reasons(year)].join(' ')}</dd>
				</div>
			{/each}
		</dl>
		{#if aeatConsolidated.length > 0}
			<p class="small">
				Mesmo em ano consolidado o microdado não reúne todas as CATs do anuário oficial ({aeatConsolidated
					.map((year) => `${year.year}: ${formatDecimal(year.aeatCoveragePct)}%`)
					.join('; ')}). Parte da diferença é estrutural: os arquivos mensais trazem apenas as CATs
				emitidas no próprio ano do acidente. As taxas do observatório são, por isso, um piso.
			</p>
		{/if}
	</section>
</div>

<style>
	.grid-wrap {
		position: relative;
		overflow-x: auto;
	}

	.grid {
		inline-size: 100%;
		border-collapse: separate;
		border-spacing: 2px;
		font-size: var(--text-xs);
		text-align: center;
	}

	.grid th,
	.grid td {
		position: relative;
		padding: var(--space-1);
		border: 0;
		text-align: center;
		vertical-align: middle;
	}

	.grid thead th {
		color: var(--ink-2);
		font-weight: 400;
	}

	.grid tbody th {
		padding-inline-end: var(--space-2);
		text-align: end;
		font-variant-numeric: tabular-nums;
	}

	.grid td {
		block-size: 2rem;
		min-inline-size: 1.5rem;
		font-weight: 600;
	}

	.grid .year-status {
		padding-inline-start: var(--space-3);
		color: var(--ink-2);
		text-align: start;
		white-space: nowrap;
	}

	.grid td.year-status[data-year='consolidado'] {
		color: var(--ink);
	}

	[data-month='ok'] {
		background: var(--month-ok);
	}

	[data-month='baixo'] {
		background: var(--month-low);
		color: var(--ink);
	}

	[data-month='atipico'] {
		background: var(--month-atypical);
		color: var(--paper);
	}

	[data-month='lacuna'] {
		background: var(--month-gap);
		color: var(--paper);
	}

	[data-month='ausente'] {
		background: var(--month-missing);
		color: var(--paper);
	}

	[data-month='nao_publicado'] {
		outline: 1px dashed var(--rule-strong);
		outline-offset: -1px;
		color: var(--ink-2);
	}

	.explain {
		--grid-min: 22rem;
		--grid-gap: var(--space-6);
	}

	.explain section {
		--stack-gap: var(--space-3);
	}

	h3 {
		font-size: var(--text-lg);
	}

	.legend {
		display: grid;
		gap: var(--space-2);
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}

	.legend li {
		display: flex;
		gap: var(--space-3);
		align-items: baseline;
	}

	.swatch {
		display: inline-grid;
		flex: none;
		place-content: center;
		inline-size: 1.5rem;
		block-size: 1.25rem;
		font-size: var(--text-xs);
		font-weight: 600;
		translate: 0 0.2em;
	}

	.years {
		display: grid;
		gap: var(--space-4);
		font-size: var(--text-sm);
	}

	dt {
		font-weight: 600;
	}

	dd {
		margin: 0;
		max-inline-size: var(--measure);
		color: var(--ink-2);
	}

	.small {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}
</style>
