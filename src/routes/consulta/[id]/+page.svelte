<script lang="ts">
	import { resolve } from '$app/paths';
	import Conversation from '#lib/components/consulta/Conversation.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.title ?? 'Nova consulta'} — Observatório SST</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="l-stack page">
	<header class="l-stack">
		<a href={resolve('/consulta')} class="back">← Consultas</a>
		<h1>{data.title ?? 'Nova consulta'}</h1>
	</header>

	<Conversation
		id={data.id}
		initial={data.messages}
		remaining={data.remaining}
		configured={data.configured}
		publishedUntil={data.publishedUntil}
	/>
</div>

<style>
	.page {
		--stack-gap: var(--space-6);
	}

	.back {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	h1 {
		font-size: var(--text-2xl);
	}
</style>
