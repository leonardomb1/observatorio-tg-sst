<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import { rankingBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import { formatInteger, formatPercent } from '#lib/format.ts';
	import type { SlaveRegister } from '#lib/server/catalog/escravidao.ts';
	import { topicSource } from '#lib/sources.ts';

	interface Props {
		data: SlaveRegister;
	}

	let { data }: Props = $props();

	const updated = $derived(data.updatedAt.split('-').toReversed().join('/'));
	const source = $derived(topicSource('escravidao', `edição atualizada em ${updated}`));
	const known = $derived(data.sections.filter((row) => row.section !== null));
	const top = $derived(known[0]);
	const states = $derived(data.states.filter((row) => row.uf !== null));
	const columns = [
		{
			key: 'employers',
			label: 'Empregadores',
			numeric: true,
			format: (cell: unknown) => formatInteger(cell as number)
		},
		{
			key: 'workers',
			label: 'Trabalhadores envolvidos',
			numeric: true,
			format: (cell: unknown) => formatInteger(cell as number | null)
		}
	] as const;
</script>

<div class="l-grid panels">
	<Panel
		title={top?.workers
			? `${top.section} concentra ${formatPercent(top.workers / data.workers)} dos ${formatInteger(data.workers)} trabalhadores do cadastro`
			: 'Trabalhadores do cadastro por atividade'}
		subtitle="Trabalhadores envolvidos nas ações fiscais dos empregadores do cadastro, por seção da CNAE, edição de {updated}"
		{source}
		columns={[{ key: 'section', label: 'Seção da CNAE' }, ...columns]}
		rows={data.sections}
		slug="cadastro-empregadores-por-atividade"
	>
		{#snippet note()}
			<p>
				O cadastro é publicado a cada seis meses e cada empregador permanece nele por dois anos; é o
				retrato vigente, não o total histórico de resgates. São {formatInteger(data.employers)} empregadores,
				{formatInteger(data.individualEmployers)} deles pessoas físicas.
			</p>
			<p>
				O observatório não guarda nome, documento nem endereço dos empregadores: só os números
				agregados. {formatInteger(data.courtOrdered)} inclusões por decisão judicial vêm sem atividade
				e estado na fonte.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Trabalhadores do cadastro por seção da CNAE."
				height="22rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						known.map((row) => ({ label: row.section ?? '—', value: row.workers })),
						(value) => formatInteger(value)
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title={states[0]?.workers
			? `${states[0].uf} tem ${formatInteger(states[0].workers)} trabalhadores no cadastro, o maior número entre os estados`
			: 'Trabalhadores do cadastro por estado'}
		subtitle="Trabalhadores envolvidos nas ações fiscais dos empregadores do cadastro, por UF, edição de {updated}"
		{source}
		columns={[{ key: 'uf', label: 'UF' }, ...columns]}
		rows={data.states}
		slug="cadastro-empregadores-por-uf"
	>
		{#snippet chart()}
			<Chart
				label="Trabalhadores do cadastro por UF."
				height="34rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						states.map((row) => ({ label: row.uf ?? '—', value: row.workers })),
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
