<script lang="ts">
	import type { EChartsCoreOption, EChartsType } from 'echarts/core';
	import type { Attachment } from 'svelte/attachments';
	import { prefersReducedMotion } from 'svelte/motion';
	import { onceInView } from '#lib/viewport.ts';
	import { echarts, registerTheme, THEME, watchColorScheme, type ChartTokens } from './theme.ts';

	interface Props {
		/** Builds the option from the current theme tokens, so colours follow light/dark. */
		option: (tokens: ChartTokens) => EChartsCoreOption;
		/** One-sentence takeaway read by screen readers in place of the chart. */
		label: string;
		height?: string;
	}

	let { option, label, height = '20rem' }: Props = $props();

	/** Entrance and update timing; under reduced motion ECharts draws the final frame at once. */
	function withMotion(built: EChartsCoreOption): EChartsCoreOption {
		if (prefersReducedMotion.current) return { ...built, animation: false };
		return {
			animation: true,
			animationDuration: 900,
			animationEasing: 'cubicOut',
			animationDurationUpdate: 450,
			animationEasingUpdate: 'cubicInOut',
			...built
		};
	}

	/**
	 * ECharts is created about one screen before the chart is reached, and the
	 * option is only set once the chart is actually on screen, so the entrance
	 * animation plays where the reader can see it.
	 */
	const mount: Attachment<HTMLDivElement> = (element) => {
		let chart: EChartsType | null = null;
		let tokens: ChartTokens | null = null;
		let visible = $state(false);
		let stopWatching: (() => void) | null = null;
		const resize = new ResizeObserver(() => {
			chart?.resize();
		});

		function init() {
			tokens = registerTheme();
			chart = echarts.init(element, THEME, { renderer: 'svg', locale: 'PT-br' });
			resize.observe(element);
			stopWatching = watchColorScheme(() => {
				const next = registerTheme();
				tokens = next;
				chart?.setTheme(THEME);
				if (visible) chart?.setOption(withMotion(option(next)), { notMerge: true });
			});
		}

		const stopNear = onceInView(element, init, { rootMargin: '100% 0px' });
		const stopVisible = onceInView(
			element,
			() => {
				if (!chart) init();
				visible = true;
			},
			{ threshold: 0.25 }
		);

		$effect(() => {
			if (!visible || !chart || !tokens) return;
			chart.setOption(withMotion(option(tokens)), { notMerge: true });
		});

		return () => {
			stopNear();
			stopVisible();
			stopWatching?.();
			resize.disconnect();
			chart?.dispose();
		};
	};
</script>

<div
	class="chart"
	role="img"
	aria-label={label}
	style:--chart-height={height}
	{@attach mount}
></div>

<style>
	.chart {
		inline-size: 100%;
		block-size: var(--chart-height);
	}
</style>
