<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import StorySection from '#lib/components/StorySection.svelte';
	import Atividades from './Atividades.svelte';
	import Beneficios from './Beneficios.svelte';
	import ComoAcontece from './ComoAcontece.svelte';
	import Estados from './Estados.svelte';
	import Overview from './Overview.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const READER_INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
	const SETTLE_MS = 1000;

	/**
	 * Streamed sections grow the page after the jump to an anchor and push the
	 * target down. While they arrive, every resize of the story pins the target
	 * back in place; pinning stops once they are in, or as soon as the reader
	 * scrolls, taps or types.
	 */
	const keepAnchor: Attachment<HTMLElement> = (story) => {
		const id = untrack(() => decodeURIComponent(page.url.hash.slice(1)));
		const target = id ? document.getElementById(id) : null;
		if (!target) return;
		const pin = () => {
			target.scrollIntoView({ behavior: 'instant' });
		};
		const resize = new ResizeObserver(pin);
		let timer: ReturnType<typeof setTimeout> | undefined;
		const release = () => {
			resize.disconnect();
			clearTimeout(timer);
			for (const type of READER_INPUT) removeEventListener(type, release);
		};
		resize.observe(story);
		for (const type of READER_INPUT) addEventListener(type, release, { passive: true });
		const streamed = untrack(() => [data.causes, data.benefits]);
		void Promise.allSettled(streamed).then(() => {
			timer = setTimeout(release, SETTLE_MS);
		});
		return release;
	};
</script>

<svelte:head>
	<title>Observatório SST — acidentes de trabalho no Brasil</title>
	<meta
		name="description"
		content="Taxas de acidentes e óbitos de trabalho por 100 mil vínculos formais, por estado e atividade, como os acidentes acontecem e os benefícios concedidos."
	/>
</svelte:head>

<div class="story" data-story {@attach keepAnchor}>
	<Overview calendar={data.calendar} {...data.overview} />

	<Estados calendar={data.calendar} filters={data.filters} ufs={data.ufs} />

	<Atividades calendar={data.calendar} filters={data.filters} sectors={data.sectors} />

	<StorySection id="como-acontece" icon="triangle-alert" title="O que causa os acidentes que matam">
		{#snippet lede()}
			<p>
				Agente causador, parte do corpo e lesão nos óbitos de {data.overview.year}, o último ano
				consolidado.
			</p>
		{/snippet}
		{#await data.causes}
			<p class="pending pending-tall">Carregando a seção…</p>
		{:then causes}
			<ComoAcontece calendar={data.calendar} {causes} />
		{:catch}
			<p class="pending">Não foi possível carregar esta seção. Recarregue a página.</p>
		{/await}
	</StorySection>

	<StorySection id="beneficios" icon="wallet" title="O que o INSS paga depois do acidente">
		{#snippet lede()}
			<p>
				Benefícios que o INSS concede quando o acidente afasta por mais de 15 dias, deixa sequela ou
				mata.
			</p>
		{/snippet}
		{#await data.benefits}
			<p class="pending pending-tall">Carregando a seção…</p>
		{:then benefits}
			<Beneficios {benefits} />
		{:catch}
			<p class="pending">Não foi possível carregar esta seção. Recarregue a página.</p>
		{/await}
	</StorySection>
</div>

<style>
	.pending {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.pending-tall {
		min-block-size: 60rem;
	}
</style>
