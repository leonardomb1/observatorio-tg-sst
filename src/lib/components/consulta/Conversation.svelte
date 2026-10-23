<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport } from 'ai';
	import type { ConsultaMessage } from '#lib/consulta.ts';
	import Button from '#lib/components/Button.svelte';
	import Message from './Message.svelte';

	interface Props {
		id: string;
		initial: ConsultaMessage[];
		remaining: number;
		configured: boolean;
		publishedUntil: { year: number; month: number };
	}

	let { id, initial, remaining, configured, publishedUntil }: Props = $props();

	const chat = $derived(
		new Chat<ConsultaMessage>({
			id,
			messages: initial,
			transport: new DefaultChatTransport({
				api: `/consulta/${id}/mensagens`,
				prepareSendMessagesRequest: ({ messages }) => ({ body: { message: messages.at(-1) } })
			})
		})
	);

	let draft = $state('');
	let sent = $state(0);
	const busy = $derived(chat.status === 'submitted' || chat.status === 'streaming');
	const left = $derived(remaining - sent);
	const problem = $derived(chat.error ? readable(chat.error.message) : null);

	/** Endpoint refusals arrive as the JSON body; stream failures as plain text. */
	function readable(raw: string): string {
		try {
			const parsed: unknown = JSON.parse(raw);
			if (parsed && typeof parsed === 'object' && 'message' in parsed)
				return String(parsed.message);
		} catch {
			return raw;
		}
		return raw;
	}

	function send(event?: SubmitEvent) {
		event?.preventDefault();
		const text = draft.trim();
		if (!text || busy || left <= 0) return;
		draft = '';
		sent += 1;
		void chat.sendMessage({ text });
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) send();
	}
</script>

<div class="conversation">
	<ol class="messages" aria-live="polite" aria-busy={busy}>
		{#each chat.messages as message (message.id)}
			<li class={message.role}><Message {message} {publishedUntil} /></li>
		{/each}
		{#if chat.status === 'submitted'}
			<li class="assistant waiting">Lendo a pergunta…</li>
		{/if}
	</ol>

	{#if problem}<p class="problem" role="alert">{problem}</p>{/if}

	{#if configured}
		<form class="composer" onsubmit={send}>
			<label for="pergunta" class="visually-hidden">Pergunta</label>
			<textarea
				id="pergunta"
				bind:value={draft}
				{onkeydown}
				rows="3"
				maxlength="4000"
				placeholder="Ex.: Qual estado teve a maior taxa de óbitos em 2023?"
				disabled={left <= 0}></textarea>
			<div class="actions">
				<span class="quota">
					{left > 0
						? `${left} ${left === 1 ? 'pergunta restante' : 'perguntas restantes'} hoje`
						: 'Limite diário atingido'}
				</span>
				{#if busy}
					<Button onclick={() => chat.stop()}>Interromper</Button>
				{:else}
					<Button type="submit" variant="primary" disabled={!draft.trim() || left <= 0}>
						Perguntar
					</Button>
				{/if}
			</div>
		</form>
	{:else}
		<p class="problem">O assistente ainda não está configurado neste servidor.</p>
	{/if}
</div>

<style>
	.conversation {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.messages {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		padding: 0;
		list-style: none;
	}

	.messages > li {
		display: flex;
		flex-direction: column;
	}

	.waiting {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.problem {
		color: var(--ink-2);
	}

	.composer {
		position: sticky;
		inset-block-end: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding-block: var(--space-3);
		border-block-start: var(--border);
		background: var(--paper);
	}

	textarea {
		inline-size: 100%;
		padding: var(--space-3);
		border: 1px solid var(--rule-strong);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		font: inherit;
		resize: vertical;
	}

	textarea:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}

	.actions {
		display: flex;
		gap: var(--space-4);
		align-items: center;
		justify-content: space-between;
	}

	.quota {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}
</style>
