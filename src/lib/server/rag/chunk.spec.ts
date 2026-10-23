import { describe, expect, it } from 'vitest';
import { finalize, MAX_CHUNK_CHARS, splitOversized } from './chunk.ts';

describe('splitOversized', () => {
	it('keeps small blocks whole', () => {
		expect(splitOversized('item curto')).toEqual(['item curto']);
	});

	it('cuts a huge table block under the cap', () => {
		const row = 'Infração 101.001-0 grau I2 ' + 'x'.repeat(40);
		const pieces = splitOversized(Array.from({ length: 3000 }, () => row).join(' '));
		expect(pieces.length).toBeGreaterThan(1);
		expect(pieces.every((piece) => piece.length <= MAX_CHUNK_CHARS)).toBe(true);
	});
});

describe('finalize', () => {
	it('keeps page numbers for the pieces of a split block', () => {
		const chunks = finalize([
			{
				trail: 'NR-28 > Anexo II',
				itemCode: null,
				parentCode: null,
				pageStart: 4,
				pageEnd: 9,
				blocks: ['a '.repeat(3000)],
				blockPages: [7]
			}
		]);
		expect(chunks.length).toBeGreaterThan(1);
		expect(chunks.every((chunk) => chunk.pageStart === 7 && chunk.pageEnd === 7)).toBe(true);
	});
});
