import * as z from 'zod';
import { cached, rows, type Query } from './query.ts';

const LethalityRow = z.object({
	tipo_acidente: z.string(),
	acidentes: z.number(),
	obitos: z.number(),
	obitos_por_100mil_acidentes: z.number(),
	anos_incluidos: z.string()
});

export interface Lethality {
	type: string;
	accidents: number;
	deaths: number;
	deathsPer100kAccidents: number;
	years: string;
}

/** Pooled over consolidated years only, as published by the datamart. */
export function lethalityByType(query: Query) {
	return cached('lethality-by-type', async () => {
		const result = await rows(
			query,
			LethalityRow,
			'SELECT tipo_acidente, acidentes, obitos, obitos_por_100mil_acidentes, anos_incluidos FROM letalidade_por_tipo ORDER BY obitos_por_100mil_acidentes DESC'
		);
		return result.map((row): Lethality => ({
			type: row.tipo_acidente,
			accidents: row.acidentes,
			deaths: row.obitos,
			deathsPer100kAccidents: row.obitos_por_100mil_acidentes,
			years: row.anos_incluidos
		}));
	})();
}
