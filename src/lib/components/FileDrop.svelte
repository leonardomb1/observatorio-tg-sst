<script lang="ts">
	interface Props {
		name: string;
		label: string;
		accept: string;
		hint?: string;
		required?: boolean;
		onselect?: (file: File | null) => void;
	}

	let { name, label, accept, hint, required = false, onselect }: Props = $props();

	const id = $props.id();
	let input = $state<HTMLInputElement>();
	let file = $state<File | null>(null);
	let dragging = $state(false);

	const size = $derived.by(() => {
		if (!file) return '';
		const format = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
		return file.size < 1_048_576
			? `${format.format(file.size / 1024)} KB`
			: `${format.format(file.size / 1_048_576)} MB`;
	});

	function pick(next: File | null) {
		file = next;
		onselect?.(next);
	}

	function drop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const dropped = event.dataTransfer?.files;
		if (!input || !dropped?.length) return;
		input.files = dropped;
		pick(dropped[0] ?? null);
	}
</script>

<div
	class="drop"
	data-dragging={dragging ? '' : undefined}
	role="presentation"
	ondragover={(event) => {
		event.preventDefault();
		dragging = true;
	}}
	ondragleave={() => (dragging = false)}
	ondrop={drop}
>
	<input
		bind:this={input}
		{id}
		{name}
		type="file"
		{accept}
		{required}
		class="visually-hidden"
		onchange={(event) => {
			pick(event.currentTarget.files?.[0] ?? null);
		}}
	/>
	<label for={id}>
		<span class="label">{label}</span>
		{#if file}
			<span class="file">{file.name} · {size}</span>
		{:else}
			<span class="hint">Arraste o arquivo para cá ou clique para escolher.</span>
		{/if}
		{#if hint}<span class="hint">{hint}</span>{/if}
	</label>
</div>

<style>
	.drop {
		border: 1px dashed var(--rule-strong);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.drop[data-dragging],
	.drop:focus-within {
		border-style: solid;
		border-color: var(--ink);
	}

	label {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-5);
		cursor: pointer;
	}

	.label {
		font-weight: 600;
	}

	.file {
		font-variant-numeric: tabular-nums;
	}

	.hint {
		color: var(--ink-2);
		font-size: var(--text-sm);
	}
</style>
