import { readFilters } from '#lib/filters.ts';
import { PUBLIC_CACHE, warehouse } from '#lib/server/warehouse.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const filters = readFilters(url.searchParams);
	const [calendar, accidents, truckers, social, highways] = await Promise.all([
		warehouse.calendar(),
		warehouse.cubeView('acidentes', filters),
		warehouse.cubeView('caminhoneiros', filters),
		warehouse.socialProfile(filters.selection.uf?.value ?? null),
		warehouse.highwayDrivers()
	]);
	const year = calendar.lastConsolidated;
	setHeaders(PUBLIC_CACHE);
	return {
		calendar,
		accidents,
		truckers,
		social,
		highways,
		years: [...new Set([...accidents.years, ...truckers.years].map((row) => row.year))].toSorted(
			(a, b) => b - a
		),
		causes: Promise.all([
			warehouse.agentFamilies(year),
			warehouse.bodyPartFamilies(year),
			warehouse.injuryFamilies(year)
		]).then(([agents, bodyParts, injuries]) => ({ year, agents, bodyParts, injuries })),
		benefits: warehouse.benefitsByYear()
	};
};
