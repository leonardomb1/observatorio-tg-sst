const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('pt-BR', {
	style: 'percent',
	minimumFractionDigits: 1,
	maximumFractionDigits: 1
});

const decimalCache = new Map<number, Intl.NumberFormat>();

function decimalFormat(digits: number): Intl.NumberFormat {
	let format = decimalCache.get(digits);
	if (!format) {
		format = new Intl.NumberFormat('pt-BR', {
			minimumFractionDigits: digits,
			maximumFractionDigits: digits
		});
		decimalCache.set(digits, format);
	}
	return format;
}

const MISSING = '—';

export function formatInteger(value: number | null): string {
	return value === null ? MISSING : integer.format(value);
}

export function formatDecimal(value: number | null, digits = 1): string {
	return value === null ? MISSING : decimalFormat(digits).format(value);
}

export function formatCompact(value: number | null): string {
	return value === null ? MISSING : compact.format(value);
}

/** Takes a ratio (0.125 → "12,5%"). */
export function formatPercent(value: number | null): string {
	return value === null ? MISSING : percent.format(value);
}

/** Signed difference in percentage points, with a true minus sign. */
export function formatPointsDelta(value: number | null, digits = 1): string {
	if (value === null) return MISSING;
	const sign = value > 0 ? '+' : value < 0 ? '−' : '';
	return `${sign}${decimalFormat(digits).format(Math.abs(value))} p.p.`;
}

export function formatRatePer100k(value: number | null, digits = 1): string {
	return value === null ? MISSING : `${decimalFormat(digits).format(value)} por 100 mil vínculos`;
}
