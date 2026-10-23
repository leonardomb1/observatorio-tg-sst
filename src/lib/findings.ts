import { formatDecimal, formatPercent } from './format.ts';

export interface Leader<Row> {
	row: Row;
	/** Rows that read the same as the leader once formatted, so the text must not name a single winner. */
	tied: Row[];
}

/**
 * The row with the largest value, plus every row that displays the same value.
 * Ties are judged on the formatted figure because that is what the reader compares.
 */
export function leader<Row>(
	rows: readonly Row[],
	value: (row: Row) => number | null,
	format: (value: number) => string
): Leader<Row> | null {
	const ranked = rows
		.filter((row) => value(row) !== null)
		.toSorted((a, b) => (value(b) ?? 0) - (value(a) ?? 0));
	const [first, ...rest] = ranked;
	if (!first) return null;
	const shown = format(value(first) ?? 0);
	return { row: first, tied: rest.filter((row) => format(value(row) ?? 0) === shown) };
}

/** "Santa Catarina e Paraná" or "A, B e C". */
export function listNames(names: readonly string[]): string {
	if (names.length <= 1) return names.join('');
	return `${names.slice(0, -1).join(', ')} e ${names.at(-1) ?? ''}`;
}

/** Year-on-year change that never prints "0,0% a mais". */
export function changeSince(change: number, previousYear: number): string {
	const shown = formatPercent(Math.abs(change));
	if (shown === formatPercent(0)) return `praticamente o mesmo que em ${previousYear}`;
	return `${shown} ${change > 0 ? 'a mais' : 'a menos'} que em ${previousYear}`;
}

/** "1,4 vezes" for a ratio above one as displayed; null when it would read "1,0 vezes" or less. */
export function timesAbove(ratio: number): string | null {
	const shown = formatDecimal(ratio);
	return ratio > 1 && shown !== formatDecimal(1) ? `${shown} vezes` : null;
}
