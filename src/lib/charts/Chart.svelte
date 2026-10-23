<script lang="ts">
	import type { EChartsCoreOption } from 'echarts/core';
	import type { Attachment } from 'svelte/attachments';
	import { echarts, registerTheme, THEME, watchColorScheme, type ChartTokens } from './theme.ts';

	interface Props {
		/** Builds the option from the current theme tokens, so colours follow light/dark. */
		option: (tokens: ChartTokens) => EChartsCoreOption;
		/** One-sentence takeaway read by screen readers in place of the chart. */
		label: string;
		height?: string;
	}

	let { option, label, height = '20rem' }: Props = $props();

	const mount: Attachment<HTMLDivElement> = (element) => {
		let tokens = registerTheme();
		const chart = echarts.init(element, THEME, { renderer: 'svg', locale: 'PT-br' });

		$effect(() => {
			chart.setOption(option(tokens), { notMerge: true });
		});

		const resize = new ResizeObserver(() => {
			chart.resize();
		});
		resize.observe(element);

		const stopWatching = watchColorScheme(() => {
			tokens = registerTheme();
			chart.setTheme(THEME);
			chart.setOption(option(tokens), { notMerge: true });
		});

		return () => {
			stopWatching();
			resize.disconnect();
			chart.dispose();
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
