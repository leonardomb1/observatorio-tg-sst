<script lang="ts">
	import Conversation from '#lib/components/consulta/Conversation.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Consulta — Observatório SST</title>
	<meta
		name="description"
		content="Pergunte em português sobre acidentes de trabalho no Brasil e receba a resposta com o SQL, a tabela e as fontes usadas."
	/>
</svelte:head>

<Conversation
	id={null}
	title={null}
	initial={[]}
	remaining={data.remaining}
	configured={data.configured}
	publishedUntil={data.publishedUntil}
/>
