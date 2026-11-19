import * as z from 'zod';
import { cached, rows, type Query } from './query.ts';

const SectionRow = z.object({
	cnae_secao: z.string().nullable(),
	empregadores: z.number(),
	trabalhadores: z.number().nullable()
});

const UfRow = z.object({
	uf: z.string().nullable(),
	empregadores: z.number(),
	trabalhadores: z.number().nullable()
});

const EditionRow = z.object({
	atualizado_em: z.string(),
	empregadores: z.number(),
	trabalhadores: z.number(),
	empregadores_pessoa_fisica: z.number(),
	inclusoes_judiciais: z.number()
});

export interface SlaveRegister {
	/** Update date of the edition shown, as published (YYYY-MM-DD). */
	updatedAt: string;
	employers: number;
	workers: number;
	individualEmployers: number;
	courtOrdered: number;
	sections: { section: string | null; employers: number; workers: number | null }[];
	states: { uf: string | null; employers: number; workers: number | null }[];
}

/** Current edition of the employer register for slave-like labour, by activity and state. */
export function slaveRegister(query: Query) {
	return cached('slave-register', async (): Promise<SlaveRegister> => {
		const editions = await rows(
			query,
			EditionRow,
			`SELECT CAST(atualizado_em AS VARCHAR) AS atualizado_em, empregadores, trabalhadores,
				empregadores_pessoa_fisica, inclusoes_judiciais
			FROM trabalho_escravo_edicoes ORDER BY atualizado_em DESC LIMIT 1`
		);
		const edition = editions[0];
		if (!edition) throw new Error('Datamart sem o cadastro de empregadores');
		const [sections, states] = await Promise.all([
			rows(
				query,
				SectionRow,
				`SELECT cnae_secao, SUM(empregadores) AS empregadores, SUM(trabalhadores) AS trabalhadores
				FROM trabalho_escravo_cadastro GROUP BY cnae_secao ORDER BY trabalhadores DESC`
			),
			rows(
				query,
				UfRow,
				`SELECT uf, SUM(empregadores) AS empregadores, SUM(trabalhadores) AS trabalhadores
				FROM trabalho_escravo_cadastro GROUP BY uf ORDER BY trabalhadores DESC`
			)
		]);
		return {
			updatedAt: edition.atualizado_em,
			employers: edition.empregadores,
			workers: edition.trabalhadores,
			individualEmployers: edition.empregadores_pessoa_fisica,
			courtOrdered: edition.inclusoes_judiciais,
			sections: sections.map((row) => ({
				section: row.cnae_secao,
				employers: row.empregadores,
				workers: row.trabalhadores
			})),
			states: states.map((row) => ({
				uf: row.uf,
				employers: row.empregadores,
				workers: row.trabalhadores
			}))
		};
	})();
}
