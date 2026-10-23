import { describe, expect, it } from 'vitest';
import {
	formatCompact,
	formatDecimal,
	formatInteger,
	formatMonthYear,
	formatPercent,
	formatPointsDelta,
	formatRatePer100k
} from './format.ts';

const nbsp = /\u00a0/g;

describe('pt-BR number formatting', () => {
	it('uses dot thousands and comma decimals', () => {
		expect(formatInteger(4051122)).toBe('4.051.122');
		expect(formatDecimal(1045.5)).toBe('1.045,5');
		expect(formatDecimal(4.456, 2)).toBe('4,46');
	});

	it('renders missing values as an em dash, never zero', () => {
		expect(formatInteger(null)).toBe('—');
		expect(formatPercent(null)).toBe('—');
		expect(formatRatePer100k(null)).toBe('—');
	});

	it('formats ratios as percentages with one decimal', () => {
		expect(formatPercent(0.124).replace(nbsp, ' ')).toBe('12,4%');
	});

	it('formats compact values', () => {
		expect(formatCompact(4_051_122).replace(nbsp, ' ')).toBe('4,1 mi');
	});

	it('signs percentage-point deltas with a true minus', () => {
		expect(formatPointsDelta(0.6)).toBe('+0,6 p.p.');
		expect(formatPointsDelta(-2.25, 2)).toBe('−2,25 p.p.');
		expect(formatPointsDelta(0)).toBe('0,0 p.p.');
	});

	it('labels rates with their denominator', () => {
		expect(formatRatePer100k(1045.5)).toBe('1.045,5 por 100 mil vínculos');
	});

	it('formats month and year the way statistical notes do', () => {
		expect(formatMonthYear(2026, 8)).toBe('ago/2026');
		expect(formatMonthYear(2023, 12)).toBe('dez/2023');
	});
});
