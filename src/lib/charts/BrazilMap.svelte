<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import {
		choropleth,
		loadMap,
		mapClasses,
		type Area,
		type LoadedMap,
		type MapScope
	} from './brazil.ts';
	import Chart from './Chart.svelte';

	interface Props {
		scope: MapScope;
		areas: readonly Area[];
		format: (value: number) => string;
		label: string;
		/** Tallest the map may be; narrower screens shrink it to the map's own proportions. */
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
	const classes = $derived(mapClasses(areas, format));

	let map = $state<LoadedMap | null>(null);
	let failed = $state(false);

	/** The boundaries load with the first map of a scope and are reused after that. */
	const load: Attachment = () => {
		loadMap(scope)
			.then((loadedMap) => (map = loadedMap))
			.catch(() => (failed = true));
	};
</script>

<div class="map" {@attach load}>
	{#if map}
		{@const { name, aspect } = map}
		<div class="frame" style:inline-size="min(100%, calc({height} * {aspect}))">
			<Chart
				{label}
				height="min({height}, calc(100cqi / {aspect}))"
				{onselect}
				option={(tokens) => choropleth(tokens, name, scope, areas, format)}
			/>
		</div>
		<ul class="legend">
			{#each classes as piece, index (piece.label)}
				<li>
					<span class="swatch" style:background="var(--rate-{index + 1})"></span>{piece.label}
				</li>
			{/each}
			{#if anyMissing}<li><span class="swatch missing"></span>{missing}</li>{/if}
		</ul>
	{:else if failed}
		<p class="placeholder failed" style:block-size={height}>
			Não foi possível carregar o mapa. Os dados estão na tabela.
		</p>
	{:else}
		<div class="placeholder" style:block-size={height} role="img" aria-label={label}></div>
	{/if}
</div>

<style>
	.map {
		container-type: inline-size;
	}

	.frame {
		margin-inline: auto;
	}

	.placeholder {
		border-radius: var(--radius);
		background: var(--surface);
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		margin-block-start: var(--space-2);
		padding: 0;
		list-style: none;
		color: var(--ink-2);
		font-size: var(--text-xs);
	}

	.legend li {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}

	.swatch {
		inline-size: 12px;
		block-size: 12px;
		border-radius: var(--radius);
	}

	.swatch.missing {
		border: 1px solid var(--rule-strong);
		background: var(--neutral);
	}

	.failed {
		display: grid;
		place-items: center;
		color: var(--ink-2);
		font-size: var(--text-sm);
	}
</style>
