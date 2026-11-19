<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '#lib/components/Icon.svelte';
	import { TOPICS } from '#lib/topics.ts';
</script>

<svelte:head>
	<title>Temas — Observatório SST</title>
	<meta
		name="description"
		content="Análises por tema: saúde mental, notificações e mortes no SUS, informalidade, raça e escolaridade, caminhoneiros, rotatividade, comparação com a Europa e trabalho escravo."
	/>
</svelte:head>

<div class="l-stack page">
	<header class="l-stack intro">
		<h1>Temas</h1>
		<p>
			Cada tema cruza a acidentalidade com outra fonte pública, para mostrar o que a CAT sozinha não
			mostra: quem fica fora do emprego formal, o que o sistema de saúde registra e como o Brasil se
			compara.
		</p>
	</header>

	<ul class="topics">
		{#each TOPICS as each (each.slug)}
			<li>
				<a href={resolve('/temas/[tema]', { tema: each.slug })}>
					<span class="mark"><Icon name={each.icon} /></span>
					<span class="text">
						<span class="title">{each.title}</span>
						<span class="summary">{each.summary}</span>
					</span>
				</a>
			</li>
		{/each}
	</ul>
</div>

<style>
	.page {
		--stack-gap: var(--space-6);
	}

	.intro {
		--stack-gap: var(--space-3);
	}

	.intro p {
		max-inline-size: var(--measure);
		color: var(--ink-2);
	}

	.topics {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
		gap: var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.topics a {
		display: flex;
		gap: var(--space-3);
		align-items: flex-start;
		block-size: 100%;
		padding: var(--space-4);
		border: var(--border);
		border-radius: var(--radius);
		color: var(--ink);
		text-decoration: none;
	}

	.topics a:hover {
		border-color: var(--ink);
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
	}

	.text {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.title {
		font-weight: 600;
	}

	.summary {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}
</style>
