import * as z from 'zod';
import type { YearStatus } from '#lib/status.ts';
import { cached, rows, type Query } from './query.ts';

const status = z.enum(['consolidado', 'provisorio', 'parcial']);

const YearRow = z.object({
	ano: z.number().int(),
	cats: z.number(),
	meses_lacuna: z.number(),
	meses_baixos: z.number(),
	ano_status: status,
	cobertura_aeat_pct: z.number().nullable()
});

const MonthRow = z.object({
	ano: z.number().int(),
	mes: z.number().int(),
	status_mes: z.string()
});

interface Year {
	year: number;
	status: YearStatus;
	cats: number;
	gapMonths: number;
	lowMonths: number;
	aeatCoveragePct: number | null;
}

export interface Calendar {
	years: Year[];
	lastConsolidated: number;
	/** Last month with a published CAT file, e.g. { year: 2026, month: 8 }. */
	publishedUntil: { year: number; month: number };
}

export function calendar(query: Query) {
	return cached('calendar', async (): Promise<Calendar> => {
		const [years, months] = await Promise.all([
			rows(
				query,
				YearRow,
				'SELECT ano, cats, meses_lacuna, meses_baixos, ano_status, cobertura_aeat_pct FROM status_ano WHERE ano IS NOT NULL ORDER BY ano'
			),
			rows(
				query,
				MonthRow,
				"SELECT ano, mes, status_mes FROM cobertura_cat_mensal WHERE status_mes <> 'nao_publicado' ORDER BY ano DESC, mes DESC LIMIT 1"
			)
		]);
		const consolidated = years
			.filter((row) => row.ano_status === 'consolidado')
			.map((row) => row.ano);
		const last = months[0];
		if (consolidated.length === 0 || !last) throw new Error('Datamart sem anos consolidados');
		return {
			years: years.map((row) => ({
				year: row.ano,
				status: row.ano_status,
				cats: row.cats,
				gapMonths: row.meses_lacuna,
				lowMonths: row.meses_baixos,
				aeatCoveragePct: row.cobertura_aeat_pct
			})),
			lastConsolidated: Math.max(...consolidated),
			publishedUntil: { year: last.ano, month: last.mes }
		};
	})();
}

const monthStatus = z.enum(['ok', 'baixo', 'atipico', 'lacuna', 'ausente', 'nao_publicado']);

type MonthStatus = z.infer<typeof monthStatus>;

const CoverageRow = z.object({
	ano: z.number().int(),
	mes: z.number().int().min(1).max(12),
	cats: z.number(),
	razao_esperado: z.number().nullable(),
	status_mes: monthStatus,
	nota: z.string().nullable()
});

export interface CoverageMonth {
	year: number;
	month: number;
	cats: number;
	/** CATs over the volume expected for that calendar month at that year's level; 1 is as expected. */
	expectedRatio: number | null;
	status: MonthStatus;
	note: string | null;
}

/** Every year × month of the CAT series with its completeness verdict. */
export function coverage(query: Query) {
	return cached('coverage', async () => {
		const result = await rows(
			query,
			CoverageRow,
			'SELECT ano, mes, cats, razao_esperado, status_mes, nota FROM cobertura_cat_mensal WHERE ano IS NOT NULL ORDER BY ano, mes'
		);
		return result.map((row): CoverageMonth => ({
			year: row.ano,
			month: row.mes,
			cats: row.cats,
			expectedRatio: row.razao_esperado,
			status: row.status_mes,
			note: row.nota
		}));
	})();
}
