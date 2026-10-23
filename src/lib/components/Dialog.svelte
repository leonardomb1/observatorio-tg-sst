<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';

	interface Props {
		open?: boolean;
		title: string;
		children: Snippet;
		actions?: Snippet;
		onclose?: () => void;
	}

	let { open = $bindable(false), title, children, actions, onclose }: Props = $props();

	const id = $props.id();

	const sync: Attachment<HTMLDialogElement> = (dialog) => {
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	};

	function handleClose() {
		open = false;
		onclose?.();
	}

	function closeOnBackdrop(event: MouseEvent) {
		if (event.target === event.currentTarget) (event.currentTarget as HTMLDialogElement).close();
	}
</script>

<dialog aria-labelledby="{id}-title" {@attach sync} onclose={handleClose} onclick={closeOnBackdrop}>
	<div class="body">
		<header>
			<h2 id="{id}-title">{title}</h2>
			<button type="button" class="close" aria-label="Fechar" onclick={() => (open = false)}>
				<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /></svg>
			</button>
		</header>
		<div class="content">{@render children()}</div>
		{#if actions}<footer>{@render actions()}</footer>{/if}
	</div>
</dialog>

<style>
	dialog {
		margin: auto;
		inline-size: min(36rem, calc(100vw - 2rem));
		max-block-size: calc(100dvh - 2rem);
		padding: 0;
		border: var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
	}

	dialog::backdrop {
		background: color-mix(in srgb, var(--paper) 75%, transparent);
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-5);
	}

	header {
		display: flex;
		gap: var(--space-4);
		align-items: start;
		justify-content: space-between;
	}

	h2 {
		font-size: var(--text-xl);
	}

	.close {
		display: grid;
		place-items: center;
		inline-size: 2rem;
		block-size: 2rem;
		padding: 0;
		border: 0;
		background: none;
		color: var(--ink-2);
	}

	svg {
		inline-size: 1rem;
		block-size: 1rem;
		stroke: currentcolor;
		stroke-width: 1.5;
	}

	footer {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		justify-content: flex-end;
	}
</style>
