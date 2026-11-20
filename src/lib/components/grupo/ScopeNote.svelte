<script lang="ts">
	import { filterNouns, type Dimension } from '#lib/filters.ts';
	import Icon from '../Icon.svelte';

	interface Props {
		/** Active filters the section's source cannot apply. */
		ignored: readonly Dimension[];
		/** Year asked for in the filters when the section shows another one. */
		requestedYear?: number | null;
		shownYear?: number;
		/** What the section shows when it takes no year filter, e.g. "o anuário de 2024". */
		fixedPeriod?: string;
	}

	let { ignored, requestedYear = null, shownYear, fixedPeriod }: Props = $props();

	const notes = $derived(
		[
			ignored.length
				? `Esta fonte não tem ${filterNouns(ignored)}: ${ignored.length > 1 ? 'esses filtros não se aplicam' : 'o filtro não se aplica'} a esta seção.`
				: null,
			requestedYear !== null && fixedPeriod
				? `O filtro de ano não se aplica a esta seção, que mostra ${fixedPeriod}.`
				: null,
			requestedYear !== null && shownYear !== undefined && requestedYear !== shownYear
				? `Esta fonte não tem ${requestedYear}; a seção mostra ${shownYear}.`
				: null
		].filter((note) => note !== null)
	);
</script>

{#if notes.length}
	<div class="scope" role="note">
		<Icon name="info" />
		<div>
			{#each notes as note (note)}<p>{note}</p>{/each}
		</div>
	</div>
{/if}

<style>
	.scope {
		display: flex;
		gap: var(--space-2);
		align-items: baseline;
		max-inline-size: var(--measure);
		padding: var(--space-2) var(--space-3);
		border-inline-start: 2px solid var(--rule-strong);
		color: var(--ink-2);
		font-size: var(--text-sm);
	}
</style>
