<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import { columnBars, rankingBars, yearBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import { formatDecimal, formatInteger } from '#lib/format.ts';
	import type { HighwayDrivers } from '#lib/server/catalog/rodovias.ts';
	import { topicSource } from '#lib/sources.ts';

	interface Props {
		data: HighwayDrivers;
	}

	let { data }: Props = $props();

	const span = $derived(`${data.firstYear} a ${data.lastYear}`);
	const source = $derived(
		topicSource('prf', `acidentes de ${data.firstYear} a ${data.truckYears.at(-1)?.year ?? '—'}`)
	);
	const complete = $derived(data.truckYears.filter((row) => row.complete));
	const minDeaths = $derived(Math.min(...complete.map((row) => row.deaths)));
	const maxDeaths = $derived(Math.max(...complete.map((row) => row.deaths)));
	const open = $derived(data.truckYears.find((row) => !row.complete));
	const sum = (rows: HighwayDrivers['truckHours']) => ({
		drivers: rows.reduce((total, row) => total + row.drivers, 0),
		deaths: rows.reduce((total, row) => total + row.deaths, 0)
	});
	const night = $derived(sum(data.truckHours.filter((row) => row.hour <= 5)));
	const day = $derived(sum(data.truckHours.filter((row) => row.hour >= 6 && row.hour <= 17)));
	const nightRate = $derived(night.drivers ? (night.deaths * 1000) / night.drivers : null);
	const dayRate = $derived(day.drivers ? (day.deaths * 1000) / day.drivers : null);
</script>

<div class="l-grid panels">
	<Panel
		title={complete.length
			? `De ${formatInteger(minDeaths)} a ${formatInteger(maxDeaths)} caminhoneiros morreram por ano em acidentes nas rodovias federais`
			: 'Caminhoneiros mortos em acidentes nas rodovias federais'}
		subtitle="Condutores de caminhão e caminhão-trator mortos em acidentes nas rodovias federais, por ano"
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
				key: 'drivers',
				label: 'Condutores envolvidos',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			}
		]}
		rows={data.truckYears}
		slug="caminhoneiros-mortos-por-ano"
	>
		{#snippet note()}
			{#if open}
				<p>
					A barra clara com contorno tracejado é {open.year}, ano ainda em aberto na fonte.
				</p>
			{/if}
			<p>
				Só rodovias federais, que a PRF patrulha; acidentes em rodovias estaduais e em vias urbanas
				ficam de fora. O condutor de caminhão é tratado como trabalhador porque dirigir é a
				atividade dele, mas a fonte não registra o vínculo.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Condutores de caminhão mortos em acidentes nas rodovias federais, por ano."
				height="18rem"
				option={(tokens) =>
					yearBars(
						tokens,
						data.truckYears.map((row) => ({
							year: row.year,
							status: row.complete ? 'consolidado' : 'parcial',
							value: row.deaths
						})),
						(value) => formatInteger(value)
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title={nightRate && dayRate
			? `Na madrugada, o acidente com caminhoneiro mata ${formatDecimal(nightRate / dayRate)} vezes mais que durante o dia`
			: 'Letalidade dos acidentes com caminhoneiros por hora'}
		subtitle="Óbitos por mil condutores de caminhão envolvidos em acidentes, por hora do acidente, {span}"
		{source}
		columns={[
			{ key: 'hour', label: 'Hora' },
			{
				key: 'perThousand',
				label: 'Óbitos por mil condutores',
				numeric: true,
				format: (cell) => formatDecimal(cell as number)
			},
			{
				key: 'deaths',
				label: 'Óbitos',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			},
			{
				key: 'drivers',
				label: 'Condutores envolvidos',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			}
		]}
		rows={data.truckHours}
		slug="caminhoneiros-letalidade-por-hora"
	>
		{#snippet note()}
			<p>
				Letalidade é a gravidade do acidente quando ele acontece, não o risco por quilômetro: a
				fonte não tem a quantidade de caminhões na estrada em cada hora. A madrugada vai de 0h às
				5h59 e o dia, de 6h às 17h59.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Óbitos por mil condutores de caminhão envolvidos em acidentes, por hora, {span}."
				height="18rem"
				option={(tokens) =>
					columnBars(
						tokens,
						data.truckHours.map((row) => ({ label: `${row.hour}h`, value: row.perThousand })),
						(value) => formatDecimal(value),
						false
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title={`Letalidade dos acidentes por tipo de veículo, ${span}`}
		subtitle="Óbitos por mil condutores envolvidos em acidentes nas rodovias federais, por tipo de veículo, {span}"
		{source}
		columns={[
			{ key: 'category', label: 'Veículo' },
			{
				key: 'perThousand',
				label: 'Óbitos por mil condutores',
				numeric: true,
				format: (cell) => formatDecimal(cell as number)
			},
			{
				key: 'deaths',
				label: 'Óbitos',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			},
			{
				key: 'drivers',
				label: 'Condutores envolvidos',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			}
		]}
		rows={data.categories}
		slug="letalidade-por-veiculo"
	>
		{#snippet note()}
			<p>
				Motociclistas e ciclistas morrem mais quando se acidentam porque estão desprotegidos; o
				caminhoneiro aparece no meio, mas é o único grupo da tabela que está sempre trabalhando.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Óbitos por mil condutores envolvidos por tipo de veículo, {span}."
				height="14rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						data.categories.map((row) => ({
							label: row.category,
							value: row.perThousand,
							highlight: row.category === 'Caminhão'
						})),
						(value) => formatDecimal(value)
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
