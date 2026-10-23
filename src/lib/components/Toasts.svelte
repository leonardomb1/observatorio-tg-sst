<script lang="ts">
	import { getToaster } from './toast.svelte.ts';

	const toaster = getToaster();
</script>

<div class="region" role="status" aria-live="polite">
	{#each toaster.items as toast (toast.id)}
		<div class="toast" data-tone={toast.tone}>
			<p>{toast.message}</p>
			<button
				type="button"
				aria-label="Dispensar aviso"
				onclick={() => {
					toaster.dismiss(toast.id);
				}}
			>
				<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /></svg>
			</button>
		</div>
	{/each}
</div>

<style>
	.region {
		position: fixed;
		inset-block-end: var(--space-4);
		inset-inline-end: var(--space-4);
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		max-inline-size: min(24rem, calc(100vw - 2rem));
	}

	.toast {
		display: flex;
		gap: var(--space-3);
		align-items: start;
		padding: var(--space-3) var(--space-4);
		border: var(--border);
		border-inline-start: 3px solid var(--ink);
		border-radius: var(--radius);
		background: var(--surface);
		font-size: var(--text-sm);
	}

	.toast[data-tone='error'] {
		border-inline-start-color: var(--death);
	}

	button {
		flex: none;
		display: grid;
		place-items: center;
		inline-size: 1.5rem;
		block-size: 1.5rem;
		padding: 0;
		border: 0;
		background: none;
		color: var(--ink-2);
	}

	svg {
		inline-size: 0.875rem;
		block-size: 0.875rem;
		stroke: currentcolor;
		stroke-width: 1.5;
	}
</style>
