import * as z from 'zod';
import { cached, rows, type Query } from './query.ts';

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
}

/** Totals of the current edition of the employer register for slave-like labour. */
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
		return {
			updatedAt: edition.atualizado_em,
			employers: edition.empregadores,
			workers: edition.trabalhadores,
			individualEmployers: edition.empregadores_pessoa_fisica,
			courtOrdered: edition.inclusoes_judiciais
		};
	})();
}
