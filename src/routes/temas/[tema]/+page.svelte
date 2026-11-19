<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '#lib/components/Icon.svelte';
	import { TOPICS } from '#lib/topics.ts';
	import Caminhoneiros from './Caminhoneiros.svelte';
	import Desigualdade from './Desigualdade.svelte';
	import Europa from './Europa.svelte';
	import Informalidade from './Informalidade.svelte';
	import MortesNoSus from './MortesNoSus.svelte';
	import NotificacoesSus from './NotificacoesSus.svelte';
	import Rotatividade from './Rotatividade.svelte';
	import SaudeMental from './SaudeMental.svelte';
	import TrabalhoEscravo from './TrabalhoEscravo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const others = $derived(TOPICS.filter((each) => each.slug !== data.topic.slug));
</script>

<svelte:head>
	<title>{data.topic.title} — Observatório SST</title>
	<meta name="description" content={data.topic.summary} />
</svelte:head>

<div class="l-stack page">
	<header class="l-stack intro">
		<a href={resolve('/temas')} class="back">← Temas</a>
		<h1><span class="mark"><Icon name={data.topic.icon} /></span>{data.topic.title}</h1>
		<p class="lede">{data.topic.summary}</p>
	</header>

	{#if data.content.slug === 'saude-mental'}
		<SaudeMental data={data.content.data} />
	{:else if data.content.slug === 'notificacoes-sus'}
		<NotificacoesSus data={data.content.data} />
	{:else if data.content.slug === 'mortes-no-sus'}
		<MortesNoSus data={data.content.data} />
	{:else if data.content.slug === 'informalidade'}
		<Informalidade data={data.content.data} />
	{:else if data.content.slug === 'desigualdade'}
		<Desigualdade data={data.content.data} />
	{:else if data.content.slug === 'caminhoneiros'}
		<Caminhoneiros data={data.content.data} />
	{:else if data.content.slug === 'rotatividade'}
		<Rotatividade data={data.content.data} />
	{:else if data.content.slug === 'europa'}
		<Europa data={data.content.data} />
	{:else}
		<TrabalhoEscravo data={data.content.data} />
	{/if}

	<nav class="l-stack others" aria-label="Outros temas">
		<h2>Outros temas</h2>
		<ul>
			{#each others as other (other.slug)}
				<li>
					<a href={resolve('/temas/[tema]', { tema: other.slug })}
						><Icon name={other.icon} />{other.title}</a
					>
				</li>
			{/each}
		</ul>
	</nav>
</div>

<style>
	.page {
		--stack-gap: var(--space-7);
	}

	.intro {
		--stack-gap: var(--space-3);
	}

	.back {
		color: var(--ink-2);
		font-size: var(--text-sm);
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

	.others {
		--stack-gap: var(--space-3);

		padding-block-start: var(--space-5);
		border-block-start: var(--border);
	}

	.others h2 {
		font-size: var(--text-base);
	}

	.others ul {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}

	.others a {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
		color: var(--ink-2);
	}

	.others a:hover {
		color: var(--ink);
	}
</style>
