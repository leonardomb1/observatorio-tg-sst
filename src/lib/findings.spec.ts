import { describe, expect, it } from 'vitest';
import { changeSince, leader, listNames, timesAbove } from './findings.ts';
import { formatDecimal } from './format.ts';

const rate = (row: { rate: number | null }) => row.rate;
const oneDecimal = (value: number) => formatDecimal(value);

describe('leader', () => {
	it('names a single leader when the gap shows', () => {
		const result = leader([{ rate: 10.2 }, { rate: 12.4 }, { rate: null }], rate, oneDecimal);
		expect(result?.row.rate).toBe(12.4);
		expect(result?.tied).toEqual([]);
	});

	it('reports rows that look equal once rounded', () => {
		const result = leader([{ rate: 12.44 }, { rate: 12.41 }, { rate: 9 }], rate, oneDecimal);
		expect(result?.tied).toEqual([{ rate: 12.41 }]);
	});

	it('returns null without values', () => {
		expect(leader([{ rate: null }], rate, oneDecimal)).toBeNull();
	});
});

describe('changeSince', () => {
	it('states direction', () => {
		expect(changeSince(0.25, 2024)).toBe('25,0% a mais que em 2024');
		expect(changeSince(-0.031, 2024)).toBe('3,1% a menos que em 2024');
	});

	it('does not invent a change that rounds to zero', () => {
		expect(changeSince(0.0004, 2024)).toBe('praticamente o mesmo que em 2024');
	});
});

describe('timesAbove', () => {
	it('formats ratios above one', () => {
		expect(timesAbove(2.69)).toBe('2,7 vezes');
	});

	it('refuses ratios that read as one or below', () => {
		expect(timesAbove(1.04)).toBeNull();
		expect(timesAbove(0.8)).toBeNull();
	});
});

describe('listNames', () => {
	it('joins in Portuguese', () => {
		expect(listNames(['A'])).toBe('A');
		expect(listNames(['A', 'B', 'C'])).toBe('A, B e C');
	});
});
