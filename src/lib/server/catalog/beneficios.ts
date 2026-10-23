import * as z from 'zod';
import { cached, rows, type Query } from './query.ts';

const BenefitRow = z.object({
	ano: z.number().int(),
	especie_codigo: z.string(),
	especie: z.string(),
	meses: z.number().int(),
	concessoes: z.number(),
	rmi_mediana: z.number().nullable(),
	ultimo_periodo: z.string().regex(/^\d{6}$/)
});

interface BenefitYear {
	year: number;
	code: string;
	kind: string;
	/** Months with published concessions; fewer than 12 marks a partial year. */
	months: number;
	grants: number;
	/** Monthly median RMI in minimum wages, averaged over the months weighted by grants with a valid RMI. */
	medianRmi: number | null;
}

export interface Benefits {
	years: BenefitYear[];
	publishedUntil: { year: number; month: number };
}

/** Accident-related INSS grants per year and espécie (espécie 36 is excluded upstream). */
export function benefitsByYear(query: Query) {
	return cached('benefits-by-year', async (): Promise<Benefits> => {
		const result = await rows(
			query,
			BenefitRow,
			`SELECT ano, especie_codigo, especie,
				COUNT(DISTINCT periodo) AS meses,
				SUM(concessoes) AS concessoes,
				SUM(rmi_mediana * rmi_n) / NULLIF(SUM(CASE WHEN rmi_mediana IS NOT NULL THEN rmi_n END), 0) AS rmi_mediana,
				(SELECT MAX(periodo) FROM beneficios_mensal) AS ultimo_periodo
			FROM beneficios_mensal WHERE ano IS NOT NULL
			GROUP BY ano, especie_codigo, especie ORDER BY ano, concessoes DESC`
		);
		const last = result[0]?.ultimo_periodo;
		if (!last) throw new Error('Datamart sem concessões de benefícios');
		return {
			years: result.map((row) => ({
				year: row.ano,
				code: row.especie_codigo,
				kind: row.especie,
				months: row.meses,
				grants: row.concessoes,
				medianRmi: row.rmi_mediana
			})),
			publishedUntil: { year: Number(last.slice(0, 4)), month: Number(last.slice(4)) }
		};
	})();
}
