import { warehouse } from '#lib/server/warehouse.ts';
import type { LayoutServerLoad } from './$types';

/**
 * Everything on the home page that does not depend on the filters. It never
 * reads the URL, so changing `ano` or `medida` does not rerun it, and the
 * streamed sections below the fold keep their content instead of reloading.
 */
export const load: LayoutServerLoad = async () => {
	const calendar = await warehouse.calendar();
	const year = calendar.lastConsolidated;
	const [series, lethality] = await Promise.all([
		warehouse.brazilSeries(),
		warehouse.lethalityByType()
	]);
	return {
		calendar,
		overview: {
			year,
			series: series.filter((row) => row.accidentRate !== null),
			brazil: series.find((row) => row.year === year) ?? null,
			lethality
		},
		causes: Promise.all([
			warehouse.agentFamilies(year),
			warehouse.bodyPartFamilies(year),
			warehouse.injuryFamilies(year)
		]).then(([agents, bodyParts, injuries]) => ({ year, agents, bodyParts, injuries })),
		benefits: warehouse.benefitsByYear()
	};
};
