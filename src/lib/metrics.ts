import { formatDecimal, formatInteger, formatPercent } from './format.ts';
import type { Slice } from './server/catalog/cubos.ts';

/** Portuguese plurals in -ões here are all feminine: notificações, concessões, admissões. */
export const ofThe = (noun: string) => (noun.endsWith('ões') ? 'das' : 'dos');

/** How a cube slice becomes the number a panel shows. */
export interface Metric {
	/** Lower-case plural noun, as in "a maior parte dos {noun}". */
	noun: string;
	/** "dos" or "das", agreeing with the noun. */
	of: string;
	/** Column header and chart label. */
	label: string;
	/** Measure, unit and denominator, for panel subtitles. */
	unit: string;
	value: (slice: Slice) => number | null;
	format: (value: number) => string;
	/** Whether values add up across slices, so shares of the total make sense. */
	additive: boolean;
}

export function count(key: string, label: string, noun: string, unit: string): Metric {
	return {
		noun,
		of: ofThe(noun),
		label,
		unit,
		value: (slice) => slice.values[key] ?? null,
		format: formatInteger,
		additive: true
	};
}

/** Per 100 thousand formal jobs; null where the slice has no job count. */
export function perJobs(
	key: string,
	label: string,
	noun: string,
	unit: string,
	digits = 1
): Metric {
	return {
		noun,
		of: ofThe(noun),
		label,
		unit,
		value: (slice) => {
			const value = slice.values[key];
			return value == null || !slice.jobs ? null : (value * 100_000) / slice.jobs;
		},
		format: (value) => formatDecimal(value, digits),
		additive: false
	};
}

/** Share of one measure in another, as a ratio rendered as a percentage. */
export function share(
	part: string,
	whole: string,
	label: string,
	noun: string,
	unit: string
): Metric {
	return {
		noun,
		of: ofThe(noun),
		label,
		unit,
		value: (slice) => {
			const value = slice.values[part];
			const total = slice.values[whole];
			return value == null || !total ? null : value / total;
		},
		format: formatPercent,
		additive: false
	};
}

/** Events per thousand of a base measure in the same slice. */
export function perThousand(
	key: string,
	base: string,
	label: string,
	noun: string,
	unit: string
): Metric {
	return {
		noun,
		of: ofThe(noun),
		label,
		unit,
		value: (slice) => {
			const value = slice.values[key];
			const total = slice.values[base];
			return value == null || !total ? null : (value * 1000) / total;
		},
		format: (value) => formatDecimal(value, 1),
		additive: false
	};
}
