<script lang="ts">
	import { enhance } from '$app/forms';
	import { refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		collectionLabel,
		documentStatusLabel,
		formatDateTime,
		jobStateLabel
	} from '#lib/admin.ts';
	import Button from '#lib/components/Button.svelte';
	import Dialog from '#lib/components/Dialog.svelte';
	import { getToaster } from '#lib/components/toast.svelte.ts';
	import { formatInteger } from '#lib/format.ts';
	import type { SubmitFunction } from '$app/forms';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const toaster = getToaster();
	let confirmDelete = $state(false);
	let filter = $state('');

	const busy = $derived(data.jobs.some((job) => job.state === 'queued' || job.state === 'running'));
	const embedded = $derived(data.chunks.filter((chunk) => chunk.embedded).length);
	const visibleChunks = $derived.by(() => {
		const needle = filter.trim().toLowerCase();
		if (!needle) return data.chunks;
		return data.chunks.filter((chunk) =>
			`${chunk.itemCode ?? ''} ${chunk.trail} ${chunk.blocks.join(' ')}`
				.toLowerCase()
				.includes(needle)
		);
	});

	$effect(() => {
		if (!busy) return;
		const timer = setInterval(() => void refreshAll(), 3000);
		return () => {
			clearInterval(timer);
		};
	});

	const notify: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update();
			if (result.type === 'success' && typeof result.data?.message === 'string') {
				toaster.show(result.data.message);
			} else if (result.type === 'failure') {
				toaster.show(String(result.data?.message ?? 'Não foi possível concluir.'), 'error');
			}
		};
	};
</script>

<svelte:head><title>{data.document.title} — Administração</title></svelte:head>

