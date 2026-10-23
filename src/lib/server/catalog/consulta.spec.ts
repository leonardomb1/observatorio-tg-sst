import { describe, expect, it } from 'vitest';
import { guardSql, MAX_ROWS, UnsafeSql } from './consulta.ts';

const capped = `LIMIT ${MAX_ROWS + 1}`;

describe('guardSql', () => {
	it('appends a limit and drops a trailing semicolon', () => {
		expect(guardSql('SELECT ano FROM status_ano ORDER BY ano DESC;')).toBe(
			`SELECT ano FROM status_ano ORDER BY ano DESC\n${capped}`
		);
	});

	it('keeps a small limit and tightens a large one', () => {
		expect(guardSql('SELECT uf FROM taxa_incidencia_uf LIMIT 10')).toBe(
			'SELECT uf FROM taxa_incidencia_uf LIMIT 10 OFFSET 0'
		);
		expect(guardSql('SELECT uf FROM taxa_incidencia_uf LIMIT 5000')).toBe(
			`SELECT uf FROM taxa_incidencia_uf ${capped} OFFSET 0`
		);
		expect(guardSql('SELECT uf FROM t LIMIT 20, 9000')).toBe(
			`SELECT uf FROM t ${capped} OFFSET 20`
		);
	});

	it('accepts common table expressions and forbidden words inside strings', () => {
		expect(() =>
			guardSql(
				"WITH t AS (SELECT * FROM acidentes_por_cnae WHERE cnae_descricao = 'Drop; #1') SELECT * FROM t"
			)
		).not.toThrow();
	});

	it.each([
		'DELETE FROM status_ano',
		'SELECT 1; DROP TABLE status_ano',
		'SELECT * FROM status_ano INTO OUTFILE "x"',
		'SELECT * FROM information_schema.tables',
		"SELECT * FROM FILES('path' = 's3://x')",
		'SELECT 1 -- comment',
		'SHOW TABLES',
		'SET query_timeout = 999'
	])('rejects %s', (sql) => {
		expect(() => guardSql(sql)).toThrow(UnsafeSql);
	});
});
