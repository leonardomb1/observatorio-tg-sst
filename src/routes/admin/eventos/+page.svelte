<script lang="ts">
	import { enhance } from '$app/forms';
	import { EVENT_DURATIONS, formatDateTime, type EventDuration } from '#lib/admin.ts';
	import Button from '#lib/components/Button.svelte';
	import { formatInteger } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const now = Date.now();
	const durations = Object.entries(EVENT_DURATIONS) as [
		EventDuration,
		(typeof EVENT_DURATIONS)[EventDuration]
	][];

	function state(event: PageProps['data']['events'][number]): string {
		if (event.revokedAt) return 'Encerrado';
		if (event.endsAt.getTime() <= now) return 'Expirado';
		if (event.used >= event.questionPool) return 'Esgotado';
		return 'Ativo';
	}
</script>

<svelte:head><title>Eventos — Administração</title></svelte:head>

<section class="l-stack page">
	<h1>Códigos de evento</h1>
	<p class="lead">
		Um código dá a uma sala um total de perguntas para a consulta, fora do orçamento diário do site.
		Quem escaneia o QR code entra com o código já preenchido.
	</p>

	<form method="POST" action="?/criar" class="create" use:enhance>
		<label>
			<span>Nome do evento</span>
			<input
				class="field"
				name="label"
				required
				maxlength="80"
				placeholder="Semana de Tecnologia Fatec"
			/>
		</label>
		<label>
			<span>Código (opcional)</span>
			<input class="field" name="code" maxlength="32" placeholder="Gerado a partir do nome" />
		</label>
		<fieldset>
			<legend>Válido por</legend>
			<div class="choices">
				{#each durations as [value, duration] (value)}
					<label class="choice">
						<input class="radio" type="radio" name="duration" {value} checked={value === '8h'} />
						<span>{duration.label}</span>
					</label>
				{/each}
			</div>
		</fieldset>
		<label>
			<span>Total de perguntas</span>
			<input
				class="field"
				name="pool"
				type="number"
				inputmode="numeric"
				min="1"
				value="500"
				required
			/>
		</label>
		<label>
			<span>Por pessoa</span>
			<input
				class="field"
				name="perVisitor"
				type="number"
				inputmode="numeric"
				min="1"
				value="20"
				required
			/>
		</label>
		<div class="submit">
			<Button type="submit" variant="primary">Criar código</Button>
			{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
			{#if form?.created}<p role="status">Código {form.created} criado.</p>{/if}
		</div>
	</form>

	{#if data.events.length === 0}
		<p class="empty">Nenhum código criado ainda.</p>
	{:else}
		<ul class="events">
			{#each data.events as event (event.code)}
				<li>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- SVG generated on the server from our own link -->
					<div class="qr" aria-hidden="true">{@html event.qr}</div>
					<div class="info">
						<h2>{event.label}</h2>
						<p class="code">{event.code}</p>
						<p>
							{state(event)} · {formatInteger(event.used)} de {formatInteger(event.questionPool)} perguntas
							· até {formatInteger(event.perVisitor)} por pessoa
						</p>
						<p class="meta">
							{formatDateTime(event.startsAt)} a {formatDateTime(event.endsAt)}
						</p>
						<p class="meta link">{event.link}</p>
						{#if state(event) === 'Ativo'}
							<form method="POST" action="?/encerrar" use:enhance>
								<input type="hidden" name="code" value={event.code} />
								<Button type="submit" variant="danger">Encerrar agora</Button>
							</form>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.page {
		--stack-gap: var(--space-5);
	}

	.lead {
		max-inline-size: var(--measure);
		color: var(--ink-2);
	}

	.create {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: var(--space-4);
		padding: var(--space-4);
		border: var(--border);
		border-radius: var(--radius);
	}

	.create label,
	fieldset {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-size: var(--text-sm);
	}

	fieldset {
		grid-column: 1 / -1;
		padding: 0;
		margin: 0;
		border: 0;
	}

	legend {
		margin-block-end: var(--space-1);
	}

	.field {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--rule-strong);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		font: inherit;
	}

	.choices {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.choice {
		flex-direction: row;
	}

	.radio {
		position: absolute;
		opacity: 0;
	}

	.choice span {
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--rule-strong);
		border-radius: var(--radius);
		cursor: pointer;
	}

	.radio:checked + span {
		border-color: var(--ink);
		background: var(--ink);
		color: var(--paper);
	}

	.radio:focus-visible + span {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}

	.submit {
		display: flex;
		grid-column: 1 / -1;
		gap: var(--space-4);
		align-items: center;
	}

	.error {
		color: var(--ink);
	}

	.empty,
	.meta {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.events {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: 0;
		list-style: none;
	}

	.events li {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-5);
		padding-block: var(--space-4);
		border-block-start: var(--border);
	}

	.qr {
		flex: none;
		inline-size: 9rem;
		padding: var(--space-2);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.qr :global(svg) {
		display: block;
		inline-size: 100%;
		block-size: auto;
	}

	.info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.info h2 {
		font-size: var(--text-lg);
	}

	.code {
		font-size: var(--text-xl);
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	.link {
		overflow-wrap: anywhere;
	}
</style>
