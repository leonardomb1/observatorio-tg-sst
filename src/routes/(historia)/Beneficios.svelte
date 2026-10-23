<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import { rankingBars, yearBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import type { Column } from '#lib/csv.ts';
	import { formatCompact, formatDecimal, formatInteger, formatPercent } from '#lib/format.ts';
	import { changeSince, leader } from '#lib/findings.ts';
	import { benefitsSource } from '#lib/sources.ts';
	import type { PageData } from './$types';

	interface Props {
		benefits: Awaited<PageData['benefits']>;
	}

	let { benefits }: Props = $props();

	const source = $derived(benefitsSource(benefits.publishedUntil));
	const kinds = $derived(
		[...new Set(benefits.years.map((row) => row.code))]
			.map((code) => ({
				code,
				kind: benefits.years.find((row) => row.code === code)?.kind ?? code,
				grants: benefits.years
					.filter((row) => row.code === code)
					.reduce((sum, row) => sum + row.grants, 0)
			}))
			.toSorted((a, b) => b.grants - a.grants)
	);
	/** One row per year with a `k<code>` column per espécie, for the table and the CSV. */
	type YearRow = { year: number; months: number; total: number } & Record<
		`k${string}`,
		number | null
	>;

	const years = $derived(
		[...new Set(benefits.years.map((row) => row.year))]
			.toSorted((a, b) => a - b)
			.map((year): YearRow => {
				const rows = benefits.years.filter((row) => row.year === year);
				return {
					year,
					months: Math.max(...rows.map((row) => row.months)),
					total: rows.reduce((sum, row) => sum + row.grants, 0),
					...Object.fromEntries(
						kinds.map(({ code }) => [
							`k${code}`,
							rows.find((row) => row.code === code)?.grants ?? null
						])
					)
				};
			})
	);
	const yearColumns = $derived<Column<YearRow>[]>([
		{ key: 'year', label: 'Ano' },
		{ key: 'months', label: 'Meses publicados', numeric: true },
		{
			key: 'total',
			label: 'Total',
			numeric: true,
			format: (cell) => formatInteger(cell)
		},
		...kinds.map(({ code, kind }): Column<YearRow> => ({
			key: `k${code}`,
			label: kind,
			numeric: true,
			format: (cell) => formatInteger(cell)
		}))
	]);
	const full = $derived(years.filter((row) => row.months === 12));
	const last = $derived(full.at(-1));
	const previous = $derived(last ? full.find((row) => row.year === last.year - 1) : undefined);
	const change = $derived(last && previous ? last.total / previous.total - 1 : null);
	const lastKinds = $derived(last ? benefits.years.filter((row) => row.year === last.year) : []);
	const rmi = $derived(
		lastKinds
			.filter((row) => row.medianRmi !== null)
			.toSorted((a, b) => (b.medianRmi ?? 0) - (a.medianRmi ?? 0))
	);
	const partial = $derived(years.filter((row) => row.months < 12));
	const kindLead = $derived(
		leader(
			lastKinds,
			(row) => row.grants,
			(value) => formatInteger(value)
		)
	);
</script>

<div class="l-grid panels">
	<Panel
		title={last && previous && change !== null
			? `Em ${last.year}, o INSS concedeu ${formatInteger(last.total)} benefícios acidentários, ${changeSince(change, previous.year)}`
			: 'Benefícios acidentários concedidos por ano'}
		subtitle="Concessões de benefícios de origem acidentária pelo INSS, por ano de concessão"
		{source}
		columns={yearColumns}
		rows={years}
		slug="beneficios-acidentarios-por-ano"
	>
		{#snippet note()}
			{#if partial.length > 0}
				<p>
					Barras claras com contorno tracejado são anos incompletos na fonte:
					{partial
						.map(
							(row) =>
								`${row.year} (${formatInteger(row.months)} ${row.months === 1 ? 'mês' : 'meses'})`
						)
						.join(', ')}. Não compare esses totais com os anos completos.
				</p>
			{/if}
			<p>
				A espécie 36, auxílio-acidente previdenciário, fica de fora: apesar do nome, não decorre de
				acidente do trabalho.
			</p>
			<p>A tabela separa as concessões por espécie de benefício.</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Concessões de benefícios acidentários por ano; anos completos em barras escuras."
				height="18rem"
				option={(tokens) =>
					yearBars(
						tokens,
						years.map((row) => ({
							year: row.year,
							status: row.months === 12 ? 'consolidado' : 'parcial',
							value: row.total
						})),
						(value) => formatCompact(value)
					)}
			/>
		{/snippet}
	</Panel>

	{#if last}
		<Panel
			title={kindLead && !kindLead.tied.length
				? `${kindLead.row.kind} responde por ${formatPercent(kindLead.row.grants / last.total)} das concessões de ${last.year}`
				: `Concessões por espécie, ${last.year}`}
			subtitle="Concessões de benefícios acidentários por espécie, {last.year}"
			{source}
			columns={[
				{ key: 'kind', label: 'Espécie' },
				{
					key: 'grants',
					label: 'Concessões',
					numeric: true,
					format: (cell) => formatInteger(cell as number)
				}
			]}
			rows={lastKinds}
			slug="beneficios-por-especie-{last.year}"
		>
			{#snippet note()}
				<p>
					O auxílio-doença acidentário é temporário e cobre o afastamento; os demais decorrem de
					sequela permanente ou de morte.
				</p>
			{/snippet}
			{#snippet chart()}
				<Chart
					label="Concessões por espécie de benefício acidentário em {last.year}."
					height="14rem"
					option={(tokens) =>
						rankingBars(
							tokens,
							lastKinds.map((row) => ({ label: row.kind, value: row.grants })),
							(value) => formatInteger(value)
						)}
				/>
			{/snippet}
		</Panel>

		<Panel
			title={rmi[0] && rmi.at(-1)
				? `A renda inicial mediana vai de ${formatDecimal(rmi.at(-1)?.medianRmi ?? null, 2)} a ${formatDecimal(rmi[0].medianRmi, 2)} salários mínimos`
				: `Renda mensal inicial por espécie, ${last.year}`}
			subtitle="Mediana mensal da renda mensal inicial (RMI), em salários mínimos, {last.year}"
			{source}
			columns={[
				{ key: 'kind', label: 'Espécie' },
				{
					key: 'medianRmi',
					label: 'RMI mediana (salários mínimos)',
					numeric: true,
					format: (cell) => formatDecimal(cell as number | null, 2)
				},
				{
					key: 'grants',
					label: 'Concessões',
					numeric: true,
					format: (cell) => formatInteger(cell as number)
				}
			]}
			rows={rmi}
			slug="rmi-por-especie-{last.year}"
		>
			{#snippet note()}
				<p>
					A fonte publica a mediana de cada mês. O valor anual é a média das 12 medianas mensais,
					ponderada pelo número de concessões com RMI válida; não é a mediana exata do ano.
				</p>
				<p>
					RMI zerada ou acima de 50 salários mínimos é tratada como erro de preenchimento e fica de
					fora. O auxílio-acidente é uma indenização paga junto com o salário e por isso pode ficar
					abaixo de um salário mínimo.
				</p>
			{/snippet}
			{#snippet chart()}
				<Chart
					label="Renda mensal inicial mediana por espécie em {last.year}, em salários mínimos."
					height="14rem"
					option={(tokens) =>
						rankingBars(
							tokens,
							rmi.map((row) => ({ label: row.kind, value: row.medianRmi })),
							(value) => formatDecimal(value, 2),
							{ value: 1, label: '1 salário mínimo' }
						)}
				/>
			{/snippet}
		</Panel>
	{/if}
</div>

<style>
	.panels {
		--grid-min: 30rem;
		--grid-gap: var(--space-7) var(--space-6);
	}
</style>
