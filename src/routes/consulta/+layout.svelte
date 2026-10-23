<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { MediaQuery } from 'svelte/reactivity';
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import Dialog from '#lib/components/Dialog.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { getToaster } from '#lib/components/toast.svelte.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	type Conversation = LayoutProps['data']['conversations'][number];

	const toaster = getToaster();
	const wide = new MediaQuery('(min-width: 64rem)', true);
	const current = $derived(page.params.id ?? null);

	let renaming = $state<string | null>(null);
	let name = $state('');
	let removing = $state<Conversation | null>(null);
	let confirmOpen = $state(false);

	const focusOnMount: Attachment<HTMLInputElement> = (input) => {
		input.select();
	};

	function startRename(conversation: Conversation) {
		renaming = conversation.id;
		name = conversation.title ?? '';
	}

	async function saveRename(id: string) {
		const title = name.trim();
		renaming = null;
		if (!title) return;
		const response = await fetch(resolve('/consulta/conversas/[id]', { id }), {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ title })
		});
		if (!response.ok) toaster.show('Não foi possível renomear a conversa.', 'error');
		await invalidate('consulta:conversas');
	}

	function onRenameKey(event: KeyboardEvent, id: string) {
		if (event.key === 'Enter') void saveRename(id);
		if (event.key === 'Escape') renaming = null;
	}

	function askRemove(conversation: Conversation) {
		removing = conversation;
		confirmOpen = true;
	}

	async function remove() {
		const target = removing;
		confirmOpen = false;
		if (!target) return;
		const response = await fetch(resolve('/consulta/conversas/[id]', { id: target.id }), {
			method: 'DELETE'
		});
		if (!response.ok) {
			toaster.show('Não foi possível apagar a conversa.', 'error');
			return;
		}
		toaster.show('Conversa apagada.');
		if (target.id === current)
			await goto(resolve('/consulta'), { invalidate: ['consulta:conversas'] });
		else await invalidate('consulta:conversas');
	}
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
						<li class:active={conversation.id === current}>
							{#if renaming === conversation.id}
								<label class="visually-hidden" for="nome-{conversation.id}">Nome da conversa</label>
								<input
									id="nome-{conversation.id}"
									class="rename"
									maxlength="120"
									bind:value={name}
									onkeydown={(event) => {
										onRenameKey(event, conversation.id);
									}}
									onblur={() => {
										void saveRename(conversation.id);
									}}
									{@attach focusOnMount}
								/>
							{:else}
								<a
									href={resolve('/consulta/[id]', { id: conversation.id })}
									aria-current={conversation.id === current ? 'page' : undefined}
								>
									<span class="title">{conversation.title ?? 'Conversa sem pergunta'}</span>
								</a>
								<span class="actions">
									<button
										type="button"
										aria-label="Renomear “{conversation.title ?? 'conversa'}”"
										onclick={() => {
											startRename(conversation);
										}}><Icon name="pencil" size={0.95} /></button
									>
									<button
										type="button"
										aria-label="Apagar “{conversation.title ?? 'conversa'}”"
										onclick={() => {
											askRemove(conversation);
										}}><Icon name="trash" size={0.95} /></button
									>
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	</aside>

	<div class="pane">{@render children()}</div>
</div>

<Dialog bind:open={confirmOpen} title="Apagar conversa">
	<p>
		“{removing?.title ?? 'Conversa sem pergunta'}” e todas as respostas serão apagadas deste
		servidor. Não é possível desfazer.
	</p>
	{#snippet actions()}
		<Button onclick={() => (confirmOpen = false)}>Cancelar</Button>
		<Button
			variant="danger"
			onclick={() => {
				void remove();
			}}>Apagar</Button
		>
	{/snippet}
</Dialog>

<style>
	.shell {
		display: grid;
		gap: var(--space-5);
	}

	/* Equal side columns keep the chat centred on the page, under the fixed question box. */
	@media (width >= 64rem) {
		.shell {
			grid-template-columns: minmax(0, 1fr) minmax(0, 48rem) minmax(0, 1fr);
			gap: var(--space-6);
			align-items: start;
		}

		.sidebar {
			position: sticky;
			inset-block-start: var(--space-8);
			max-inline-size: 15rem;
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
		font-size: var(--text-sm);
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

	li {
		position: relative;
		display: flex;
		align-items: center;
		border-radius: var(--radius);
	}

	li:hover,
	li.active {
		background: var(--surface);
	}

	.actions {
		position: absolute;
		inset-block: 0;
		inset-inline-end: 0;
		display: none;
		align-items: center;
		padding-inline-start: var(--space-2);
		border-radius: var(--radius);
		background: var(--surface);
	}

	li:hover .actions,
	li:focus-within .actions {
		display: flex;
	}

	.actions button {
		display: grid;
		place-items: center;
		inline-size: 1.75rem;
		block-size: 1.75rem;
		padding: 0;
		border: 0;
		background: none;
		color: var(--ink-3);
	}

	.actions button:hover {
		color: var(--ink);
	}

	.rename {
		inline-size: 100%;
		padding: var(--space-2);
		border: 1px solid var(--ink);
		border-radius: var(--radius);
		background: var(--paper);
		color: var(--ink);
		font: inherit;
	}

	li a {
		display: block;
		flex: 1;
		min-inline-size: 0;
		padding: var(--space-2);
		border-radius: var(--radius);
		color: var(--ink-2);
		text-decoration: none;
	}

	li a:hover,
	li a[aria-current] {
		color: var(--ink);
	}

	.title {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pane {
		min-inline-size: 0;
	}
</style>
