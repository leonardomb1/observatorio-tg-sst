import { readFilters } from '#lib/filters.ts';
import { PUBLIC_CACHE, warehouse } from '#lib/server/warehouse.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const filters = readFilters(url.searchParams);
	const [mental, notifications, deaths, mentalHealth, sinan, sim, cids] = await Promise.all([
		warehouse.cubeView('saude-mental', filters),
		warehouse.cubeView('notificacoes-sus', filters),
		warehouse.cubeView('mortes-no-sus', filters),
		warehouse.mentalHealth(),
		warehouse.sinanNotifications(),
		warehouse.healthDeaths(),
		warehouse.cidNames()
	]);
	setHeaders(PUBLIC_CACHE);
	return {
		mental,
		notifications,
		deaths,
		mentalHealth,
		sinan,
		sim,
		cidNames: Object.fromEntries(
			(mental.extras.cid ?? [])
				.map((slice) => slice.key)
				.filter((key) => key !== null)
				.map((key) => [key, cids[key] ?? key])
		),
		years: [
			...new Set([...mental.years, ...notifications.years, ...deaths.years].map((row) => row.year))
		].toSorted((a, b) => b - a)
	};
};
