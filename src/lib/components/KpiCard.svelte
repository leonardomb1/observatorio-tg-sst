<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { prefersReducedMotion } from 'svelte/motion';
	import { onceInView } from '#lib/viewport.ts';

	interface Props {
		label: string;
		value: number | null;
		/** Formats both the final value and every intermediate frame of the count-up. */
		format: (value: number) => string;
		unit?: string;
		context: string;
	}

	let { label, value, format, unit, context }: Props = $props();

	const DURATION_MS = 1100;

	let frame = $state<number | null>(null);

	const text = $derived(value === null ? '—' : format(value));

	/** Counts from zero to the value once, the first time the card is on screen. */
	const countUp: Attachment<HTMLElement> = (element) => {
		const target = value;
		if (target === null || target === 0 || prefersReducedMotion.current) return;
		let raf = 0;
		const stop = onceInView(
			element,
			() => {
				const start = performance.now();
				const step = (now: number) => {
					const progress = Math.min(1, (now - start) / DURATION_MS);
					const eased = 1 - (1 - progress) ** 3;
					frame = progress < 1 ? target * eased : null;
					if (progress < 1) raf = requestAnimationFrame(step);
				};
				frame = 0;
				raf = requestAnimationFrame(step);
			},
			{ threshold: 0.6 }
		);
		return () => {
			stop();
			cancelAnimationFrame(raf);
			frame = null;
		};
	};
</script>

<div class="kpi">
	<p class="label">{label}</p>
	<p class="value" {@attach countUp}>
		{#if frame === null}
			{text}
		{:else}
			<span aria-hidden="true">{format(frame)}</span><span class="visually-hidden">{text}</span>
		{/if}
		{#if unit}<span class="unit">{unit}</span>{/if}
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
