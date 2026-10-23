<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { collectionLabel, documentStatusLabel, formatDateTime } from '#lib/admin.ts';
	import Button from '#lib/components/Button.svelte';
	import FileDrop from '#lib/components/FileDrop.svelte';
	import { formatInteger } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let sending = $state(false);
	let isNr = $state(false);
	let title = $state('');
	let collection = $state('normas');
	let importing = $state(false);

	const groups = $derived(
		Object.entries(Object.groupBy(data.documents, (document) => document.collection)).toSorted(
			([a], [b]) => a.localeCompare(b)
		)
	);
</script>

<svelte:head><title>Documentos — Administração</title></svelte:head>

<section class="l-stack">
	<h1>Documentos</h1>
	<p>
		Textos que o assistente consulta. Cada envio vira uma nova versão; a anterior continua
		pesquisável até a nova ficar pronta.
	</p>

	{#each groups as [collection, documents] (collection)}
		<h2>{collectionLabel[collection] ?? collection}</h2>
		<table>
			<thead>
				<tr>
					<th>Título</th>
					<th>Situação</th>
					<th data-numeric>Trechos</th>
					<th>Citável</th>
					<th>Atualizado</th>
				</tr>
			</thead>
			<tbody>
				{#each documents ?? [] as document (document.id)}
					<tr>
						<td
							><a href={resolve('/admin/documentos/[id]', { id: document.id })}>{document.title}</a
							></td
						>
						<td>
							{document.pendingJob
								? `Processando (${document.pendingJob})`
								: documentStatusLabel[document.status]}
						</td>
						<td data-numeric>{formatInteger(document.chunkCount)}</td>
						<td>{document.citable ? 'Sim' : 'Não'}</td>
						<td>{formatDateTime(document.updatedAt)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p class="empty">Nenhum documento ainda.</p>
	{/each}
</section>

<section class="l-stack upload">
	<h2>Importar NR do gov.br</h2>
	<p class="note">
		Cole o endereço do PDF oficial da norma no gov.br. O arquivo é baixado, guardado e dividido por
		item.
	</p>
	<form
		method="POST"
		action="?/importar"
		class="l-stack"
		use:enhance={() => {
			importing = true;
			return async ({ update }) => {
				await update({ reset: false });
				importing = false;
			};
		}}
	>
		<div class="l-cluster import">
			<label class="field grow">
				<span>Endereço do PDF</span>
				<input
					name="url"
					type="url"
					required
					placeholder="https://www.gov.br/trabalho-e-emprego/…/NR35atualizada2023.pdf"
				/>
			</label>
			<label class="field">
				<span>NR</span>
				<input name="nr" type="number" min="1" max="40" required class="short" />
			</label>
			<Button type="submit" variant="primary" disabled={importing}
				>{importing ? 'Importando…' : 'Importar'}</Button
			>
		</div>
		{#if form?.importError}<p class="error" role="alert">{form.importError}</p>{/if}
	</form>
</section>

<section class="l-stack upload">
	<h2>Enviar documento</h2>
	<form
		method="POST"
		action="?/enviar"
		enctype="multipart/form-data"
		class="l-stack"
		use:enhance={() => {
			sending = true;
			return async ({ update }) => {
				await update({ reset: false });
				sending = false;
			};
		}}
	>
		<FileDrop
			name="arquivo"
			label="Arquivo"
			accept=".pdf,.md,.markdown,.txt"
			hint="PDF (com OCR nas páginas digitalizadas), Markdown ou texto. Até 50 MB."
			required
			onselect={(file) => {
				if (file && !title) title = file.name.replace(/\.[^.]+$/, '');
			}}
		/>

		<label class="field">
			<span>Título</span>
			<input name="title" bind:value={title} required minlength="3" />
		</label>

		<label class="field">
			<span>Identificador (opcional)</span>
			<input name="slug" placeholder="gerado a partir do título" />
		</label>

		<fieldset class="l-cluster">
			<legend>Coleção</legend>
			{#each Object.entries(collectionLabel) as [value, label] (value)}
				<label class="l-cluster option">
					<input type="radio" name="collection" {value} bind:group={collection} />
					{label}
				</label>
			{/each}
		</fieldset>

		<div class="l-cluster">
			<label class="l-cluster option">
				<input type="checkbox" bind:checked={isNr} /> É o texto oficial de uma NR
			</label>
			{#if isNr}
				<label class="field inline">
					<span>Número da NR</span>
					<input name="nr" type="number" min="1" max="40" required />
				</label>
			{/if}
		</div>

		<label class="field">
			<span>Endereço de origem (opcional)</span>
			<input name="sourceUrl" type="url" placeholder="https://www.gov.br/…" />
		</label>

		{#if collection === 'tese'}
			<p class="note">
				Documentos do Trabalho de Graduação entram como não citáveis. Libere a citação na página do
				documento quando for o momento.
			</p>
		{:else}
			<label class="l-cluster option">
				<input type="checkbox" name="citable" checked /> O assistente pode citar este documento
			</label>
		{/if}

		{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}

		<div>
			<Button type="submit" variant="primary" disabled={sending}
				>{sending ? 'Enviando…' : 'Enviar'}</Button
			>
		</div>
	</form>
</section>

<style>
	.upload {
		max-inline-size: 40rem;
		padding-block-start: var(--space-5);
		border-block-start: var(--border);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-size: var(--text-sm);
	}

	.field.inline {
		flex-direction: row;
		align-items: center;
		gap: var(--space-2);
	}

	.field span,
	legend {
		color: var(--ink-2);
		font-size: var(--text-xs);
	}

	input:not([type='checkbox'], [type='radio']) {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--rule-strong);
		border-radius: var(--radius);
		background: var(--surface);
	}

	fieldset {
		border: 0;
		padding: 0;
	}

	.option {
		--cluster-gap: var(--space-2);

		font-size: var(--text-sm);
	}

	.error {
		color: var(--death);
	}

	.note {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.import {
		align-items: end;
	}

	.grow {
		flex: 1;
		min-inline-size: 16rem;
	}

	.short {
		inline-size: 5rem;
	}

	.empty {
		color: var(--ink-2);
	}
</style>
