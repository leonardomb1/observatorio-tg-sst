import { cached, type Query } from './query.ts';

export const MAX_ROWS = 200;
/** A municipal map needs every municipality of a state; Minas Gerais has 853. */
export const MAP_ROWS = 1000;

const FORBIDDEN =
	/\b(insert|update|delete|merge|drop|create|alter|grant|revoke|truncate|set|use|call|load|submit|kill|install|uninstall|export|into|outfile|admin|refresh|cancel|recover|backup|restore|show|explain|analyze|sleep|files|s3|hdfs|information_schema|sys|_statistics_|default_catalog)\b/i;
const TRAILING_LIMIT = /\blimit\s+(\d+)(?:\s*,\s*(\d+)|\s+offset\s+(\d+))?\s*$/i;

export class UnsafeSql extends Error {}

/**
 * Accepts one read-only SELECT over dm_sst and caps its result. The read-only
 * StarRocks user is the real boundary; this check keeps model errors readable
 * and the result small. Wrapping in a subquery is not an option: StarRocks drops
 * the inner ORDER BY, so the trailing LIMIT is appended or tightened instead.
 */
export function guardSql(raw: string, maxRows = MAX_ROWS): string {
	const sql = raw.trim().replace(/;\s*$/, '').trim();
	const code = sql.replace(/'(?:[^'\\]|\\.|'')*'/g, "''");
	if (/--|\/\*|#/.test(code)) throw new UnsafeSql('Comentários não são aceitos na consulta.');
	if (code.includes(';')) throw new UnsafeSql('Envie uma única instrução SELECT.');
	if (!/^(select|with)\b/i.test(code)) throw new UnsafeSql('Só consultas SELECT são aceitas.');
	const forbidden = FORBIDDEN.exec(code);
	if (forbidden) throw new UnsafeSql(`Palavra não permitida na consulta: ${forbidden[1]}.`);

	const limit = TRAILING_LIMIT.exec(sql);
	if (!limit) return `${sql}\nLIMIT ${maxRows + 1}`;
	const [, first = '0', second, third] = limit;
	const count = Math.min(Number(second ?? first), maxRows + 1);
	const offset = second ? first : (third ?? '0');
	return sql.replace(TRAILING_LIMIT, `LIMIT ${count} OFFSET ${offset}`);
}

type Cell = string | number | null;

export interface QueryResult {
	columns: string[];
	rows: Record<string, Cell>[];
	truncated: boolean;
}

export async function readOnly(
	query: Query,
	sql: string,
	maxRows = MAX_ROWS
): Promise<QueryResult> {
	const result = await query<Record<string, Cell>>(guardSql(sql, maxRows));
	const truncated = result.length > maxRows;
	const rows = truncated ? result.slice(0, maxRows) : result;
	return { columns: Object.keys(rows[0] ?? {}), rows, truncated };
}

interface ColumnRow {
	table_name: string;
	column_name: string;
	data_type: string;
}

/** One line per datamart view with its columns, for the assistant's system prompt. */
export function datamartColumns(query: Query) {
	return cached('datamart-columns', async () => {
		const result = await query<ColumnRow>(
			"SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'dm_sst' ORDER BY table_name, ordinal_position"
		);
		const tables = Map.groupBy(result, (row) => row.table_name);
		return [...tables]
			.map(([table, columns]) => {
				const list = columns.map((column) => `${column.column_name} ${column.data_type}`);
				return `${table}(${list.join(', ')})`;
			})
			.join('\n');
	})();
}
