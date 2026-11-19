import * as z from 'zod';
import { cached, rows, type Query } from './query.ts';

const flag = z.union([z.number(), z.boolean()]).transform(Boolean);

const YearRow = z.object({
	ano: z.number().int(),
	obitos_sim: z.number(),
	obitos_cat: z.number().nullable(),
	pct_preenchido: z.number().nullable(),
	sim_preliminar: flag,
	cat_completo: flag
});

const UfRow = z.object({
	uf: z.string(),
	obitos_trabalho_sim: z.number(),
	obitos_cat: z.number().nullable(),
	pct_campo_preenchido: z.number().nullable()
});

const CauseRow = z.object({
	grupo_causa: z.string(),
	obitos: z.number()
});

export interface HealthDeaths {
	/** Last year closed in the SIM; the most recent one is still preliminary. */
	year: number;
	years: {
		year: number;
		simDeaths: number;
		catDeaths: number | null;
		filledPct: number | null;
		simPreliminary: boolean;
		catComplete: boolean;
	}[];
	states: {
		uf: string;
		simDeaths: number;
		catDeaths: number | null;
		filledPct: number | null;
	}[];
	causes: { cause: string; deaths: number }[];
}

/** Work-accident deaths in the health system's mortality registry, against the deaths with CAT. */
export function healthDeaths(query: Query) {
	return cached('health-deaths', async (): Promise<HealthDeaths> => {
		const years = await rows(
			query,
			YearRow,
			`SELECT ano, SUM(obitos_trabalho_sim) AS obitos_sim, SUM(obitos_cat) AS obitos_cat,
				ROUND(SUM(pct_campo_preenchido * obitos_causas_externas) / SUM(obitos_causas_externas), 1) AS pct_preenchido,
				MAX(CASE WHEN sim_preliminar THEN 1 ELSE 0 END) AS sim_preliminar,
				MIN(CASE WHEN ano_completo_cat THEN 1 ELSE 0 END) AS cat_completo
			FROM sim_obitos_trabalho_uf GROUP BY ano ORDER BY ano`
		);
		const year = years.findLast((row) => !row.sim_preliminar)?.ano;
		if (year === undefined) throw new Error('Datamart sem ano fechado no SIM');
		const [states, causes] = await Promise.all([
			rows(
				query,
				UfRow,
				`SELECT uf, obitos_trabalho_sim, obitos_cat, pct_campo_preenchido
				FROM sim_obitos_trabalho_uf WHERE ano = ? ORDER BY uf`,
				[year]
			),
			rows(
				query,
				CauseRow,
				`SELECT grupo_causa, SUM(obitos) AS obitos FROM sim_obitos_trabalho_perfil
				WHERE ano = ? GROUP BY grupo_causa ORDER BY obitos DESC`,
				[year]
			)
		]);
		return {
			year,
			years: years.map((row) => ({
				year: row.ano,
				simDeaths: row.obitos_sim,
				catDeaths: row.obitos_cat,
				filledPct: row.pct_preenchido,
				simPreliminary: row.sim_preliminar,
				catComplete: row.cat_completo
			})),
			states: states.map((row) => ({
				uf: row.uf,
				simDeaths: row.obitos_trabalho_sim,
				catDeaths: row.obitos_cat,
				filledPct: row.pct_campo_preenchido
			})),
			causes: causes.map((row) => ({ cause: row.grupo_causa, deaths: row.obitos }))
		};
	})();
}
