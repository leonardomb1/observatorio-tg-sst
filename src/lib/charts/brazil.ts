import type { EChartsCoreOption } from 'echarts/core';
import { UF_NAMES } from '#lib/uf.ts';
import { echarts, type ChartTokens } from './theme.ts';

const MAP = 'brasil-uf';
const CLASSES = 5;
/** cos(14°): longitude scale at Brazil's middle latitude; ECharts' default of 0.75 squeezes it. */
const ASPECT = 0.97;

let loading: Promise<void> | null = null;

/**
 * Registers IBGE's state boundaries (malha territorial, qualidade intermediária) once,
 * loading them only when a map is about to be drawn.
 */
export function loadBrazil(): Promise<void> {
	loading ??= import('./brasil-uf.json').then((geo) => {
		echarts.registerMap(MAP, geo.default as never);
	});
	return loading;
}

export interface UfValue {
	uf: string;
	value: number | null;
}

/** Quintile breaks of the values on screen, so the shades always spread across the states. */
function breaksOf(values: readonly number[]): number[] {
	const sorted = values.toSorted((a, b) => a - b);
	if (sorted.length === 0) return [];
	return Array.from(
		{ length: CLASSES - 1 },
		(_, index) => sorted[Math.floor(((index + 1) * sorted.length) / CLASSES)] ?? 0
	);
}

/** Choropleth of the states, coloured by quintile, with a legend that names each range. */
export function ufChoropleth(
	tokens: ChartTokens,
	items: readonly UfValue[],
	format: (value: number) => string
): EChartsCoreOption {
	const values = items.map((item) => item.value).filter((value) => value !== null);
	const breaks = breaksOf(values);
	const pieces = Array.from({ length: CLASSES }, (_, index) => {
		const from = index === 0 ? undefined : breaks[index - 1];
		const to = index === CLASSES - 1 ? undefined : breaks[index];
		const label =
			from === undefined && to !== undefined
				? `até ${format(to)}`
				: to === undefined && from !== undefined
					? `${format(from)} ou mais`
					: `${format(from ?? 0)} a ${format(to ?? 0)}`;
		return {
			...(from === undefined ? {} : { gte: from }),
			...(to === undefined ? {} : { lt: to }),
			label,
			color: tokens.rates[index] ?? tokens.ink3
		};
	});
	return {
		tooltip: {
			trigger: 'item',
			formatter: ({ name, value }: { name: string; value: unknown }) =>
				`${UF_NAMES[name] ?? name}: ${typeof value === 'number' && !Number.isNaN(value) ? format(value) : '—'}`
		},
		visualMap: {
			type: 'piecewise',
			pieces,
			orient: 'horizontal',
			left: 0,
			bottom: 0,
			itemWidth: 12,
			itemHeight: 12,
			itemGap: 12,
			textStyle: { color: tokens.ink2 }
		},
		series: [
			{
				type: 'map',
				map: MAP,
				nameProperty: 'sigla',
				roam: false,
				aspectScale: ASPECT,
				top: 8,
				bottom: 48,
				selectedMode: false,
				itemStyle: { areaColor: tokens.neutral, borderColor: tokens.paper, borderWidth: 0.8 },
				label: { show: false },
				emphasis: {
					label: { show: true, color: tokens.ink, fontWeight: 600 },
					itemStyle: { areaColor: tokens.accent }
				},
				data: items.map((item) => ({ name: item.uf, value: item.value ?? Number.NaN }))
			}
		]
	};
}
