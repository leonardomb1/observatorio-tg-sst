import type { EChartsCoreOption } from 'echarts/core';
import { numeric, specFormat, type ChartSpec } from '#lib/consulta.ts';
import type { YearStatus } from '#lib/status.ts';
import { rankingBars, yearBars } from './options.ts';
import type { ChartTokens } from './theme.ts';

type Row = Record<string, string | number | null>;

const STATUSES = new Set(['consolidado', 'parcial', 'provisorio']);

function palette(tokens: ChartTokens): string[] {
	return [tokens.ink, tokens.ink3, tokens.rates[3] ?? tokens.ink2, tokens.rates[1] ?? tokens.ink2];
}

/**
 * Draws a chart the assistant asked for. A single annual series that carries
 * ano_status reuses the dashboard's year bars, so open years look open here too.
 */
export function answerChart(
	tokens: ChartTokens,
	spec: ChartSpec,
	rows: readonly Row[]
): EChartsCoreOption {
	const format = specFormat(spec);
	const labels = rows.map((row) => String(row[spec.categoria] ?? '—'));
	const values = (column: string) => rows.map((row) => numeric(row[column]));
	const [first] = spec.series;
	const single = spec.series.length === 1 && first;

	if (spec.tipo === 'barras' && single) {
		return rankingBars(
			tokens,
			labels.map((label, index) => ({ label, value: values(first.coluna)[index] ?? null })),
			format
		);
	}

	if (
		spec.tipo === 'colunas' &&
		single &&
		rows.every((row) => STATUSES.has(String(row.ano_status)))
	) {
		return yearBars(
			tokens,
			rows.map((row) => ({
				year: Number(row[spec.categoria]),
				status: row.ano_status as YearStatus,
				value: numeric(row[first.coluna])
			})),
			format
		);
	}

	const colors = palette(tokens);
	const horizontal = spec.tipo === 'barras';
	const category = {
		type: 'category',
		data: labels,
		boundaryGap: spec.tipo !== 'linhas',
		...(horizontal ? { inverse: true } : {})
	};
	const value = { type: 'value', axisLabel: { formatter: (number: number) => format(number) } };

	return {
		grid: { left: 8, right: 24, top: 40, bottom: 8, containLabel: true },
		legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 4 },
		xAxis: horizontal ? value : category,
		yAxis: horizontal ? category : value,
		series: spec.series.map((serie, index) => ({
			type: spec.tipo === 'linhas' ? 'line' : 'bar',
			name: serie.rotulo,
			data: values(serie.coluna),
			connectNulls: false,
			symbolSize: 5,
			lineStyle: { width: index === 0 ? 2.5 : 1.5 },
			itemStyle: { color: colors[index] }
		})),
		tooltip: {
			trigger: 'axis',
			valueFormatter: (cell: unknown) => (typeof cell === 'number' ? format(cell) : '—')
		}
	};
}
