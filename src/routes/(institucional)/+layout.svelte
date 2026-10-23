<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<article class="text">
	{@render children()}
</article>

<style>
	.text {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		max-inline-size: var(--measure);
		line-height: var(--leading);
	}

	.text :global(h1) {
		font-size: var(--text-3xl);
		line-height: var(--leading-tight);
	}

	.text :global(h2) {
		margin-block-start: var(--space-5);
		font-size: var(--text-xl);
	}

	.text :global(.updated) {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.text :global(ul) {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding-inline-start: var(--space-5);
	}

	.text :global(table) {
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	.text :global(th),
	.text :global(td) {
		padding: var(--space-2) var(--space-3) var(--space-2) 0;
		border-block-end: var(--border);
		text-align: start;
		vertical-align: top;
	}
</style>
