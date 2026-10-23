<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const updated = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
</script>

<svelte:head>
	<title>Consulta em linguagem natural — Observatório SST</title>
	<meta
		name="description"
		content="Pergunte em português sobre acidentes de trabalho no Brasil e receba a resposta com o SQL, a tabela e as fontes usadas."
	/>
</svelte:head>

<div class="l-stack page">
	<header class="l-stack">
		<h1>Consulta</h1>
		<p class="lead">
			Pergunte em português sobre acidentes e doenças do trabalho no Brasil. O assistente consulta o
			mesmo banco dos painéis e as normas regulamentadoras, e mostra como chegou a cada número.
		</p>
	</header>

	{#if !data.configured}
		<p>O assistente ainda não está configurado neste servidor.</p>
	{:else}
		<section class="l-stack">
			<div class="bar">
				<form method="POST" action="?/nova" use:enhance>
					<Button type="submit" variant="primary">Nova consulta</Button>
				</form>
				<span class="quota">{data.remaining} de {data.dailyQuestions} perguntas restantes hoje</span
				>
			</div>

			{#if data.conversations.length > 0}
				<h2>Suas consultas</h2>
				<ul class="list">
					{#each data.conversations as conversation (conversation.id)}
						<li>
							<a href={resolve('/consulta/[id]', { id: conversation.id })}>
								{conversation.title ?? 'Consulta sem pergunta'}
							</a>
							<time datetime={conversation.updatedAt.toISOString()}>
								{updated.format(conversation.updatedAt)}
							</time>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>

<style>
	.page {
		--stack-gap: var(--space-6);
	}

	.lead {
		max-inline-size: var(--measure);
		font-size: var(--text-lg);
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3) var(--space-5);
		align-items: center;
	}

	.quota,
	time {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	h2 {
		font-size: var(--text-lg);
	}

	.list {
		padding: 0;
		list-style: none;
	}

	.list li {
		display: flex;
		gap: var(--space-4);
		align-items: baseline;
		justify-content: space-between;
		padding-block: var(--space-2);
		border-block-end: var(--border);
	}
</style>
