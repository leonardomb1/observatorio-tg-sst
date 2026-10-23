<script lang="ts">
	import type { Snippet } from 'svelte';
	import { reveal } from '#lib/viewport.ts';
	import Icon, { type IconName } from './Icon.svelte';

	interface Props {
		/** Anchor of the section; it is also what the header scroll-spy reports. */
		id: string;
		/** Same icon as the section's link in the header. */
		icon: IconName;
		title: string;
		lede?: Snippet;
		children: Snippet;
	}

	let { id, icon, title, lede, children }: Props = $props();
</script>

<section {id} data-section={id} class="l-stack story-section" aria-labelledby="{id}-title">
	<header class="l-stack intro" {@attach reveal}>
		<h2 id="{id}-title"><span class="mark"><Icon name={icon} /></span>{title}</h2>
		{@render lede?.()}
	</header>
	<div class="body" {@attach reveal}>
		{@render children()}
	</div>
</section>

<style>
	.story-section {
		--stack-gap: var(--space-6);

		padding-block-start: var(--space-8);
	}

	.intro {
		--stack-gap: var(--space-3);
	}

	h2 {
		display: flex;
		gap: var(--space-3);
		align-items: center;
	}

	.mark {
		display: grid;
		flex: none;
		place-items: center;
		inline-size: 2.25rem;
		block-size: 2.25rem;
		border: var(--border);
		border-radius: var(--radius);
		color: var(--ink-2);
		font-size: var(--text-base);
	}

	.intro :global(p) {
		max-inline-size: var(--measure);
		color: var(--ink-2);
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}
</style>
