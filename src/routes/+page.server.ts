import { PUBLIC_CACHE, warehouse } from '#lib/server/warehouse.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	const calendar = await warehouse.calendar();
	const year = calendar.lastConsolidated;
	const [series, ufs, sectors, lethality] = await Promise.all([
		warehouse.brazilSeries(),
		warehouse.ufRanking(year),
		warehouse.sectorRanking(year),
		warehouse.lethalityByType()
	]);
	setHeaders(PUBLIC_CACHE);
	return {
		calendar,
		year,
		series: series.filter((row) => row.accidentRate !== null),
		brazil: series.find((row) => row.year === year) ?? null,
		ufs,
		sectors: sectors
			.filter((sector) => sector.deathRate !== null)
			.toSorted((a, b) => (b.deathRate ?? 0) - (a.deathRate ?? 0))
			.slice(0, 10),
		lethality
	};
};
