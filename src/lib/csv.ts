export interface Column<Row> {
	key: keyof Row & string;
	label: string;
	numeric?: boolean;
	format?: (value: Row[keyof Row]) => string;
}

const decimal = new Intl.NumberFormat('pt-BR', { useGrouping: false, maximumFractionDigits: 6 });

function cell(value: unknown): string {
	if (value === null || value === undefined) return '';
	const text =
		typeof value === 'number'
			? decimal.format(value)
			: typeof value === 'string'
				? value
				: JSON.stringify(value);
	return /[";\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Semicolon-separated with comma decimals and a BOM, so spreadsheets in pt-BR open it as-is. */
export function toCsv<Row>(columns: readonly Column<Row>[], rows: readonly Row[]): string {
	const header = columns.map((column) => cell(column.label)).join(';');
	const body = rows.map((row) => columns.map((column) => cell(row[column.key])).join(';'));
	return '\uFEFF' + [header, ...body].join('\r\n');
}
