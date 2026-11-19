import * as z from 'zod';
import { cached, rows, type Query } from './query.ts';

const status = z.enum(['consolidado', 'provisorio', 'parcial']);

const YearRow = z.object({
	ano: z.number().int(),
	ano_status: status,
	rotatividade_pct: z.number()
});

const SectorRow = z.object({
	cnae_descricao: z.string().nullable(),
	cnae_codigo: z.string(),
	vinculos_ativos: z.number(),
	rotatividade_pct: z.number(),
	acidentes_por_100mil_vinculos: z.number().nullable()
});

export interface Turnover {
	year: number;
	years: { year: number; status: z.infer<typeof status>; ratePct: number }[];
	/** Activities with at least the minimum formal base, highest turnover first. */
	sectors: {
		code: string;
		name: string;
		ties: number;
		turnoverPct: number;
		accidentRate: number | null;
	}[];
}

/** Formal-employment turnover by year and by activity, beside each activity's accident rate. */
export function turnover(query: Query) {
	return cached('turnover', async (): Promise<Turnover> => {
		const years = await rows(
			query,
			YearRow,
			`SELECT ano, MIN(ano_status) AS ano_status,
				ROUND(SUM(LEAST(admissoes, desligamentos)) * 100.0 / SUM(vinculos_ativos), 1) AS rotatividade_pct
			FROM rotatividade_cnae GROUP BY ano ORDER BY ano`
		);
		const year = years.findLast((row) => row.ano_status === 'consolidado')?.ano;
		if (year === undefined) throw new Error('Datamart sem rotatividade em ano consolidado');
		const sectors = await rows(
			query,
			SectorRow,
			`SELECT cnae_descricao, cnae_codigo, vinculos_ativos, rotatividade_pct, acidentes_por_100mil_vinculos
			FROM rotatividade_cnae
			WHERE ano = ? AND base_suficiente
			ORDER BY rotatividade_pct DESC LIMIT 15`,
			[year]
		);
		return {
			year,
			years: years.map((row) => ({
				year: row.ano,
				status: row.ano_status,
				ratePct: row.rotatividade_pct
			})),
			sectors: sectors.map((row) => ({
				code: row.cnae_codigo,
				name: row.cnae_descricao ?? `Classe ${row.cnae_codigo}`,
				ties: row.vinculos_ativos,
				turnoverPct: row.rotatividade_pct,
				accidentRate: row.acidentes_por_100mil_vinculos
			}))
		};
	})();
}
