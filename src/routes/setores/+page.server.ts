import { PUBLIC_CACHE, warehouse } from '#lib/server/warehouse.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const [calendar, series] = await Promise.all([warehouse.calendar(), warehouse.brazilSeries()]);
	const years = series.filter((row) => row.accidentRate !== null);
	const requested = Number(url.searchParams.get('ano'));
	const year = years.some((row) => row.year === requested) ? requested : calendar.lastConsolidated;
	const metric = url.searchParams.get('medida') === 'acidentes' ? 'acidentes' : 'obitos';
	setHeaders(PUBLIC_CACHE);
	return {
		calendar,
		year,
		metric,
		years: years.map((row) => ({ year: row.year, status: row.status })),
		brazil: years.find((row) => row.year === year) ?? null,
		sectors: await warehouse.sectorRanking(year)
	} as const;
};
