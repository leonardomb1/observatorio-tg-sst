import { PUBLIC_CACHE, warehouse } from '#lib/server/warehouse.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	const [europe, usa, world] = await Promise.all([
		warehouse.europeComparison(),
		warehouse.usaSeries(),
		warehouse.worldComparison()
	]);
	setHeaders(PUBLIC_CACHE);
	return { europe, usa, world };
};
