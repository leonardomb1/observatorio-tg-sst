import { BarChart, LineChart, MapChart, PieChart, ScatterChart } from 'echarts/charts';
import {
	AriaComponent,
	DatasetComponent,
	GridComponent,
	MarkAreaComponent,
	MarkLineComponent,
	TooltipComponent,
	VisualMapComponent
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { LabelLayout } from 'echarts/features';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([
	BarChart,
	LineChart,
	MapChart,
	PieChart,
	ScatterChart,
	AriaComponent,
	DatasetComponent,
	GridComponent,
	MarkAreaComponent,
	MarkLineComponent,
	TooltipComponent,
	VisualMapComponent,
	LabelLayout,
	SVGRenderer
]);

export { echarts };

export const THEME = 'observatorio';

let canvas: CanvasRenderingContext2D | null = null;

/** zrender only parses hex and comma rgb/hsl, so every token goes through a 1×1 canvas. */
function toRgba(color: string): string {
	canvas ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
	if (!canvas) throw new Error('2D canvas unavailable');
	canvas.clearRect(0, 0, 1, 1);
	canvas.fillStyle = '#000';
	canvas.fillStyle = color;
	canvas.fillRect(0, 0, 1, 1);
	const [r = 0, g = 0, b = 0, a = 255] = canvas.getImageData(0, 0, 1, 1).data;
	return `rgba(${r}, ${g}, ${b}, ${Number((a / 255).toFixed(3))})`;
}

function readChartTokens() {
	const css = getComputedStyle(document.documentElement);
	const raw = (name: string) => css.getPropertyValue(name).trim();
	const color = (name: string) => toRgba(raw(name));
	return {
		ink: color('--ink'),
		ink2: color('--ink-2'),
		ink3: color('--ink-3'),
		rule: color('--rule'),
		ruleStrong: color('--rule-strong'),
		surface: color('--surface'),
		accent: color('--accent'),
		neutral: color('--neutral'),
		death: color('--death'),
		below: color('--below'),
		above: color('--above'),
		rates: [1, 2, 3, 4, 5].map((step) => color(`--rate-${step}`)),
		types: {
			typical: color('--type-typical'),
			commute: color('--type-commute'),
			disease: color('--type-disease'),
			unknown: color('--type-unknown')
		},
		fontSans: raw('--font-sans')
	};
}

export type ChartTokens = ReturnType<typeof readChartTokens>;

function buildTheme(tokens: ChartTokens) {
	const label = { color: tokens.ink2, fontFamily: tokens.fontSans, fontSize: 13 };
	const valueAxis = {
		axisLine: { show: false },
		axisTick: { show: false },
		axisLabel: label,
		splitLine: { lineStyle: { color: tokens.rule, width: 1 } },
		splitNumber: 4
	};
	const categoryAxis = {
		axisLine: { lineStyle: { color: tokens.ruleStrong } },
		axisTick: { show: false },
		axisLabel: label,
		splitLine: { show: false }
	};
	return {
		color: [tokens.ink, tokens.ink3, tokens.accent],
		backgroundColor: 'transparent',
		textStyle: { color: tokens.ink, fontFamily: tokens.fontSans },
		animationDuration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300,
		grid: { left: 8, right: 48, top: 24, bottom: 8, containLabel: true },
		categoryAxis,
		valueAxis,
		timeAxis: categoryAxis,
		line: { symbol: 'none', smooth: false, lineStyle: { width: 2 } },
		bar: { barCategoryGap: '35%' },
		tooltip: {
			backgroundColor: tokens.surface,
			borderColor: tokens.rule,
			borderWidth: 1,
			extraCssText: 'box-shadow: none; border-radius: 2px;',
			textStyle: { color: tokens.ink, fontFamily: tokens.fontSans, fontSize: 13 },
			confine: true
		},
		markLine: { lineStyle: { color: tokens.ruleStrong, type: [4, 4], width: 2 } },
		markArea: { itemStyle: { color: tokens.neutral } }
	};
}

export function registerTheme(): ChartTokens {
	const tokens = readChartTokens();
	echarts.registerTheme(THEME, buildTheme(tokens));
	return tokens;
}

export function watchColorScheme(onChange: () => void): () => void {
	const media = matchMedia('(prefers-color-scheme: dark)');
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
	media.addEventListener('change', onChange);
	return () => {
		observer.disconnect();
		media.removeEventListener('change', onChange);
	};
}
