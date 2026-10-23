<script lang="ts">
	interface Props {
		label: string;
		value: string;
		unit?: string;
		context: string;
	}

	let { label, value, unit, context }: Props = $props();
</script>

<div class="kpi">
	<p class="label">{label}</p>
	<p class="value">
		{value}{#if unit}<span class="unit">{unit}</span>{/if}
	</p>
	<p class="context">{context}</p>
</div>

<style>
	.kpi {
		display: grid;
		grid-template-rows: subgrid;
		grid-row: span 3;
		gap: var(--space-1);
		padding-block-start: var(--space-3);
		border-block-start: 1px solid var(--ink);
	}

	.label,
	.context {
		max-inline-size: none;
		color: var(--ink-2);
		font-size: var(--text-sm);
	}

	.value {
		font-family: var(--font-serif);
		font-size: var(--text-3xl);
		font-variant-numeric: tabular-nums lining-nums;
		line-height: 1.1;
	}

	.unit {
		margin-inline-start: var(--space-2);
		color: var(--ink-2);
		font-family: var(--font-sans);
		font-size: var(--text-sm);
	}
</style>
