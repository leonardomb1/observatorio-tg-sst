<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport } from 'ai';
	import { untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { ConsultaMessage } from '#lib/consulta.ts';
	import Message from './Message.svelte';

	interface Props {
		/** Null until the first question creates the conversation. */
		id: string | null;
		title: string | null;
		initial: ConsultaMessage[];
		remaining: number;
		configured: boolean;
		publishedUntil: { year: number; month: number };
	}

	let { id, title, initial, remaining, configured, publishedUntil }: Props = $props();

	const SUGGESTIONS = [
		'Qual estado teve a maior taxa de óbitos no último ano consolidado?',
		'Como evoluiu a taxa de acidentes no Brasil nos anos consolidados?',
		'Quais atividades econômicas têm mais óbitos por 100 mil vínculos?',
		'O que a NR-35 exige para trabalho em altura?'
	];
	const MAX_FIELD_PX = 240;
	const STUCK_PX = 160;

	let conversationId = $state(untrack(() => id));
	let draft = $state('');
	let starting = $state(false);
	let stuck = $state(true);

	const chat = new Chat<ConsultaMessage>({
		messages: untrack(() => initial),
		transport: new DefaultChatTransport({
			prepareSendMessagesRequest: ({ messages, body }) => ({
				api: `/consulta/${conversationId ?? ''}/mensagens`,
				body: { ...body, message: messages.at(-1) }
			})
		}),
		onFinish: () => {
			void invalidate('consulta:conversas');
		}
	});

	const busy = $derived(starting || chat.status === 'submitted' || chat.status === 'streaming');
	const empty = $derived(chat.messages.length === 0);
	const problem = $derived(chat.error ? readable(chat.error.message) : null);
	const heading = $derived(
		title ??
			chat.messages
				.find((message) => message.role === 'user')
				?.parts.find((part) => part.type === 'text')?.text ??
			null
	);

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

	async function ask(text: string) {
		const question = text.trim();
		if (!question || busy || remaining <= 0) return;
		draft = '';
		if (!conversationId) {
			starting = true;
			const response = await fetch(resolve('/consulta/conversas'), { method: 'POST' });
			starting = false;
			if (!response.ok) {
				draft = question;
				return;
			}
			const created = (await response.json()) as { id: string };
			conversationId = created.id;
			await goto(resolve('/consulta/[id]', { id: created.id }), {
				state: {},
				shallow: true,
				replace: true
			});
		}
		stuck = true;
		await chat.sendMessage({ text: question });
	}

	/** Replaces a question and everything after it, then asks it again. */
	async function rewrite(message: ConsultaMessage, text: string) {
		const keep = chat.messages.findIndex((each) => each.id === message.id);
		if (keep < 0 || busy || remaining <= 0) return;
		stuck = true;
		await chat.sendMessage({ text, messageId: message.id }, { body: { keep } });
	}

	function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		void ask(draft);
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
			event.preventDefault();
			void ask(draft);
		}
	}

	function toEnd(behavior: ScrollBehavior) {
		window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
	}

	/** Grows the field with its content up to a cap, and shrinks it back once sent. */
	const fit: Attachment<HTMLTextAreaElement> = (field) => {
		$effect(() => {
			field.style.blockSize = draft ? 'auto' : '';
			field.style.blockSize = `${Math.min(field.scrollHeight, MAX_FIELD_PX)}px`;
		});
	};

	/**
	 * Keeps the newest text in view while an answer streams, unless the reader
	 * scrolled up to read something earlier.
	 */
	const follow: Attachment<HTMLElement> = (list) => {
		const onScroll = () => {
			stuck =
				window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - STUCK_PX;
		};
		const grow = new ResizeObserver(() => {
			if (stuck) toEnd('instant');
		});
		grow.observe(list);
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			grow.disconnect();
			window.removeEventListener('scroll', onScroll);
		};
	};
</script>

