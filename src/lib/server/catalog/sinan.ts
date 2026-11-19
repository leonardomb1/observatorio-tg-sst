import * as z from 'zod';
import { cached, rows, type Query } from './query.ts';

const flag = z.union([z.number(), z.boolean()]).transform(Boolean);

const ConditionRow = z.object({
	agravo: z.string(),
	agravo_nome: z.string(),
	notificacoes: z.number(),
	pct_informal: z.number().nullable(),
	pct_com_cat: z.number().nullable()
});

const SituationRow = z.object({
	situacao_trabalho: z.string(),
	vinculo: z.string().nullable(),
	notificacoes: z.number(),
	pct_com_cat: z.number().nullable()
});

const DeathRow = z.object({
	ano: z.number().int(),
	preliminar: flag,
	obitos: z.number(),
	notificacoes: z.number()
});

export interface SinanNotifications {
	/** Last year published as final; later ones are still receiving notifications. */
	year: number;
	conditions: {
		code: string;
		name: string;
		notifications: number;
		informalPct: number | null;
		withCatPct: number | null;
	}[];
	/** Serious work accidents by labour-market situation, in the final year. */
	situations: {
		situation: string;
		bond: string | null;
		notifications: number;
		withCatPct: number | null;
	}[];
	/** Serious work accidents and the deaths among them, per year. */
	seriousYears: { year: number; preliminary: boolean; deaths: number; notifications: number }[];
}

/** Worker-health conditions notified to the health system, and how much of it reaches the CAT. */
export function sinanNotifications(query: Query) {
	return cached('sinan-notifications', async (): Promise<SinanNotifications> => {
		const seriousYears = await rows(
			query,
			DeathRow,
			`SELECT ano, MAX(CASE WHEN preliminar THEN 1 ELSE 0 END) AS preliminar,
				SUM(obitos) AS obitos, SUM(notificacoes) AS notificacoes
			FROM sinan_agravo_uf WHERE agravo = 'ACGR' GROUP BY ano ORDER BY ano`
		);
		const year = seriousYears.findLast((row) => !row.preliminar)?.ano;
		if (year === undefined) throw new Error('Datamart sem ano final do SINAN');
		const [conditions, situations] = await Promise.all([
			rows(
				query,
				ConditionRow,
				`SELECT agravo, agravo_nome, SUM(notificacoes) AS notificacoes,
					ROUND(SUM(informais) * 100.0 / NULLIF(SUM(informais + formais), 0), 1) AS pct_informal,
					ROUND(SUM(com_cat) * 100.0 / SUM(notificacoes), 1) AS pct_com_cat
				FROM sinan_agravo_uf WHERE ano = ?
				GROUP BY agravo, agravo_nome ORDER BY notificacoes DESC`,
				[year]
			),
			rows(
				query,
				SituationRow,
				`SELECT situacao_trabalho, vinculo, notificacoes, pct_com_cat
				FROM sinan_situacao_trabalho
				WHERE agravo = 'ACGR' AND ano = ? AND situacao_trabalho IS NOT NULL
				ORDER BY notificacoes DESC`,
				[year]
			)
		]);
		return {
			year,
			conditions: conditions.map((row) => ({
				code: row.agravo,
				name: row.agravo_nome,
				notifications: row.notificacoes,
				informalPct: row.pct_informal,
				withCatPct: row.pct_com_cat
			})),
			situations: situations.map((row) => ({
				situation: row.situacao_trabalho,
				bond: row.vinculo,
				notifications: row.notificacoes,
				withCatPct: row.pct_com_cat
			})),
			seriousYears: seriousYears.map((row) => ({
				year: row.ano,
				preliminary: row.preliminar,
				deaths: row.obitos,
				notifications: row.notificacoes
			}))
		};
	})();
}
