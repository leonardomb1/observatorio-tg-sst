<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import { rankingBars, yearBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import { formatDecimal, formatInteger, formatPercent } from '#lib/format.ts';
	import type { SinanNotifications } from '#lib/server/catalog/sinan.ts';
	import { topicSource } from '#lib/sources.ts';

	interface Props {
		data: SinanNotifications;
	}

	let { data }: Props = $props();

	const source = $derived(
		topicSource(
			'sinan',
			`dados finais até ${data.year}, preliminares até ${data.seriousYears.at(-1)?.year ?? data.year}`
		)
	);
	const carteira = $derived(
		data.situations.find((row) => row.situation === 'Empregado com carteira')
	);
	const autonomo = $derived(
		data.situations.find((row) => row.situation === 'Autônomo ou conta própria')
	);
	const lastFinal = $derived(data.seriousYears.find((row) => row.year === data.year));
	const preliminary = $derived(data.seriousYears.filter((row) => row.preliminary));
</script>

<div class="l-grid panels">
	<Panel
		title={carteira?.withCatPct != null && autonomo?.withCatPct != null
			? `Entre acidentados graves com carteira, ${formatPercent(carteira.withCatPct / 100)} tiveram CAT; entre autônomos, ${formatPercent(autonomo.withCatPct / 100)}`
			: `Acidentes graves com CAT por situação no trabalho, ${data.year}`}
		subtitle="Acidentes de trabalho graves notificados ao SUS com CAT emitida, em % das notificações com o campo preenchido, {data.year}"
		{source}
		columns={[
			{ key: 'situation', label: 'Situação no mercado de trabalho' },
			{
				key: 'notifications',
				label: 'Notificações',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			},
			{
				key: 'withCatPct',
				label: 'Com CAT (%)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			}
		]}
		rows={data.situations}
		slug="acidente-grave-cat-por-situacao-{data.year}"
	>
		{#snippet note()}
			<p>
				A CAT só existe para o segurado empregado; o autônomo, o sem carteira e o avulso, em regra,
				não a têm. O SINAN é a notificação do sistema de saúde e alcança todos eles, por isso mostra
				o tamanho do que o registro previdenciário não vê.
			</p>
			<p>A situação de trabalho fica em branco ou ignorada em parte das notificações.</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Parcela de acidentes graves com CAT por situação no mercado de trabalho em {data.year}."
				height="22rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						data.situations.map((row) => ({
							label: row.situation,
							value: row.withCatPct,
							highlight: row.bond === 'informal'
						})),
						(value) => formatPercent(value / 100)
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title={lastFinal
			? `O SUS registrou ${formatInteger(lastFinal.deaths)} mortes entre os acidentes graves notificados em ${lastFinal.year}`
			: 'Óbitos entre os acidentes de trabalho graves notificados'}
		subtitle="Notificações de acidente de trabalho grave com evolução para óbito pelo acidente, por ano"
		{source}
		columns={[
			{ key: 'year', label: 'Ano' },
			{
				key: 'deaths',
				label: 'Óbitos',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			},
			{
				key: 'notifications',
				label: 'Notificações',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			},
			{
				key: 'preliminary',
				label: 'Dados preliminares',
				format: (cell) => (cell ? 'sim' : 'não')
			}
		]}
		rows={data.seriousYears}
		slug="sinan-obitos-acidente-grave-por-ano"
	>
		{#snippet note()}
			{#if preliminary.length > 0}
				<p>
					Barras claras com contorno tracejado são anos com dados preliminares, que ainda recebem
					notificações: {preliminary.map((row) => row.year).join(', ')}.
				</p>
			{/if}
			<p>
				O número de notificações cresceu muito no período, sobretudo pela ampliação da rede que
				notifica. A alta das notificações não mede aumento de risco.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Óbitos entre acidentes de trabalho graves notificados ao SUS, por ano."
				height="18rem"
				option={(tokens) =>
					yearBars(
						tokens,
						data.seriousYears.map((row) => ({
							year: row.year,
							status: row.preliminary ? 'provisorio' : 'consolidado',
							value: row.deaths
						})),
						(value) => formatInteger(value)
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
