<script lang="ts">
	import Button from '#lib/components/Button.svelte';
	import { formatDecimal, formatInteger } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const rank = (value: number | null) => (value === null ? '—' : `#${value}`);
</script>

<svelte:head><title>Busca de teste — Administração</title></svelte:head>

<section class="l-stack">
	<h1>Busca de teste</h1>
	<p>
		Mostra os trechos que o assistente receberia para uma pergunta, com a posição em cada lista
		(vetorial, textual e por código de item) e a nota do reordenador.
	</p>
	{#if !data.voyageConfigured}
		<p class="warning" role="status">
			Sem chave da Voyage: a busca usa apenas texto e código de item, sem vetores nem reordenação.
		</p>
	{/if}

	<form method="GET" class="l-stack">
		<label class="field">
			<span>Pergunta</span>
			<input
				name="q"
				value={data.query}
				placeholder="A partir de que altura a NR-35 se aplica?"
				required
			/>
		</label>
		<div class="l-cluster">
			<label class="l-cluster option">
				<input type="checkbox" name="rerank" value="nao" checked={!data.useRerank} /> Sem reordenação
			</label>
			<label class="l-cluster option">
				<input type="checkbox" name="todos" value="sim" checked={data.includeNonCitable} /> Incluir documentos
				não citáveis
			</label>
			<Button type="submit" variant="primary">Buscar</Button>
		</div>
	</form>

	{#if data.result}
		<p class="meta">
			{formatInteger(data.result.hits.length)} trechos em {formatInteger(data.result.latencyMs)} ms ·
			{data.result.usedVector ? 'vetorial' : 'sem vetores'} ·
			{data.result.usedRerank ? `reordenado por ${data.rerankModel}` : 'sem reordenação'}
		</p>
		<ol class="hits">
			{#each data.result.hits as hit (hit.chunkId)}
				<li>
					<p class="head">
						<strong>{hit.title}</strong>
						{#if hit.itemCode}· item {hit.itemCode}{/if}
						{#if hit.pageStart}· p. {hit.pageStart}{/if}
					</p>
					<p class="scores">
						vetorial {rank(hit.ranks.vector)} · textual {rank(hit.ranks.lexical)} · código {rank(
							hit.ranks.code
						)} · RRF {formatDecimal(hit.rrf * 1000, 2)} · reordenação {hit.rerankScore === null
							? '—'
							: formatDecimal(hit.rerankScore, 3)}
					</p>
					<p class="trail">{hit.trail}</p>
					{#each hit.blocks as block, index (index)}<p class="block">{block}</p>{/each}
				</li>
			{/each}
		</ol>
	{/if}
</section>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		max-inline-size: 48rem;
	}

	.field span {
		color: var(--ink-2);
		font-size: var(--text-xs);
	}

	.field input {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--rule-strong);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.option {
		--cluster-gap: var(--space-2);

		font-size: var(--text-sm);
	}

	.warning,
	.meta,
	.scores,
	.trail {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.hits {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding-inline-start: var(--space-5);
	}

	.scores {
		font-variant-numeric: tabular-nums;
	}

	.block {
		font-size: var(--text-sm);
	}
</style>
