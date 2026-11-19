import * as z from 'zod';
import { cached, rows, type Query } from './query.ts';

const flag = z.union([z.number(), z.boolean()]).transform(Boolean);

const MENTAL = 'Transtornos mentais e comportamentais';

const YearRow = z.object({
	ano: z.number().int(),
	concessoes: z.number(),
	acidentarias: z.number(),
	ano_completo: flag,
	cid_confiavel: flag,
	pct_cid_informado_ano: z.number().nullable()
});

const GroupRow = z.object({
	grupo_cid: z.string(),
	concessoes: z.number(),
	pct_acidentaria: z.number().nullable()
});

const DiagnosisRow = z.object({
	cid10_categoria: z.string(),
	cid10_descricao: z.string().nullable(),
	concessoes: z.number(),
	pct_acidentaria: z.number().nullable()
});

export interface MentalHealth {
	/** Last complete year whose files carry the diagnosis for most grants. */
	year: number;
	years: {
		year: number;
		grants: number;
		accidentGrants: number;
		complete: boolean;
		diagnosisReliable: boolean;
		diagnosisPct: number | null;
	}[];
	groups: { group: string; grants: number; accidentPct: number | null }[];
	diagnoses: { code: string; name: string; grants: number; accidentPct: number | null }[];
}

/** Temporary incapacity leaves for mental disorders, and how many are recognised as work-related. */
export function mentalHealth(query: Query) {
	return cached('mental-health', async (): Promise<MentalHealth> => {
		const years = await rows(
			query,
			YearRow,
			`SELECT ano, SUM(concessoes) AS concessoes, SUM(acidentarias) AS acidentarias,
				MAX(CASE WHEN ano_completo THEN 1 ELSE 0 END) AS ano_completo,
				MAX(CASE WHEN cid_confiavel THEN 1 ELSE 0 END) AS cid_confiavel,
				MAX(pct_cid_informado_ano) AS pct_cid_informado_ano
			FROM incapacidade_grupo_uf
			WHERE grupo_cid = ? AND tipo_incapacidade = 'temporaria'
			GROUP BY ano ORDER BY ano`,
			[MENTAL]
		);
		const year = years.findLast((row) => row.ano_completo && row.cid_confiavel)?.ano;
		if (year === undefined) throw new Error('Datamart sem ano completo com diagnóstico');
		const [groups, diagnoses] = await Promise.all([
			rows(
				query,
				GroupRow,
				`SELECT grupo_cid, SUM(concessoes) AS concessoes,
					ROUND(SUM(acidentarias) * 100.0 / SUM(concessoes), 1) AS pct_acidentaria
				FROM incapacidade_grupo_uf
				WHERE ano = ? AND tipo_incapacidade = 'temporaria' AND grupo_cid IS NOT NULL
				GROUP BY grupo_cid`,
				[year]
			),
			rows(
				query,
				DiagnosisRow,
				`SELECT cid10_categoria, cid10_descricao, concessoes, pct_acidentaria
				FROM incapacidade_cid
				WHERE ano = ? AND grupo_cid = ?
				ORDER BY concessoes DESC LIMIT 10`,
				[year, MENTAL]
			)
		]);
		return {
			year,
			years: years.map((row) => ({
				year: row.ano,
				grants: row.concessoes,
				accidentGrants: row.acidentarias,
				complete: row.ano_completo,
				diagnosisReliable: row.cid_confiavel,
				diagnosisPct: row.pct_cid_informado_ano
			})),
			groups: groups.map((row) => ({
				group: row.grupo_cid,
				grants: row.concessoes,
				accidentPct: row.pct_acidentaria
			})),
			diagnoses: diagnoses.map((row) => ({
				code: row.cid10_categoria,
				name: row.cid10_descricao ?? row.cid10_categoria,
				grants: row.concessoes,
				accidentPct: row.pct_acidentaria
			}))
		};
	})();
}
