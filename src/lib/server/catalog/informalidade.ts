import * as z from 'zod';
import { cached, rows, type Query } from './query.ts';

const CoverageRow = z.object({
	ano: z.number().int(),
	uf: z.string(),
	vinculos_por_100_ocupados: z.number(),
	taxa_informalidade_pct: z.number().nullable(),
	ocupados_mil: z.number()
});

const QuarterRow = z.object({
	trimestre: z.number().int(),
	sexo: z.string(),
	taxa_informalidade_pct: z.number()
});

export interface Informality {
	year: number;
	states: {
		uf: string;
		/** Formal employment ties (RAIS, 31 Dec) per 100 people employed (PNAD, 4th quarter). */
		tiesPerHundred: number;
		informalityPct: number | null;
		employedThousands: number;
	}[];
	/** National informality rate per quarter, by sex. */
	quarters: { quarter: number; sex: string; ratePct: number }[];
}

/** How much of the work force the formal denominator reaches, and the informality behind it. */
export function informality(query: Query) {
	return cached('informality', async (): Promise<Informality> => {
		const [states, quarters] = await Promise.all([
			rows(
				query,
				CoverageRow,
				`SELECT ano, uf, vinculos_por_100_ocupados, taxa_informalidade_pct, ocupados_mil
				FROM cobertura_denominador_uf
				WHERE vinculos_por_100_ocupados IS NOT NULL
					AND ano = (SELECT MAX(ano) FROM cobertura_denominador_uf WHERE vinculos_por_100_ocupados IS NOT NULL)`
			),
			rows(
				query,
				QuarterRow,
				`SELECT trimestre, sexo, taxa_informalidade_pct
				FROM pnad_informalidade
				WHERE nivel = 'pais' AND taxa_informalidade_pct IS NOT NULL
				ORDER BY trimestre`
			)
		]);
		const year = states[0]?.ano;
		if (year === undefined) throw new Error('Datamart sem a cobertura do denominador');
		return {
			year,
			states: states.map((row) => ({
				uf: row.uf,
				tiesPerHundred: row.vinculos_por_100_ocupados,
				informalityPct: row.taxa_informalidade_pct,
				employedThousands: row.ocupados_mil
			})),
			quarters: quarters.map((row) => ({
				quarter: row.trimestre,
				sex: row.sexo,
				ratePct: row.taxa_informalidade_pct
			}))
		};
	})();
}
