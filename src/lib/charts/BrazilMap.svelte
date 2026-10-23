<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { choropleth, loadMap, type Area, type MapScope } from './brazil.ts';
	import Chart from './Chart.svelte';

	interface Props {
		scope: MapScope;
		areas: readonly Area[];
		format: (value: number) => string;
		label: string;
		height?: string;
		/** Receives the clicked area's key: the state abbreviation or the municipal code. */
		onselect?: ((key: string) => void) | undefined;
		/** What grey areas mean, shown under the legend when some area has no value. */
		missing?: string;
	}

	let {
		scope,
		areas,
		format,
		label,
		height = '28rem',
		onselect,
		missing = 'Sem dado'
	}: Props = $props();

	const anyMissing = $derived(areas.some((area) => area.value === null));

	let map = $state<string | null>(null);
	let failed = $state(false);

	/** The boundaries load with the first map of a scope and are reused after that. */
	const load: Attachment = () => {
		loadMap(scope)
			.then((name) => (map = name))
			.catch(() => (failed = true));
	};
</script>

<div {@attach load}>
	{#if map}
		<Chart
			{label}
			{height}
			{onselect}
			option={(tokens) => choropleth(tokens, map ?? '', scope, areas, format)}
		/>
		{#if anyMissing}<p class="missing"><span class="swatch"></span>{missing}</p>{/if}
	{:else if failed}
		<p class="placeholder failed" style:block-size={height}>
			Não foi possível carregar o mapa. Os dados estão na tabela.
		</p>
	{:else}
		<div class="placeholder" style:block-size={height} role="img" aria-label={label}></div>
	{/if}
</div>

<style>
	.placeholder {
		border-radius: var(--radius);
		background: var(--surface);
	}

	.missing {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		margin-block-start: var(--space-2);
		color: var(--ink-2);
		font-size: var(--text-xs);
	}

	.swatch {
		inline-size: 12px;
		block-size: 12px;
		border: 1px solid var(--rule-strong);
		border-radius: var(--radius);
		background: var(--neutral);
	}

	.failed {
		display: grid;
		place-items: center;
		color: var(--ink-2);
		font-size: var(--text-sm);
	}
</style>
