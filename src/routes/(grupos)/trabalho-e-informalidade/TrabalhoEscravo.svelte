<script lang="ts">
	import KpiCard from '#lib/components/KpiCard.svelte';
	import { formatInteger } from '#lib/format.ts';
	import type { SlaveRegister } from '#lib/server/catalog/escravidao.ts';

	interface Props {
		data: SlaveRegister;
	}

	let { data }: Props = $props();

	const updated = $derived(data.updatedAt.split('-').toReversed().join('/'));
	const context = $derived(`edição de ${updated}, Brasil`);
</script>

<div class="kpis" role="group" aria-label="Cadastro vigente, edição de {updated}">
	<KpiCard
		label="Empregadores no cadastro"
		icon="factory"
		value={data.employers}
		format={formatInteger}
		{context}
	/>
	<KpiCard
		label="Trabalhadores envolvidos"
		icon="users"
		value={data.workers}
		format={formatInteger}
		{context}
	/>
	<KpiCard
		label="Empregadores pessoa física"
		icon="user"
		value={data.individualEmployers}
		format={formatInteger}
		{context}
	/>
	<KpiCard
		label="Incluídos por decisão judicial"
		icon="file"
		value={data.courtOrdered}
		format={formatInteger}
		{context}
	/>
</div>

<style>
	.kpis {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		grid-template-rows: repeat(3, auto);
		gap: var(--space-1) var(--space-5);
	}
</style>
