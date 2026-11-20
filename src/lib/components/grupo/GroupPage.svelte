<script lang="ts">
	import type { Snippet } from 'svelte';
	import { DIMENSION_KEYS } from '#lib/filters.ts';
	import type { Group } from '#lib/topics.ts';
	import Icon from '../Icon.svelte';
	import FilterBar from './FilterBar.svelte';

	interface Props {
		group: Group;
		/** Years any section has, newest first; empty hides the year filter. */
		years: readonly number[];
		children: Snippet;
	}

	let { group, years, children }: Props = $props();

	const dims = $derived(
		DIMENSION_KEYS.filter((key) => group.sections.some((section) => section.dims.includes(key)))
	);
</script>

<svelte:head>
	<title>{group.title} — Observatório SST</title>
	<meta name="description" content={group.summary} />
</svelte:head>

<div class="l-stack group">
	<header class="l-stack intro">
		<h1><span class="mark"><Icon name={group.icon} /></span>{group.title}</h1>
		<p class="lede">{group.summary}</p>
		<nav aria-label="Seções de {group.title}">
			<ul class="index">
				{#each group.sections as section (section.id)}
					<li><a href="#{section.id}"><Icon name={section.icon} />{section.title}</a></li>
				{/each}
			</ul>
		</nav>
	</header>

	{#if dims.length || years.length}
		<FilterBar {dims} {years} />
	{/if}

	<div class="story" data-story>
		{@render children()}
	</div>
</div>

<style>
	.group {
		--stack-gap: var(--space-5);
	}

	.intro {
		--stack-gap: var(--space-3);
	}

	h1 {
		display: flex;
		gap: var(--space-3);
		align-items: center;
	}

	.mark {
		display: grid;
		flex: none;
		place-items: center;
		inline-size: 2.5rem;
		block-size: 2.5rem;
		border: var(--border);
		border-radius: var(--radius);
		color: var(--ink-2);
		font-size: var(--text-lg);
	}

	.lede {
		max-inline-size: var(--measure);
		color: var(--ink-2);
	}

	.index {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}

	.index a {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
		color: var(--ink-2);
	}

	.index a:hover {
		color: var(--ink);
	}
</style>
