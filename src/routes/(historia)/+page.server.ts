import { readFilters } from '#lib/filters.ts';
import { PUBLIC_CACHE, warehouse } from '#lib/server/warehouse.ts';
import type { PageServerLoad } from './$types';

/** Key numbers of each group for the last complete year, for Brazil or the selected state. */
export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const { selection } = readFilters(url.searchParams);
	const filters = { year: null, selection: selection.uf ? { uf: selection.uf } : {} };
	const [calendar, accidents, mental, notifications, deaths, register] = await Promise.all([
		warehouse.calendar(),
		warehouse.cubeView('acidentes', filters),
		warehouse.cubeView('saude-mental', filters),
		warehouse.cubeView('notificacoes-sus', filters),
		warehouse.cubeView('mortes-no-sus', filters),
		warehouse.slaveRegister()
	]);
	setHeaders(PUBLIC_CACHE);
	return { calendar, accidents, mental, notifications, deaths, register };
};
