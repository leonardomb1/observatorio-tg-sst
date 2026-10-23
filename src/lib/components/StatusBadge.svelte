<script lang="ts">
	import { yearStatusHint, yearStatusLabel, type YearStatus } from '#lib/status.ts';

	interface Props {
		status: YearStatus;
		period?: string | undefined;
	}

	let { status, period }: Props = $props();
</script>

<span class="badge" data-status={status}>
	{#if period}<span class="period">{period}</span>{/if}
	<span class="label">{yearStatusLabel[status]}</span>
	<span class="visually-hidden">: {yearStatusHint[status]}</span>
</span>

<style>
	.badge {
		display: inline-flex;
		gap: var(--space-2);
		align-items: baseline;
		font-size: var(--text-xs);
		color: var(--ink-2);
		white-space: nowrap;
	}

	.label {
		padding-inline: var(--space-1);
		border: 1px solid currentcolor;
		border-radius: var(--radius);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	[data-status='consolidado'] .label {
		border-color: transparent;
		padding-inline: 0;
	}

	[data-status='parcial'] .label {
		border-style: dashed;
		color: var(--ink);
	}
</style>
