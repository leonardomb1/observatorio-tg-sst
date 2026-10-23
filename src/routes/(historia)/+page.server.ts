import { PUBLIC_CACHE, warehouse } from '#lib/server/warehouse.ts';
import type { PageServerLoad } from './$types';

/** The filtered sections, #estados and #atividades, share `ano` and `medida`. */
export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const [calendar, series] = await Promise.all([warehouse.calendar(), warehouse.brazilSeries()]);
	const years = series.filter((row) => row.accidentRate !== null);
	const requested = Number(url.searchParams.get('ano'));
	const year = years.some((row) => row.year === requested) ? requested : calendar.lastConsolidated;
	const metric = url.searchParams.get('medida') === 'obitos' ? 'obitos' : 'acidentes';
	const brazil = years.find((row) => row.year === year);
	if (!brazil) throw new Error(`Taxa nacional ausente para ${year}`);
	const [ufs, sectors] = await Promise.all([
		warehouse.ufRanking(year),
		warehouse.sectorRanking(year)
	]);
	setHeaders(PUBLIC_CACHE);
	return {
		filters: {
			year,
			metric,
			status: brazil.status,
			years: years.map((row) => ({ year: row.year, status: row.status })),
			brazil
		},
		ufs,
		sectors
	} as const;
};
