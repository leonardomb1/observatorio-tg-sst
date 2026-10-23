<script lang="ts">
	import type { Snippet } from 'svelte';
	import { reveal } from '#lib/viewport.ts';

	interface Props {
		/** Anchor of the section; it is also what the header scroll-spy reports. */
		id: string;
		/** Short name shown above the title, matching the header link. */
		kicker: string;
		title: string;
		lede?: Snippet;
		children: Snippet;
	}

	let { id, kicker, title, lede, children }: Props = $props();
</script>

<section {id} data-section={id} class="l-stack story-section" aria-labelledby="{id}-title">
	<header class="l-stack intro" {@attach reveal}>
		<p class="kicker">{kicker}</p>
		<h2 id="{id}-title">{title}</h2>
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

	.kicker {
		color: var(--ink-2);
		font-size: var(--text-sm);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}
</style>
