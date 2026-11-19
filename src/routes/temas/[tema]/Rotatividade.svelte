<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import { rankingBars, yearBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import { formatDecimal, formatInteger, formatPercent } from '#lib/format.ts';
	import type { Turnover } from '#lib/server/catalog/rotatividade.ts';
	import { topicSource } from '#lib/sources.ts';

	interface Props {
		data: Turnover;
	}

	let { data }: Props = $props();

	const source = $derived(
		topicSource('caged', `${data.years[0]?.year ?? '—'} a ${data.years.at(-1)?.year ?? '—'}`)
	);
	const current = $derived(data.years.find((row) => row.year === data.year));
	const top = $derived(data.sectors[0]);
	const partial = $derived(data.years.filter((row) => row.status !== 'consolidado'));
</script>

<div class="l-grid panels">
	<Panel
		title={current
			? `Em ${current.year}, o emprego formal trocou ${formatPercent(current.ratePct / 100)} dos seus trabalhadores`
			: 'Rotatividade do emprego formal por ano'}
		subtitle="Menor entre admissões e desligamentos do ano, em % dos vínculos ativos da RAIS em 31 de dezembro"
		{source}
		columns={[
			{ key: 'year', label: 'Ano' },
			{
				key: 'ratePct',
				label: 'Rotatividade (%)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number)
			},
			{ key: 'status', label: 'Situação do ano' }
		]}
		rows={data.years}
		slug="rotatividade-por-ano"
	>
		{#snippet note()}
			<p>
				Definição usual do DIEESE: o menor entre admissões e desligamentos mede a substituição de
				trabalhadores, e não o crescimento do emprego. O CAGED carregado é só o arquivo de
				movimentações do mês, sem as declarações fora do prazo, o que subestima um pouco os fluxos.
			</p>
			{#if partial.length > 0}
				<p>
					Barras claras com contorno tracejado são anos em que a CAT tem lacunas de publicação:
					{partial.map((row) => row.year).join(', ')}. A rotatividade desses anos está correta, mas
					a taxa de acidentes que a acompanha na tabela de atividades não.
				</p>
			{/if}
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Rotatividade do emprego formal por ano."
				height="18rem"
				option={(tokens) =>
					yearBars(
						tokens,
						data.years.map((row) => ({ year: row.year, status: row.status, value: row.ratePct })),
						(value) => formatPercent(value / 100)
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title={top
			? `${top.name} substituiu o equivalente a ${formatDecimal(top.turnoverPct / 100)} vezes o seu quadro em ${data.year}`
			: `Atividades com maior rotatividade, ${data.year}`}
		subtitle="Rotatividade por classe CNAE com ao menos 50 mil vínculos, {data.year}; a tabela traz a taxa de acidentes de cada uma"
		{source}
		columns={[
			{ key: 'name', label: 'Atividade' },
			{
				key: 'turnoverPct',
				label: 'Rotatividade (%)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number)
			},
			{
				key: 'accidentRate',
				label: 'Acidentes por 100 mil vínculos',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			},
			{
				key: 'ties',
				label: 'Vínculos',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			}
		]}
		rows={data.sectors}
		slug="atividades-maior-rotatividade-{data.year}"
	>
		{#snippet note()}
			<p>
				Atividades de alta rotatividade concentram trabalhadores recém-admitidos, e a literatura
				associa pouco tempo na função a mais acidentes. Entre todas as atividades, a relação entre
				as duas medidas é fraca: a tabela permite olhá-la, não a demonstra.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Rotatividade das 15 atividades com maior troca de trabalhadores em {data.year}."
				height="30rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						data.sectors.map((row) => ({ label: row.name, value: row.turnoverPct })),
						(value) => formatPercent(value / 100),
						current ? { value: current.ratePct, label: 'Média' } : undefined
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
