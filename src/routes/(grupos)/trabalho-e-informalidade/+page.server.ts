import { readFilters } from '#lib/filters.ts';
import { PUBLIC_CACHE, warehouse } from '#lib/server/warehouse.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const filters = readFilters(url.searchParams);
	const [turnoverView, slaveView, informality, turnover, register] = await Promise.all([
		warehouse.cubeView('rotatividade', filters),
		warehouse.cubeView('trabalho-escravo', filters),
		warehouse.informality(),
		warehouse.turnover(),
		warehouse.slaveRegister()
	]);
	setHeaders(PUBLIC_CACHE);
	return {
		turnoverView,
		slaveView,
		informality,
		turnover,
		register,
		years: [
			...new Set([...turnoverView.years, ...slaveView.years].map((row) => row.year))
		].toSorted((a, b) => b - a)
	};
};
