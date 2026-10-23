import * as z from 'zod';
import { cached, rows, type Query } from './query.ts';

const FamilyRow = z.object({
	familia: z.string(),
	acidentes: z.number(),
	obitos: z.number()
});

interface FamilyTotal {
	family: string;
	accidents: number;
	deaths: number;
}

type CauseView =
	'acidentes_por_agente' | 'acidentes_por_parte_corpo' | 'acidentes_por_natureza_lesao';

/** Sums a CAT breakdown view to its coded family for one year, largest first. */
function familyTotals(query: Query, view: CauseView) {
	return cached(`family-totals-${view}`, async (year: number) => {
		const result = await rows(
			query,
			FamilyRow,
			`SELECT familia, SUM(acidentes) AS acidentes, SUM(obitos) AS obitos
			FROM ${view} WHERE ano = ? AND familia IS NOT NULL
			GROUP BY familia ORDER BY obitos DESC, acidentes DESC`,
			[year]
		);
		return result.map((row): FamilyTotal => ({
			family: row.familia,
			accidents: row.acidentes,
			deaths: row.obitos
		}));
	});
}

export const agentFamilies = (query: Query) => familyTotals(query, 'acidentes_por_agente');
export const bodyPartFamilies = (query: Query) => familyTotals(query, 'acidentes_por_parte_corpo');
export const injuryFamilies = (query: Query) => familyTotals(query, 'acidentes_por_natureza_lesao');
