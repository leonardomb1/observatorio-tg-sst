<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import { compareLines, yearBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import { formatCompact, formatDecimal, formatInteger, formatPercent } from '#lib/format.ts';
	import type { UsaYear } from '#lib/server/catalog/internacional.ts';
	import { topicSource } from '#lib/sources.ts';

	interface Props {
		years: readonly UsaYear[];
	}

	let { years }: Props = $props();

	const source = $derived(
		topicSource('osha', `${years[0]?.year ?? '—'} a ${years.at(-1)?.year ?? '—'}`)
	);
	const rated = $derived(years.filter((row) => row.trir !== null));
	const last = $derived(rated.at(-1));
	const excluded = $derived(years.map((row) => row.excludedShare));
</script>

<div class="l-grid panels">
	<Panel
		title={last?.trir != null
			? `${formatDecimal(last.trir, 2)} casos registráveis por 100 trabalhadores em tempo integral em ${last.year}`
			: 'Casos registráveis por 100 trabalhadores'}
		subtitle="Taxa de casos registráveis (TRIR) e de casos com afastamento ou restrição (DART), por 100 trabalhadores em tempo integral (200 mil horas)"
		{source}
		columns={[
			{ key: 'year', label: 'Ano' },
			{
				key: 'trir',
				label: 'TRIR',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null, 2)
			},
			{
				key: 'dart',
				label: 'DART',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null, 2)
			},
			{
				key: 'cases',
				label: 'Casos registráveis',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			}
		]}
		rows={years}
		slug="eua-taxas-osha"
	>
		{#snippet note()}
			<p>
				Os dados são os que os estabelecimentos obrigados enviam à OSHA, não o total do país: o
				número de estabelecimentos que reportam muda de um ano para outro, e por isso a contagem de
				casos não é uma série histórica do país. As taxas, que dividem pelas horas trabalhadas nos
				mesmos estabelecimentos, comparam melhor.
			</p>
			{#if excluded.length}
				<p>
					Ficam de fora os estabelecimentos com número de empregados ou horas trabalhadas
					implausíveis (fora de 1 a 100 mil empregados ou de 500 a 4.000 horas por empregado no
					ano), entre {formatPercent(Math.min(...excluded))} e {formatPercent(
						Math.max(...excluded)
					)} dos que reportam a cada ano. Sem esse filtro, um punhado de erros de digitação derrubaria
					a taxa.
				</p>
			{/if}
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Taxas TRIR e DART dos estabelecimentos que reportam à OSHA, por ano."
				height="18rem"
				option={(tokens) =>
					compareLines(
						tokens,
						years.map((row) => row.year),
						{ label: 'TRIR', values: years.map((row) => row.trir) },
						{ label: 'DART', values: years.map((row) => row.dart) },
						(value) => formatDecimal(value, 2)
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title="Mortes reportadas à OSHA por ano"
		subtitle="Óbitos de trabalho declarados pelos estabelecimentos que reportam à OSHA"
		{source}
		columns={[
			{ key: 'year', label: 'Ano' },
			{
				key: 'deaths',
				label: 'Mortes',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			}
		]}
		rows={years}
		slug="eua-mortes-osha"
	>
		{#snippet note()}
			<p>
				O censo oficial de mortes no trabalho dos EUA (CFOI, do BLS) conta cerca de 5 mil por ano; a
				OSHA recebe só as dos estabelecimentos que reportam. A taxa nacional do país está na seção
				da OIT.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Mortes reportadas à OSHA por ano."
				height="18rem"
				option={(tokens) =>
					yearBars(
						tokens,
						years.map((row) => ({ year: row.year, status: 'consolidado', value: row.deaths })),
						(value) => formatCompact(value)
					)}
			/>
		{/snippet}
	</Panel>
</div>

<style>
	.panels {
		--grid-min: 30rem;
		--grid-gap: var(--space-7) var(--space-6);
	}
</style>
