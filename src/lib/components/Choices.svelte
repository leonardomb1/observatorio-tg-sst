<script lang="ts">
	import type { YearStatus } from '#lib/status.ts';

	export interface Choice {
		value: string;
		label: string;
		href: string;
		status?: YearStatus;
	}

	interface Props {
		label: string;
		choices: readonly Choice[];
		current: string;
	}

	let { label, choices, current }: Props = $props();
</script>

<nav class="choices" aria-label={label}>
	<span class="title">{label}</span>
	<ul>
		{#each choices as choice (choice.value)}
			<li>
				<!-- eslint-disable svelte/no-navigation-without-resolve -- callers pass resolved hrefs -->
				<a
					href={choice.href}
					data-sveltekit-reset="false"
					data-sveltekit-replacestate
					aria-current={choice.value === current ? 'true' : undefined}
					data-status={choice.status}>{choice.label}</a
				>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</li>
		{/each}
	</ul>
</nav>

<style>
	.choices {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-3);
		align-items: baseline;
		font-size: var(--text-sm);
	}

	.title {
		color: var(--ink-2);
	}

	ul {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		padding: 0;
		list-style: none;
	}

	a {
		display: inline-block;
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		color: var(--ink-2);
		text-decoration: none;
		font-variant-numeric: tabular-nums;
	}

	a[data-status='parcial'],
	a[data-status='provisorio'] {
		border-style: dashed;
	}

	a[aria-current='true'] {
		border-color: var(--ink);
		background: var(--ink);
		color: var(--paper);
	}
</style>
