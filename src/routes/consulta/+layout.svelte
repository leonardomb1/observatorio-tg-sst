<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { MediaQuery } from 'svelte/reactivity';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const wide = new MediaQuery('(min-width: 60rem)', true);
	const updated = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
	const current = $derived(page.params.id ?? null);
</script>

<div class="shell">
	<aside class="sidebar" aria-label="Conversas">
		<a class="new" href={resolve('/consulta')} aria-current={current ? undefined : 'page'}>
			<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
			Nova conversa
		</a>
		{#if data.conversations.length > 0}
			<details open={wide.current}>
				<summary>Suas conversas</summary>
				<ul>
					{#each data.conversations as conversation (conversation.id)}
						<li>
							<a
								href={resolve('/consulta/[id]', { id: conversation.id })}
								aria-current={conversation.id === current ? 'page' : undefined}
							>
								<span class="title">{conversation.title ?? 'Conversa sem pergunta'}</span>
								<time datetime={conversation.updatedAt.toISOString()}
									>{updated.format(conversation.updatedAt)}</time
								>
							</a>
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	</aside>

	<div class="pane">{@render children()}</div>
</div>

<style>
	.shell {
		display: grid;
		gap: var(--space-5) var(--space-7);
	}

	@media (width >= 60rem) {
		.shell {
			grid-template-columns: 15rem minmax(0, 1fr);
			align-items: start;
		}

		.sidebar {
			position: sticky;
			inset-block-start: var(--space-8);
		}
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		font-size: var(--text-sm);
	}

	.new {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--rule-strong);
		border-radius: var(--radius);
		color: var(--ink);
		text-decoration: none;
	}

	.new:hover,
	.new[aria-current] {
		border-color: var(--ink);
	}

	.new svg {
		inline-size: 0.9rem;
		block-size: 0.9rem;
		fill: none;
		stroke: currentcolor;
		stroke-width: 1.75;
		stroke-linecap: round;
	}

	summary {
		margin-block-end: var(--space-2);
		color: var(--ink-2);
		font-size: var(--text-xs);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		max-block-size: 60vh;
		padding: 0;
		overflow-y: auto;
		list-style: none;
	}

	li a {
		display: flex;
		gap: var(--space-2);
		align-items: baseline;
		justify-content: space-between;
		padding: var(--space-2);
		border-radius: var(--radius);
		color: var(--ink-2);
		text-decoration: none;
	}

	li a:hover {
		background: var(--surface);
		color: var(--ink);
	}

	li a[aria-current] {
		background: var(--surface);
		color: var(--ink);
	}

	.title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	time {
		flex: none;
		color: var(--ink-3);
		font-size: var(--text-xs);
	}

	.pane {
		min-inline-size: 0;
	}
</style>
