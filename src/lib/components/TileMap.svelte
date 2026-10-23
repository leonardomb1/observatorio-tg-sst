<script lang="ts" module>
	/** Row and column of each state in a tile grid that keeps Brazil's rough shape. */
	const GRID: Record<string, [number, number]> = {
		RR: [1, 3],
		AP: [1, 5],
		AM: [2, 2],
		PA: [2, 3],
		MA: [2, 4],
		CE: [2, 5],
		RN: [2, 6],
		AC: [3, 1],
		RO: [3, 2],
		TO: [3, 3],
		PI: [3, 4],
		PE: [3, 5],
		PB: [3, 6],
		MT: [4, 2],
		GO: [4, 3],
		BA: [4, 4],
		SE: [4, 5],
		AL: [4, 6],
		MS: [5, 2],
		DF: [5, 3],
		MG: [5, 4],
		ES: [5, 5],
		PR: [6, 2],
		SP: [6, 3],
		RJ: [6, 4],
		SC: [7, 2],
		RS: [8, 2]
	};
</script>

<script lang="ts">
	import { resolve } from '$app/paths';

	interface Tile {
		uf: string;
		name: string;
		value: number | null;
	}

	interface Props {
		tiles: readonly Tile[];
		format: (value: number) => string;
		/** Read after each value by screen readers, e.g. "acidentes por 100 mil vínculos". */
		unit: string;
		/** National value; tiles above it get a marker. */
		reference: number | null;
	}

	let { tiles, format, unit, reference }: Props = $props();

	const CLASSES = 5;

	/** Quintile breaks of the values on screen, so the shades always spread across the states. */
	const breaks = $derived.by(() => {
		const values = tiles
			.map((tile) => tile.value)
			.filter((value) => value !== null)
			.toSorted((a, b) => a - b);
		if (values.length === 0) return [];
		return Array.from(
			{ length: CLASSES - 1 },
			(_, index) => values[Math.floor(((index + 1) * values.length) / CLASSES)] ?? 0
		);
	});
	const shade = (value: number | null) =>
		value === null ? 0 : breaks.filter((limit) => value >= limit).length + 1;
	const legend = $derived(
		breaks.length === 0
			? []
			: Array.from({ length: CLASSES }, (_, index) => ({
					shade: index + 1,
					from: index === 0 ? null : (breaks[index - 1] ?? null),
					to: index === CLASSES - 1 ? null : (breaks[index] ?? null)
				}))
	);
</script>

<div class="map">
	<ol class="grid">
		{#each tiles as tile (tile.uf)}
			{@const cell = GRID[tile.uf]}
			{#if cell}
				<li style:grid-row={cell[0]} style:grid-column={cell[1]}>
					<a
						href={resolve('/territorio/[uf]', { uf: tile.uf.toLowerCase() })}
						data-shade={shade(tile.value)}
						aria-label="{tile.name}: {tile.value === null ? 'sem dado' : format(tile.value)} {unit}"
					>
						<span class="uf">{tile.uf}</span>
						<span class="value">{tile.value === null ? '—' : format(tile.value)}</span>
						{#if reference !== null && tile.value !== null && tile.value > reference}
							<span class="above" aria-hidden="true"></span>
						{/if}
					</a>
				</li>
			{/if}
		{/each}
	</ol>

	{#if legend.length > 0}
		<ul class="legend" aria-label="Legenda">
			{#each legend as step (step.shade)}
				<li>
					<span class="swatch" data-shade={step.shade}></span>
					{step.from === null && step.to !== null
						? `até ${format(step.to)}`
						: step.to === null && step.from !== null
							? `${format(step.from)} ou mais`
							: `${format(step.from ?? 0)} a ${format(step.to ?? 0)}`}
				</li>
			{/each}
			{#if reference !== null}
				<li><span class="above legend-mark"></span>acima do Brasil ({format(reference)})</li>
			{/if}
		</ul>
	{/if}
</div>

<style>
	.map {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 3.6rem));
		gap: var(--space-1);
		padding: 0;
		list-style: none;
	}

	.grid a {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		aspect-ratio: 1;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius);
		text-decoration: none;
	}

	.grid a:hover {
		outline: 2px solid var(--ink);
		outline-offset: 1px;
	}

	.uf {
		font-weight: 600;
		font-size: var(--text-sm);
	}

	.value {
		font-size: var(--text-xs);
		font-variant-numeric: tabular-nums;
	}

	.above {
		position: absolute;
		inset-block-start: var(--space-1);
		inset-inline-end: var(--space-1);
		inline-size: 0.4rem;
		block-size: 0.4rem;
		border-radius: 50%;
		background: currentcolor;
	}

	[data-shade='0'] {
		background: var(--neutral);
		color: var(--ink);
	}

	[data-shade='1'] {
		background: var(--rate-1);
		color: var(--rate-on-1);
	}

	[data-shade='2'] {
		background: var(--rate-2);
		color: var(--rate-on-2);
	}

	[data-shade='3'] {
		background: var(--rate-3);
		color: var(--rate-on-3);
	}

	[data-shade='4'] {
		background: var(--rate-4);
		color: var(--rate-on-4);
	}

	[data-shade='5'] {
		background: var(--rate-5);
		color: var(--rate-on-5);
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		padding: 0;
		color: var(--ink-2);
		font-size: var(--text-xs);
		list-style: none;
	}

	.legend li {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
	}

	.swatch {
		inline-size: 0.9rem;
		block-size: 0.9rem;
		border-radius: var(--radius);
	}

	.legend-mark {
		position: static;
		color: var(--ink);
	}
</style>