<div class="conversation" class:empty>
	{#if empty}
		<header class="greeting">
			<h1>O que você quer saber sobre acidentes de trabalho?</h1>
			<p>
				As respostas vêm dos dados do observatório e das normas regulamentadoras, com os dados e as
				fontes de cada número.
			</p>
		</header>
	{:else}
		<h1 class="visually-hidden">{heading}</h1>
	{/if}

	<ol class="messages" aria-live="polite" aria-busy={busy} {@attach follow}>
		{#each chat.messages as message, index (message.id)}
			<li class={message.role}>
				<Message
					{message}
					{publishedUntil}
					streaming={chat.status === 'streaming' && index === chat.messages.length - 1}
					onrewrite={message.role === 'user' && !busy && remaining > 0
						? (text) => {
								void rewrite(message, text);
							}
						: undefined}
				/>
			</li>
		{/each}
		{#if chat.status === 'submitted' || starting}
			<li class="assistant waiting">Lendo a pergunta…</li>
		{/if}
	</ol>

	{#if problem}<p class="problem" role="alert">{problem}</p>{/if}

	{#if configured}
		<form class="composer" {onsubmit}>
			{#if !stuck && !empty}
				<button
					type="button"
					class="jump"
					onclick={() => {
						toEnd('smooth');
					}}
				>
					<span class="visually-hidden">Ir para o fim da conversa</span>
					<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" /></svg
					>
				</button>
			{/if}
			<div class="field">
				<label for="pergunta" class="visually-hidden">Pergunta</label>
				<textarea
					id="pergunta"
					bind:value={draft}
					{onkeydown}
					{@attach fit}
					rows="1"
					maxlength="4000"
					placeholder={remaining > 0
						? 'Pergunte sobre acidentes de trabalho ou normas regulamentadoras'
						: 'Limite diário atingido'}
					disabled={remaining <= 0}></textarea>
				{#if busy}
					<button
						type="button"
						class="action"
						onclick={() => {
							void chat.stop();
						}}
					>
						<span class="visually-hidden">Interromper a resposta</span>
						<svg viewBox="0 0 16 16" aria-hidden="true"
							><rect x="4" y="4" width="8" height="8" /></svg
						>
					</button>
				{:else}
					<button type="submit" class="action" disabled={!draft.trim() || remaining <= 0}>
						<span class="visually-hidden">Enviar pergunta</span>
						<svg viewBox="0 0 16 16" aria-hidden="true"
							><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" /></svg
						>
					</button>
				{/if}
			</div>
			<div class="hints">
				<span
					>Respostas geradas por IA (Claude, da Anthropic); confira os dados e as fontes. <a
						href={resolve('/(institucional)/ia')}>Saiba mais</a
					></span
				>
				<span>
					{remaining > 0
						? `${remaining} ${remaining === 1 ? 'pergunta restante' : 'perguntas restantes'} hoje`
						: 'O limite volta à meia-noite'}
				</span>
			</div>
		</form>

		{#if empty}
			<ul class="suggestions" aria-label="Sugestões de pergunta">
				{#each SUGGESTIONS as suggestion (suggestion)}
					<li>
						<button
							type="button"
							disabled={remaining <= 0}
							onclick={() => {
								void ask(suggestion);
							}}>{suggestion}</button
						>
					</li>
				{/each}
			</ul>
		{/if}
	{:else}
		<p class="problem">O assistente ainda não está configurado neste servidor.</p>
	{/if}
</div>

<style>
	.conversation {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		padding-block-end: 11rem;
	}

	.conversation.empty {
		justify-content: center;
		min-block-size: calc(100dvh - 24rem);
	}

	.greeting {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		text-align: center;
	}

	.greeting h1 {
		font-size: var(--text-2xl);
		line-height: var(--leading-tight);
	}

	.greeting p {
		max-inline-size: 40rem;
		margin-inline: auto;
		color: var(--ink-2);
	}

	.messages {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		padding: 0;
		list-style: none;
	}

	.messages:empty {
		display: none;
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
		position: fixed;
		z-index: 1;
		inset-block-end: 0;
		inset-inline: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-5) var(--gutter) var(--space-4);
		background: linear-gradient(to bottom, transparent, var(--paper) var(--space-5));
	}

	.field,
	.hints {
		inline-size: min(48rem, 100%);
	}

	.jump {
		position: absolute;
		inset-block-end: calc(100% + var(--space-2));
		inset-inline-start: 50%;
		display: grid;
		place-items: center;
		inline-size: 2rem;
		block-size: 2rem;
		border: var(--border);
		border-radius: 50%;
		background: var(--surface);
		color: var(--ink);
		translate: -50% 0;
	}

	.jump svg,
	.action svg {
		inline-size: 1rem;
		block-size: 1rem;
		fill: none;
		stroke: currentcolor;
		stroke-width: 1.75;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.field {
		display: flex;
		gap: var(--space-2);
		align-items: flex-end;
		padding: var(--space-2);
		border: 1px solid var(--rule-strong);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.field:focus-within {
		border-color: var(--ink);
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}

	textarea {
		flex: 1;
		min-inline-size: 0;
		padding: var(--space-2);
		border: 0;
		background: none;
		color: var(--ink);
		font: inherit;
		line-height: var(--leading);
		resize: none;
	}

	textarea:focus-visible {
		outline: none;
	}

	.action {
		display: grid;
		flex: none;
		place-items: center;
		inline-size: 2.25rem;
		block-size: 2.25rem;
		border: 0;
		border-radius: var(--radius);
		background: var(--ink);
		color: var(--paper);
	}

	.action:disabled {
		background: var(--rule-strong);
	}

	.action rect {
		fill: currentcolor;
		stroke: none;
	}

	.hints {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-4);
		justify-content: space-between;
		color: var(--ink-2);
		font-size: var(--text-xs);
	}

	.hints a {
		color: inherit;
	}

	.suggestions {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(20rem, 100%), 1fr));
		gap: var(--space-2);
		padding: 0;
		list-style: none;
	}

	.suggestions button {
		inline-size: 100%;
		block-size: 100%;
		padding: var(--space-3) var(--space-4);
		border: var(--border);
		border-radius: var(--radius);
		background: none;
		color: var(--ink-2);
		font: inherit;
		font-size: var(--text-sm);
		text-align: start;
	}

	.suggestions button:hover:not(:disabled) {
		border-color: var(--ink);
		color: var(--ink);
	}
</style>
