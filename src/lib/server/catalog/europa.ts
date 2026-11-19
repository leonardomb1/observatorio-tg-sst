import * as z from 'zod';
import { cached, rows, type Query } from './query.ts';

const SectorRow = z.object({
	ano: z.number().int(),
	divisao: z.string(),
	divisao_nome: z.string().nullable(),
	vinculos_ativos: z.number(),
	obitos_brasil: z.number(),
	obitos_por_100mil_brasil: z.number().nullable(),
	obitos_por_100mil_ue27: z.number().nullable(),
	razao_brasil_ue27: z.number().nullable()
});

const TotalRow = z.object({
	ano: z.number().int(),
	brasil: z.number().nullable(),
	ue27: z.number().nullable()
});

export interface EuropeComparison {
	year: number;
	sectors: {
		division: string;
		name: string;
		ties: number;
		deaths: number;
		brazilRate: number | null;
		euRate: number | null;
		ratio: number | null;
	}[];
	/** Fatal rate per 100k: Brazil over formal ties (consolidated years only), EU-27 over persons employed. */
	totals: { year: number; brazil: number | null; eu: number | null }[];
}

/** Fatal rates by economic division, Brazil against the EU-27, and the national series of both. */
export function europeComparison(query: Query) {
	return cached('europe-comparison', async (): Promise<EuropeComparison> => {
		const [sectors, totals] = await Promise.all([
			rows(
				query,
				SectorRow,
				`SELECT ano, divisao, divisao_nome, vinculos_ativos, obitos_brasil,
					obitos_por_100mil_brasil, obitos_por_100mil_ue27, razao_brasil_ue27
				FROM comparacao_setorial_europa
				WHERE base_suficiente AND ano = (SELECT MAX(ano) FROM comparacao_setorial_europa)`
			),
			rows(
				query,
				TotalRow,
				`SELECT e.ano,
					MAX(CASE WHEN b.ano_status = 'consolidado' THEN b.obitos_por_100mil_vinculos END) AS brasil,
					MAX(e.taxa_por_100mil_ocupados) AS ue27
				FROM esaw_setor e
				LEFT JOIN taxa_incidencia_brasil b ON b.ano = e.ano
				WHERE e.gravidade = 'fatal' AND e.geo = 'EU27_2020' AND e.nace_r2 = 'TOTAL' AND e.ano >= 2015
				GROUP BY e.ano ORDER BY e.ano`
			)
		]);
		const year = sectors[0]?.ano;
		if (year === undefined) throw new Error('Datamart sem a comparação setorial com a Europa');
		return {
			year,
			sectors: sectors.map((row) => ({
				division: row.divisao,
				name: row.divisao_nome ?? `Divisão ${row.divisao}`,
				ties: row.vinculos_ativos,
				deaths: row.obitos_brasil,
				brazilRate: row.obitos_por_100mil_brasil,
				euRate: row.obitos_por_100mil_ue27,
				ratio: row.razao_brasil_ue27
			})),
			totals: totals.map((row) => ({ year: row.ano, brazil: row.brasil, eu: row.ue27 }))
		};
	})();
}
