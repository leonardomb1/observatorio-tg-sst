<script lang="ts">
	import type { Snippet } from 'svelte';
	import { anchorTo } from './anchor.ts';

	interface Props {
		/** Accessible name of the trigger, e.g. "Sobre este indicador". */
		label: string;
		children: Snippet;
	}

	let { label, children }: Props = $props();

	const id = $props.id();
	let trigger = $state<HTMLButtonElement>();
</script>

<button
	bind:this={trigger}
	type="button"
	class="trigger"
	aria-label={label}
	popovertarget="{id}-note"
>
	<svg viewBox="0 0 16 16" aria-hidden="true">
		<circle cx="8" cy="8" r="7" />
		<path d="M8 7v4.5M8 4.6v.1" />
	</svg>
</button>

<div id="{id}-note" class="note" popover="auto" role="note" {@attach anchorTo(() => trigger)}>
	{@render children()}
</div>

<style>
	.trigger {
		display: inline-grid;
		place-items: center;
		inline-size: 1.5rem;
		block-size: 1.5rem;
		padding: 0;
		border: 0;
		background: none;
		color: var(--ink-2);
		vertical-align: middle;
	}

	.trigger:hover {
		color: var(--ink);
	}

	svg {
		inline-size: 1rem;
		block-size: 1rem;
		fill: none;
		stroke: currentcolor;
		stroke-width: 1.4;
		stroke-linecap: round;
	}

	.note {
		position: fixed;
		inset: auto;
		max-inline-size: min(24rem, calc(100vw - 1rem));
		margin: 0;
		padding: var(--space-3) var(--space-4);
		border: var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		font-size: var(--text-sm);
		line-height: var(--leading);
	}

	.note :global(p + p) {
		margin-block-start: var(--space-2);
	}
</style>