<article class="l-stack detail">
	<header class="l-stack head">
		<a href={resolve('/admin/documentos')} class="back">← Documentos</a>
		<h1>{data.document.title}</h1>
		<p class="meta">
			{collectionLabel[data.document.collection] ?? data.document.collection} ·
			<code>{data.document.slug}</code> · {documentStatusLabel[data.document.status]} ·
			{data.document.citable ? 'citável pelo assistente' : 'não citável'}
			{#if data.document.sourceUrl}
				· <a href={data.document.sourceUrl} rel="external">origem</a>
			{/if}
		</p>
	</header>

	<div class="l-cluster actions">
		<form method="POST" action="?/reprocessar" use:enhance={notify}>
			<Button type="submit" disabled={busy}>Reprocessar</Button>
		</form>
		<form method="POST" action="?/revetorizar" use:enhance={notify}>
			<Button type="submit" disabled={busy}>Vetorizar pendentes</Button>
		</form>
		<form method="POST" action="?/citavel" use:enhance={notify}>
			<input type="hidden" name="citable" value={String(!data.document.citable)} />
			<Button type="submit"
				>{data.document.citable ? 'Retirar das citações' : 'Permitir citação'}</Button
			>
		</form>
		<form method="POST" action="?/arquivar" use:enhance={notify}>
			<input type="hidden" name="archive" value={String(data.document.status !== 'archived')} />
			<Button type="submit">{data.document.status === 'archived' ? 'Restaurar' : 'Arquivar'}</Button
			>
		</form>
		<Button variant="danger" onclick={() => (confirmDelete = true)}>Excluir</Button>
	</div>

	<section class="l-stack">
		<h2>Versões</h2>
		<table>
			<thead>
				<tr>
					<th>Versão</th>
					<th>Arquivo</th>
					<th data-numeric>Páginas</th>
					<th data-numeric>OCR</th>
					<th>Situação</th>
					<th>Enviada</th>
				</tr>
			</thead>
			<tbody>
				{#each data.versions as version (version.id)}
					<tr>
						<td>
							{version.version}{version.id === data.document.currentVersionId ? ' (publicada)' : ''}
						</td>
						<td>
							<a
								href={resolve('/admin/documentos/[id]/original/[version]', {
									id: data.document.id,
									version: version.id
								})}>{version.filename}</a
							>
						</td>
						<td data-numeric>{formatInteger(version.pageCount)}</td>
						<td data-numeric>{formatInteger(version.ocrPages)}</td>
						<td>
							{documentStatusLabel[version.status]}
							{#if version.error}<p class="error">{version.error}</p>{/if}
						</td>
						<td>{formatDateTime(version.createdAt)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>

	<section class="l-stack">
		<h2>Tarefas recentes</h2>
		<table>
			<thead>
				<tr
					><th>Tipo</th><th>Situação</th><th>Etapa</th><th data-numeric>Progresso</th><th>Erro</th
					></tr
				>
			</thead>
			<tbody>
				{#each data.jobs as job (job.id)}
					<tr>
						<td>{job.kind}</td>
						<td>{jobStateLabel[job.state]}</td>
						<td>{job.stage ?? '—'}</td>
						<td data-numeric
							>{job.total ? `${formatInteger(job.progress)}/${formatInteger(job.total)}` : '—'}</td
						>
						<td class="error">{job.error ?? ''}</td>
					</tr>
				{:else}
					<tr><td colspan="5">Nenhuma tarefa.</td></tr>
				{/each}
			</tbody>
		</table>
	</section>

	<section class="l-stack">
		<div class="l-cluster chunk-head">
			<h2>Trechos</h2>
			<span class="meta"
				>{formatInteger(data.chunks.length)} trechos · {formatInteger(embedded)} vetorizados</span
			>
			<label class="search">
				<span class="visually-hidden">Filtrar trechos</span>
				<input type="search" placeholder="Filtrar por item ou texto" bind:value={filter} />
			</label>
		</div>
		<ol class="chunks">
			{#each visibleChunks as chunk (chunk.id)}
				<li>
					<p class="trail">
						{#if chunk.itemCode}<strong>{chunk.itemCode}</strong> ·{/if}
						{chunk.trail}
						{#if chunk.pageStart}· p. {chunk.pageStart}{chunk.pageEnd !== chunk.pageStart
								? `–${chunk.pageEnd}`
								: ''}{/if}
						{#if !chunk.embedded}· <em>sem vetor</em>{/if}
					</p>
					{#each chunk.blocks as block, index (index)}<p class="block">{block}</p>{/each}
				</li>
			{/each}
		</ol>
	</section>
</article>

<Dialog bind:open={confirmDelete} title="Excluir documento">
	<p>
		“{data.document.title}”, todas as versões, os arquivos originais e os trechos serão apagados.
		Essa ação não pode ser desfeita.
	</p>
	{#snippet actions()}
		<Button onclick={() => (confirmDelete = false)}>Cancelar</Button>
		<form method="POST" action="?/excluir">
			<Button type="submit" variant="danger">Excluir definitivamente</Button>
		</form>
	{/snippet}
</Dialog>

<style>
	.detail {
		--stack-gap: var(--space-6);
	}

	.head {
		--stack-gap: var(--space-2);
	}

	.back,
	.meta {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.actions {
		--cluster-gap: var(--space-2);
	}

	.error {
		color: var(--death);
		font-size: var(--text-xs);
	}

	.chunk-head {
		align-items: baseline;
	}

	.search {
		margin-inline-start: auto;
	}

	.search input {
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--rule-strong);
		border-radius: var(--radius);
		background: var(--surface);
		font-size: var(--text-sm);
	}

	.chunks {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: 0;
		list-style: none;
	}

	.chunks li {
		padding: var(--space-3) var(--space-4);
		border-inline-start: 2px solid var(--rule-strong);
		background: var(--surface);
	}

	.trail {
		margin-block-end: var(--space-2);
		color: var(--ink-2);
		font-size: var(--text-xs);
	}

	.block {
		font-size: var(--text-sm);
	}

	.block + .block {
		margin-block-start: var(--space-1);
	}
</style>
