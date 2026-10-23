<script lang="ts">
	import Icon from './Icon.svelte';
	import { yearStatusHint, yearStatusLabel, type YearStatus } from '#lib/status.ts';

	interface Props {
		status: YearStatus;
		period?: string | undefined;
	}

	let { status, period }: Props = $props();
</script>

<span class="badge" data-status={status}>
	<Icon name="triangle-alert" size={1} />
	<span class="label"
		>{period ? `${period}: ` : ''}{yearStatusLabel[status].toLocaleLowerCase('pt-BR')}</span
	>
	<span class="visually-hidden">: {yearStatusHint[status]}</span>
</span>

<style>
	.badge {
		display: inline-flex;
		gap: var(--space-1);
		align-items: center;
		padding: 0 var(--space-2);
		border: 1px dashed var(--ink-3);
		border-radius: var(--radius);
		color: var(--ink);
		font-size: var(--text-xs);
		white-space: nowrap;
	}
</style>
