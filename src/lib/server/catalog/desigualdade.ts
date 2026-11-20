import * as z from 'zod';
import { cached, rows, type Query } from './query.ts';

const ProfileRow = z.object({
	ano: z.number().int(),
	anuario: z.number().int(),
	dimensao: z.enum(['raca_cor', 'instrucao']),
	categoria: z.string(),
	ordem: z.number().int(),
	acidentes: z.number().nullable(),
	pct_sem_cat: z.number().nullable(),
	pct_entre_informados: z.number().nullable()
});

const UfRow = z.object({
	uf: z.string(),
	pct_negros: z.number().nullable(),
	pct_sem_cat_negros: z.number().nullable(),
	pct_sem_cat_brancos: z.number().nullable()
});

interface ProfileGroup {
	dimension: 'raca_cor' | 'instrucao';
	group: string;
	order: number;
	accidents: number | null;
	/** Share of the group's accidents recognised only through a benefit, without a CAT. */
	withoutCatPct: number | null;
	/** Share among accidents whose race or schooling was recorded. */
	sharePct: number | null;
}

export interface SocialProfile {
	/** State the groups describe; null for Brazil. */
	uf: string | null;
	year: number;
	edition: number;
	groups: ProfileGroup[];
	ufs: {
		uf: string;
		blackSharePct: number | null;
		withoutCatBlackPct: number | null;
		withoutCatWhitePct: number | null;
	}[];
}

/** Accidents by race and schooling from the official yearbook, its last year, for Brazil or a state, and by state. */
export function socialProfile(query: Query) {
	return cached('social-profile', async (uf: string | null): Promise<SocialProfile> => {
		const groups = await rows(
			query,
			ProfileRow,
			`SELECT ano, anuario, dimensao, categoria, ordem, acidentes, pct_sem_cat, pct_entre_informados
			FROM aeat_perfil
			WHERE ${uf === null ? "escopo = 'Brasil'" : "escopo_tipo = 'uf' AND uf_sigla = ?"}
				AND ano = (SELECT MAX(ano) FROM aeat_perfil)
			ORDER BY dimensao, ordem`,
			uf === null ? [] : [uf]
		);
		const first = groups[0];
		if (!first) throw new Error('Datamart sem o perfil do anuário');
		const ufs = await rows(
			query,
			UfRow,
			`SELECT escopo AS uf,
				SUM(CASE WHEN categoria IN ('Preta', 'Parda') THEN pct_entre_informados END) AS pct_negros,
				ROUND(SUM(CASE WHEN categoria IN ('Preta', 'Parda') THEN sem_cat END) * 100.0
					/ NULLIF(SUM(CASE WHEN categoria IN ('Preta', 'Parda') THEN acidentes END), 0), 1) AS pct_sem_cat_negros,
				MAX(CASE WHEN categoria = 'Branca' THEN pct_sem_cat END) AS pct_sem_cat_brancos
			FROM aeat_perfil
			WHERE escopo_tipo = 'uf' AND dimensao = 'raca_cor' AND ano = ?
			GROUP BY escopo ORDER BY escopo`,
			[first.ano]
		);
		return {
			uf,
			year: first.ano,
			edition: first.anuario,
			groups: groups.map((row) => ({
				dimension: row.dimensao,
				group: row.categoria,
				order: row.ordem,
				accidents: row.acidentes,
				withoutCatPct: row.pct_sem_cat,
				sharePct: row.pct_entre_informados
			})),
			ufs: ufs.map((row) => ({
				uf: row.uf,
				blackSharePct: row.pct_negros,
				withoutCatBlackPct: row.pct_sem_cat_negros,
				withoutCatWhitePct: row.pct_sem_cat_brancos
			}))
		};
	});
}
