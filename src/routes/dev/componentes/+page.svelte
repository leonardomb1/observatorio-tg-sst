<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import Combobox from '#lib/components/Combobox.svelte';
	import Dialog from '#lib/components/Dialog.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { getToaster } from '#lib/components/toast.svelte.ts';
	import type { Column } from '#lib/csv.ts';
	import { formatDecimal, formatInteger } from '#lib/format.ts';

	interface UfRate {
		uf: string;
		vinculos: number;
		taxa: number;
		obitos: number;
	}

	const rows: UfRate[] = [
		{ uf: 'Santa Catarina', vinculos: 2730345, taxa: 1587.8, obitos: 6.81 },
		{ uf: 'Rio Grande do Sul', vinculos: 3198144, taxa: 1463.4, obitos: 4.38 },
		{ uf: 'São Paulo', vinculos: 15301896, taxa: 1359.5, obitos: 3.95 },
		{ uf: 'Paraná', vinculos: 3578069, taxa: 1334.1, obitos: 7.24 },
		{ uf: 'Mato Grosso', vinculos: 1129867, taxa: 972.7, obitos: 8.94 }
	];

	const columns: Column<UfRate>[] = [
		{ key: 'uf', label: 'Unidade federativa' },
		{
			key: 'vinculos',
			label: 'Vínculos formais',
			numeric: true,
			format: (value) => formatInteger(value as number)
		},
		{
			key: 'taxa',
			label: 'Acidentes por 100 mil vínculos',
			numeric: true,
			format: (value) => formatDecimal(value as number)
		},
		{
			key: 'obitos',
			label: 'Óbitos por 100 mil vínculos',
			numeric: true,
			format: (value) => formatDecimal(value as number, 2)
		}
	];

	const series = [
		{ ano: '2019', valor: 474.6, status: 'consolidado' },
		{ ano: '2020', valor: 391.4, status: 'consolidado' },
		{ ano: '2021', valor: 436.2, status: 'consolidado' },
		{ ano: '2022', valor: 665.4, status: 'consolidado' },
		{ ano: '2023', valor: 603.8, status: 'consolidado' },
		{ ano: '2024', valor: 510.0, status: 'provisorio' },
		{ ano: '2025', valor: 579.7, status: 'provisorio' }
	];

	const ufOptions = [
		{ value: 'SC', label: 'Santa Catarina', hint: 'SC' },
		{ value: 'RS', label: 'Rio Grande do Sul', hint: 'RS' },
		{ value: 'SP', label: 'São Paulo', hint: 'SP' },
		{ value: 'PR', label: 'Paraná', hint: 'PR' },
		{ value: 'MT', label: 'Mato Grosso', hint: 'MT' }
	];

	const toaster = getToaster();
	let uf = $state<string | null>('SC');
	let dialogOpen = $state(false);
	let consent = $state(false);

	const source = {
		name: 'INSS e RAIS/MTE',
		href: 'https://dadosabertos.inss.gov.br',
		updatedAt: 'dados de exemplo'
	};
</script>

<svelte:head><title>Componentes — Observatório SST</title></svelte:head>

