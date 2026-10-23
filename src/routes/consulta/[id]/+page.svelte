<script lang="ts">
	import Conversation from '#lib/components/consulta/Conversation.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.title ?? 'Consulta'} — Observatório SST</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#key data.id}
	<Conversation
		id={data.id}
		title={data.title}
		initial={data.messages}
		remaining={data.remaining}
		configured={data.configured}
		publishedUntil={data.publishedUntil}
		started={data.started}
		event={data.event}
		paused={data.paused}
		siteKey={data.turnstileSiteKey}
	/>
{/key}
