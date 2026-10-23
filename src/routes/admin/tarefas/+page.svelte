<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { formatDateTime, jobStateLabel } from '#lib/admin.ts';
	import Button from '#lib/components/Button.svelte';
	import { formatInteger } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Tarefas — Administração</title></svelte:head>

<section class="l-stack">
	<div class="l-cluster head">
		<h1>Tarefas</h1>
		<form method="POST" action="?/limpar" use:enhance>
			<Button type="submit">Remover concluídas</Button>
		</form>
	</div>

	<table>
		<thead>
			<tr>
				<th>Documento</th>
				<th>Tipo</th>
				<th>Situação</th>
				<th data-numeric>Progresso</th>
				<th data-numeric>Tentativas</th>
				<th data-numeric>Tokens Voyage</th>
				<th>Criada</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each data.jobs as job (job.id)}
				<tr>
					<td>
						{#if job.documentId}
							<a href={resolve('/admin/documentos/[id]', { id: job.documentId })}>{job.title}</a>
						{:else}—{/if}
						{#if job.error}<p class="error">{job.error}</p>{/if}
					</td>
					<td>{job.kind}</td>
					<td>{jobStateLabel[job.state]}{job.stage ? ` · ${job.stage}` : ''}</td>
					<td data-numeric
						>{job.total ? `${formatInteger(job.progress)}/${formatInteger(job.total)}` : '—'}</td
					>
					<td data-numeric>{formatInteger(job.attempts)}</td>
					<td data-numeric>{formatInteger(job.usageTokens)}</td>
					<td>{formatDateTime(job.createdAt)}</td>
					<td>
						{#if job.state === 'failed' || job.state === 'cancelled'}
							<form method="POST" action="?/repetir" use:enhance>
								<input type="hidden" name="id" value={job.id} />
								<Button type="submit">Repetir</Button>
							</form>
						{:else if job.state === 'queued'}
							<form method="POST" action="?/cancelar" use:enhance>
								<input type="hidden" name="id" value={job.id} />
								<Button type="submit">Cancelar</Button>
							</form>
						{/if}
					</td>
				</tr>
			{:else}
				<tr><td colspan="8">Nenhuma tarefa.</td></tr>
			{/each}
		</tbody>
	</table>
</section>

<style>
	.head {
		justify-content: space-between;
	}

	.error {
		color: var(--death);
		font-size: var(--text-xs);
	}
</style>