<div class="l-stack showcase">
	<h1>Componentes</h1>
	<p>Página de desenvolvimento. Os números abaixo são ilustrativos.</p>

	<section class="l-cluster">
		<StatusBadge status="consolidado" period="2023" />
		<StatusBadge status="provisorio" period="2025" />
		<StatusBadge status="parcial" period="jan–set 2026" />
	</section>

	<section class="l-cluster controls">
		<Combobox
			label="Unidade federativa"
			options={ufOptions}
			value={uf}
			onchange={(next) => (uf = next)}
		/>
		<label class="l-cluster check">
			<input type="checkbox" bind:checked={consent} /> Comparar com o Brasil
		</label>
		<button type="button" class="button" onclick={() => (dialogOpen = true)}>Abrir diálogo</button>
		<button
			type="button"
			class="button"
			onclick={() => {
				toaster.show('Link copiado para a área de transferência.');
			}}>Mostrar aviso</button
		>
	</section>

	<div class="l-grid panels">
		<Panel
			title="Santa Catarina tem a maior taxa de acidentes"
			subtitle="Acidentes com CAT por 100 mil vínculos formais, 2023"
			status="consolidado"
			period="2023"
			{source}
			{columns}
			{rows}
			slug="taxa-acidentes-uf-2023"
		>
			{#snippet note()}
				<p>
					Taxa = acidentes com CAT registrada ÷ estoque de vínculos formais da RAIS em 31/12 × 100
					mil.
				</p>
				<p>Recorte pela UF do empregador. O campo de UF do acidente é defeituoso na origem.</p>
			{/snippet}
			{#snippet chart()}
				<Chart
					label="Santa Catarina lidera, com 1.587,8 acidentes por 100 mil vínculos em 2023."
					height="16rem"
					option={(tokens) => ({
						grid: { left: 8, right: 64, top: 8, bottom: 8, containLabel: true },
						xAxis: { type: 'value', show: false },
						yAxis: {
							type: 'category',
							inverse: true,
							data: rows.map((row) => row.uf)
						},
						series: [
							{
								type: 'bar',
								data: rows.map((row) => ({
									value: row.taxa,
									itemStyle: {
										color:
											ufOptions.find((o) => o.label === row.uf)?.value === uf
												? tokens.accent
												: tokens.ink3
									}
								})),
								label: {
									show: true,
									position: 'right',
									color: tokens.ink,
									formatter: ({ value }: { value: number }) => formatDecimal(value)
								}
							}
						],
						tooltip: { show: false }
					})}
				/>
			{/snippet}
		</Panel>

		<Panel
			title="Acidentes registrados por ano"
			subtitle="Acidentes com CAT, em milhares, por ano de ocorrência"
			status="provisorio"
			period="2024–2025"
			{source}
			columns={[
				{ key: 'ano', label: 'Ano' },
				{ key: 'valor', label: 'Milhares de acidentes', numeric: true },
				{ key: 'status', label: 'Situação' }
			]}
			rows={series}
			slug="acidentes-ano"
		>
			{#snippet chart()}
				<Chart
					label="Os acidentes registrados chegaram ao pico em 2022, com 665 mil."
					height="16rem"
					option={(tokens) => ({
						xAxis: { type: 'category', data: series.map((point) => point.ano) },
						yAxis: {
							type: 'value',
							axisLabel: { formatter: (value: number) => formatInteger(value) }
						},
						series: [
							{
								type: 'line',
								color: tokens.ink,
								data: series.map((point) => (point.status === 'consolidado' ? point.valor : null)),
								connectNulls: false
							},
							{
								type: 'line',
								color: tokens.ink,
								lineStyle: { type: 'dashed' },
								data: series.map((point, index) =>
									point.status !== 'consolidado' || series[index + 1]?.status === 'provisorio'
										? point.valor
										: null
								)
							}
						],
						tooltip: {
							trigger: 'axis',
							valueFormatter: (value: unknown) =>
								typeof value === 'number' ? `${formatDecimal(value)} mil` : '—'
						}
					})}
				/>
			{/snippet}
		</Panel>
	</div>
</div>

<Dialog bind:open={dialogOpen} title="Citar este painel">
	<p>
		OBSERVATÓRIO SST. Taxa de acidentes por unidade federativa, 2023. Disponível em: endereço do
		painel. Acesso em: 23 out. 2026.
	</p>
	{#snippet actions()}
		<button type="button" class="button" onclick={() => (dialogOpen = false)}>Fechar</button>
	{/snippet}
</Dialog>

<style>
	.showcase {
		--stack-gap: var(--space-6);
	}

	.panels {
		--grid-min: 28rem;
	}

	.controls {
		align-items: end;
	}

	.check {
		--cluster-gap: var(--space-2);

		font-size: var(--text-sm);
	}

	.button {
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--ink);
		border-radius: var(--radius);
		background: var(--surface);
		font-size: var(--text-sm);
	}

	.button:hover {
		background: var(--ink);
		color: var(--paper);
	}
</style>
