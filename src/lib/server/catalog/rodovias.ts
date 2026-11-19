import * as z from 'zod';
import { cached, rows, type Query } from './query.ts';

const CategoryRow = z.object({
	categoria_veiculo: z.string(),
	condutores: z.number(),
	obitos: z.number(),
	letalidade: z.number()
});

const YearRow = z.object({
	ano: z.number().int(),
	condutores: z.number(),
	obitos: z.number()
});

const HourRow = z.object({
	hora: z.number().int(),
	condutores: z.number(),
	obitos: z.number(),
	letalidade: z.number()
});

export interface HighwayDrivers {
	/** Complete years summed in the category and hour panels; the current year is still open. */
	firstYear: number;
	lastYear: number;
	categories: { category: string; drivers: number; deaths: number; perThousand: number }[];
	/** Truck drivers involved in federal-highway accidents and killed, per year. */
	truckYears: { year: number; complete: boolean; drivers: number; deaths: number }[];
	truckHours: { hour: number; drivers: number; deaths: number; perThousand: number }[];
}

/** Drivers in federal-highway accidents by vehicle, with truck drivers by year and hour of day. */
export function highwayDrivers(query: Query) {
	return cached('highway-drivers', async (): Promise<HighwayDrivers> => {
		const truckYears = await rows(
			query,
			YearRow,
			`SELECT ano, SUM(condutores) AS condutores, SUM(obitos) AS obitos
			FROM prf_condutores_categoria WHERE categoria_veiculo = 'Caminhão'
			GROUP BY ano ORDER BY ano`
		);
		const open = truckYears.at(-1)?.ano;
		const first = truckYears[0]?.ano;
		if (open === undefined || first === undefined || open === first)
			throw new Error('Datamart sem anos completos da PRF');
		const last = open - 1;
		const [categories, truckHours] = await Promise.all([
			rows(
				query,
				CategoryRow,
				`SELECT categoria_veiculo, SUM(condutores) AS condutores, SUM(obitos) AS obitos,
					ROUND(SUM(obitos) * 1000.0 / SUM(condutores), 1) AS letalidade
				FROM prf_condutores_categoria
				WHERE ano BETWEEN ? AND ? AND categoria_veiculo <> 'Outros'
				GROUP BY categoria_veiculo`,
				[first, last]
			),
			rows(
				query,
				HourRow,
				`SELECT hora, SUM(condutores) AS condutores, SUM(obitos) AS obitos,
					ROUND(SUM(obitos) * 1000.0 / SUM(condutores), 1) AS letalidade
				FROM prf_caminhoneiros_horario
				WHERE ano BETWEEN ? AND ? AND hora IS NOT NULL
				GROUP BY hora ORDER BY hora`,
				[first, last]
			)
		]);
		return {
			firstYear: first,
			lastYear: last,
			categories: categories.map((row) => ({
				category: row.categoria_veiculo,
				drivers: row.condutores,
				deaths: row.obitos,
				perThousand: row.letalidade
			})),
			truckYears: truckYears.map((row) => ({
				year: row.ano,
				complete: row.ano !== open,
				drivers: row.condutores,
				deaths: row.obitos
			})),
			truckHours: truckHours.map((row) => ({
				hour: row.hora,
				drivers: row.condutores,
				deaths: row.obitos,
				perThousand: row.letalidade
			}))
		};
	})();
}
