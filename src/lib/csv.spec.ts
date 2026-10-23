import { describe, expect, it } from 'vitest';
import { toCsv, type Column } from './csv.ts';

interface Row {
	uf: string;
	taxa: number | null;
}

const columns: Column<Row>[] = [
	{ key: 'uf', label: 'Unidade federativa' },
	{ key: 'taxa', label: 'Taxa; por 100 mil', numeric: true }
];

describe('toCsv', () => {
	it('uses semicolons, comma decimals and a BOM', () => {
		const csv = toCsv(columns, [{ uf: 'SC', taxa: 1587.8 }]);
		expect(csv.startsWith('﻿')).toBe(true);
		expect(csv.slice(1).split('\r\n')).toEqual([
			'Unidade federativa;"Taxa; por 100 mil"',
			'SC;1587,8'
		]);
	});

	it('leaves missing values empty and escapes quotes', () => {
		const csv = toCsv(columns, [{ uf: 'Rio "Grande"', taxa: null }]);
		expect(csv.split('\r\n')[1]).toBe('"Rio ""Grande""";');
	});
});
