<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { loadBrazil, ufChoropleth, type UfValue } from './brazil.ts';
	import Chart from './Chart.svelte';

	interface Props {
		items: readonly UfValue[];
		format: (value: number) => string;
		label: string;
		height?: string;
		onselect?: ((uf: string) => void) | undefined;
	}

	let { items, format, label, height = '28rem', onselect }: Props = $props();

	let ready = $state(false);

	/** The boundaries load with the first map on the page and are reused after that. */
	const load: Attachment = () => {
		void loadBrazil().then(() => (ready = true));
	};
</script>

<div {@attach load}>
	{#if ready}
		<Chart {label} {height} {onselect} option={(tokens) => ufChoropleth(tokens, items, format)} />
	{:else}
		<div class="placeholder" style:block-size={height} role="img" aria-label={label}></div>
	{/if}
</div>

<style>
	.placeholder {
		border-radius: var(--radius);
		background: var(--surface);
	}
</style>
