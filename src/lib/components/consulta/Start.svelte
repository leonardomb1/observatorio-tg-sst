<script lang="ts" module>
	interface Turnstile {
		render: (
			element: HTMLElement,
			options: {
				sitekey: string;
				theme: 'auto';
				language: string;
				callback: (token: string) => void;
				'expired-callback': () => void;
				'error-callback': () => void;
			}
		) => string;
		reset: (widget: string) => void;
		remove: (widget: string) => void;
	}

	const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
	let loading: Promise<Turnstile> | null = null;

	/** Loads Cloudflare's script once per page, only when the start step is shown. */
	function loadTurnstile(): Promise<Turnstile> {
		loading ??= new Promise((resolveScript, reject) => {
			const script = document.createElement('script');
			script.src = SCRIPT;
			script.async = true;
			script.onload = () => {
				const api = (window as unknown as { turnstile?: Turnstile }).turnstile;
				if (api) resolveScript(api);
				else reject(new Error('Turnstile indisponível'));
			};
			script.onerror = () => {
				loading = null;
				reject(new Error('Turnstile indisponível'));
			};
			document.head.append(script);
		});
		return loading;
	}
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/Button.svelte';
	import Icon from '#lib/components/Icon.svelte';

	interface Props {
		siteKey: string;
		/** Code from a scanned QR link, already filled in. */
		eventFromLink: string | null;
	}

	let { siteKey, eventFromLink }: Props = $props();

	let accepted = $state(false);
	let token = $state<string | null>(null);
	let eventCode = $state(untrack(() => eventFromLink ?? ''));
	let showEvent = $state(untrack(() => eventFromLink !== null));
	let sending = $state(false);
	let problem = $state<string | null>(null);
	let reset: (() => void) | null = null;

	const widget: Attachment<HTMLDivElement> = (element) => {
		let id: string | null = null;
		let api: Turnstile | null = null;
		loadTurnstile()
			.then((loaded) => {
				api = loaded;
				id = loaded.render(element, {
					sitekey: siteKey,
					theme: 'auto',
					language: 'pt-br',
					callback: (value) => (token = value),
					'expired-callback': () => (token = null),
					'error-callback': () => {
						token = null;
						problem = 'A verificação não carregou. Recarregue a página.';
					}
				});
				reset = () => {
					token = null;
					if (id) loaded.reset(id);
				};
			})
			.catch(() => {
				problem = 'A verificação não carregou. Verifique a conexão e recarregue a página.';
			});
		return () => {
			if (api && id) api.remove(id);
		};
	};

	async function start(event: SubmitEvent) {
		event.preventDefault();
		if (!accepted || !token || sending) return;
		sending = true;
		problem = null;
		const response = await fetch(resolve('/consulta/comecar'), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ token, accept: true, event: eventCode.trim() || undefined })
		});
		sending = false;
		if (response.ok) {
			await invalidate('consulta:conversas');
			return;
		}
		const body = (await response.json().catch(() => null)) as { message?: string } | null;
		problem = body?.message ?? 'Não foi possível começar. Tente de novo.';
		reset?.();
	}
</script>

<form class="start" onsubmit={start}>
	<h2>Antes de começar</h2>
	<ul class="points">
		<li>
			<Icon name="message-circle" />
			<span>As respostas são geradas por inteligência artificial e podem conter erros.</span>
		</li>
		<li>
			<Icon name="user" />
			<span>Não informe dados pessoais, de saúde ou de terceiros.</span>
		</li>
		<li>
			<Icon name="file" />
			<span
				>As perguntas são processadas por um fornecedor de inteligência artificial no exterior.
				Detalhes em
				<a href={resolve('/(institucional)/privacidade')}>Privacidade</a>.</span
			>
		</li>
	</ul>

	{#if showEvent}
		<label class="event">
			<span>Código do evento</span>
			<input
				bind:value={eventCode}
				maxlength="40"
				autocomplete="off"
				spellcheck="false"
				placeholder="SEMANA-FATEC-1A2B"
			/>
		</label>
	{:else}
		<button type="button" class="link" onclick={() => (showEvent = true)}
			>Tenho um código de evento</button
		>
	{/if}

	<label class="accept">
		<input type="checkbox" bind:checked={accepted} />
		<span
			>Li e aceito os <a href={resolve('/(institucional)/termos')}>Termos de uso</a> e o
			<a href={resolve('/(institucional)/privacidade')}>Aviso de privacidade</a>.</span
		>
	</label>

	<div class="verify" {@attach widget}></div>

	{#if problem}<p class="problem" role="alert">{problem}</p>{/if}

	<div class="go">
		<Button type="submit" variant="primary" disabled={!accepted || !token || sending}>
			{sending ? 'Verificando…' : 'Começar'}
		</Button>
	</div>
</form>

<style>
	.start {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-5);
		border: var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}

	h2 {
		font-size: var(--text-lg);
	}

	.points {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: 0;
		list-style: none;
	}

	.points li {
		display: flex;
		gap: var(--space-3);
		align-items: flex-start;
		color: var(--ink-2);
	}

	.points li :global(svg) {
		margin-block-start: 0.2em;
		color: var(--ink);
	}

	.event {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-size: var(--text-sm);
	}

	.event input {
		max-inline-size: 20rem;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--rule-strong);
		border-radius: var(--radius);
		background: var(--paper);
		color: var(--ink);
		font: inherit;
		text-transform: uppercase;
	}

	.link {
		align-self: flex-start;
		padding: 0;
		border: 0;
		background: none;
		color: var(--ink-2);
		font: inherit;
		font-size: var(--text-sm);
		text-decoration: underline;
	}

	.accept {
		display: flex;
		gap: var(--space-3);
		align-items: flex-start;
	}

	.accept input {
		inline-size: 1.1rem;
		block-size: 1.1rem;
		margin-block-start: 0.2em;
		accent-color: var(--ink);
	}

	.verify {
		min-block-size: 4.5rem;
	}

	.problem {
		color: var(--ink);
		font-size: var(--text-sm);
	}

	.go {
		display: flex;
		justify-content: flex-end;
	}
</style>
