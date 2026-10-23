import { error } from '@sveltejs/kit';
import { PUBLIC_CACHE, warehouse } from '#lib/server/warehouse.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const uf = params.uf.toUpperCase();
	if (!/^[A-Z]{2}$/.test(uf)) error(404, 'Unidade federativa não encontrada.');
	const [calendar, series, brazil] = await Promise.all([
		warehouse.calendar(),
		warehouse.ufSeries(uf),
		warehouse.brazilSeries()
	]);
	const rows = series.filter((row) => row.accidentRate !== null);
	if (rows.length === 0) error(404, 'Unidade federativa não encontrada.');
	const [ranking, municipalities] = await Promise.all([
		warehouse.ufRanking(calendar.lastConsolidated),
		warehouse.municipalRates(uf, calendar.lastConsolidated)
	]);
	const position =
		ranking
			.toSorted((a, b) => (b.accidentRate ?? 0) - (a.accidentRate ?? 0))
			.findIndex((row) => row.uf === uf) + 1;
	setHeaders(PUBLIC_CACHE);
	return {
		calendar,
		uf: rows[0]?.name ?? uf,
		sigla: uf,
		municipalities,
		rows,
		brazil: brazil.filter((row) => row.accidentRate !== null),
		position,
		total: ranking.length
	};
};
