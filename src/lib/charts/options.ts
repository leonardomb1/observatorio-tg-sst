import type { EChartsCoreOption } from 'echarts/core';
import type { YearStatus } from '#lib/status.ts';
import type { ChartTokens } from './theme.ts';

export interface RankItem {
	label: string;
	value: number | null;
	highlight?: boolean;
}

/** Horizontal bars, largest first, labelled at the bar end; an optional dashed line marks a reference. */
export function rankingBars(
	tokens: ChartTokens,
	items: readonly RankItem[],
	format: (value: number) => string,
	reference?: { value: number; label: string }
): EChartsCoreOption {
	const sorted = items
		.filter((item) => item.value !== null)
		.toSorted((a, b) => (b.value ?? 0) - (a.value ?? 0));
	return {
		grid: { left: 8, right: 72, top: reference ? 28 : 8, bottom: 8, containLabel: true },
		xAxis: { type: 'value', show: false },
		yAxis: {
			type: 'category',
			inverse: true,
			data: sorted.map((item) => item.label),
			axisLabel: { color: tokens.ink2, width: 220, overflow: 'truncate' }
		},
		series: [
			{
				type: 'bar',
				barCategoryGap: '30%',
				data: sorted.map((item) => ({
					value: item.value,
					itemStyle: { color: item.highlight ? tokens.accent : tokens.ink3 }
				})),
				label: {
					show: true,
					position: 'right',
					color: tokens.ink,
					formatter: ({ value }: { value: number }) => format(value)
				},
				markLine: reference
					? {
							symbol: 'none',
							silent: true,
							data: [{ xAxis: reference.value }],
							label: {
								formatter: reference.label,
								position: 'start',
								distance: 6,
								color: tokens.ink2
							}
						}
					: undefined
			}
		],
		tooltip: { show: false }
	};
}

export interface YearPoint {
	year: number;
	status: YearStatus;
	value: number | null;
}

/**
 * Annual bars where only consolidated years are drawn solid; partial and
 * provisional years stay visible but muted with a dashed outline, so a drop
 * caused by missing files never reads as a real decline.
 */
export function yearBars(
	tokens: ChartTokens,
	points: readonly YearPoint[],
	format: (value: number) => string
): EChartsCoreOption {
	return {
		grid: { left: 8, right: 8, top: 24, bottom: 8, containLabel: true },
		xAxis: { type: 'category', data: points.map((point) => String(point.year)) },
		yAxis: { type: 'value', axisLabel: { formatter: (value: number) => format(value) } },
		series: [
			{
				type: 'bar',
				barCategoryGap: '35%',
				data: points.map((point) => ({
					value: point.value,
					itemStyle:
						point.status === 'consolidado'
							? { color: tokens.ink }
							: {
									color: tokens.neutral,
									borderColor: tokens.ink3,
									borderType: 'dashed',
									borderWidth: 1
								}
				})),
				label: {
					show: true,
					position: 'top',
					color: tokens.ink2,
					formatter: ({ value }: { value: number }) => format(value)
				}
			}
		],
		tooltip: { show: false }
	};
}

/** Two series over years, the subject in ink and the reference in grey, labelled at the line end. */
export function compareLines(
	tokens: ChartTokens,
	years: readonly number[],
	subject: { label: string; values: (number | null)[] },
	reference: { label: string; values: (number | null)[] },
	format: (value: number) => string
): EChartsCoreOption {
	const line = (name: string, values: (number | null)[], color: string, width: number) => ({
		type: 'line',
		name,
		data: values,
		connectNulls: false,
		showSymbol: true,
		symbolSize: 5,
		lineStyle: { color, width },
		itemStyle: { color },
		endLabel: { show: true, formatter: name, color, fontWeight: 600 }
	});
	return {
		grid: { left: 8, right: 96, top: 16, bottom: 8, containLabel: true },
		xAxis: { type: 'category', data: years.map(String), boundaryGap: false },
		yAxis: { type: 'value', axisLabel: { formatter: (value: number) => format(value) } },
		series: [
			line(reference.label, reference.values, tokens.ink3, 1.5),
			line(subject.label, subject.values, tokens.ink, 2.5)
		],
		tooltip: {
			trigger: 'axis',
			valueFormatter: (value: unknown) => (typeof value === 'number' ? format(value) : '—')
		}
	};
}
