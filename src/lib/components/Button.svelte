<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary' | 'danger';
		children: Snippet;
	}

	let { variant = 'secondary', type = 'button', children, ...rest }: Props = $props();
</script>

<button {type} data-variant={variant} {...rest}>{@render children()}</button>

<style>
	button {
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--ink);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		font-size: var(--text-sm);
		white-space: nowrap;
	}

	button:hover:not(:disabled) {
		background: var(--ink);
		color: var(--paper);
	}

	[data-variant='primary'] {
		background: var(--ink);
		color: var(--paper);
	}

	[data-variant='primary']:hover:not(:disabled) {
		background: var(--ink-2);
	}

	[data-variant='danger'] {
		border-color: var(--death);
		color: var(--death);
	}

	[data-variant='danger']:hover:not(:disabled) {
		background: var(--death);
		color: var(--paper);
	}
</style>
