import * as z from 'zod';
import { cached, rows, type Query } from './query.ts';

const ValueRow = z.object({ valor: z.string() });
const MunicipalityRow = z.object({ municipio_codigo: z.string(), municipio: z.string() });

export interface CatOptions {
	agents: string[];
	injuries: string[];
	bodyParts: string[];
}

/** Values of the CAT's long classifications, most frequent first, for the filter bar. */
export function catOptions(query: Query) {
	return cached('cat-options', async (): Promise<CatOptions> => {
		const values = (column: string) =>
			rows(
				query,
				ValueRow,
				`SELECT ${column} AS valor FROM cat_fato WHERE ${column} IS NOT NULL
				GROUP BY ${column} ORDER BY COUNT(*) DESC`
			).then((result) => result.map((row) => row.valor));
		const [agents, injuries, bodyParts] = await Promise.all([
			values('agente_familia'),
			values('natureza_familia'),
			values('parte_familia')
		]);
		return { agents, injuries, bodyParts };
	})();
}

export interface Municipality {
	code: string;
	name: string;
	uf: string;
}

const AllMunicipalityRow = MunicipalityRow.extend({ uf_sigla: z.string() });

/** Every municipality by six-digit IBGE code, alphabetically. */
export function municipalities(query: Query) {
	return cached('municipalities', async (): Promise<Municipality[]> => {
		const result = await rows(
			query,
			AllMunicipalityRow,
			'SELECT municipio_codigo, municipio, uf_sigla FROM dim_municipio ORDER BY municipio'
		);
		return result.map((row) => ({
			code: row.municipio_codigo,
			name: row.municipio,
			uf: row.uf_sigla
		}));
	})();
}

const CidRow = z.object({ cid10_categoria: z.string(), cid10_descricao: z.string().nullable() });

/** Names of the ICD-10 categories the INSS grants carry, by three-character code. */
export function cidNames(query: Query) {
	return cached('cid-names', async (): Promise<Record<string, string>> => {
		const result = await rows(
			query,
			CidRow,
			`SELECT cid10_categoria, MAX(cid10_descricao) AS cid10_descricao FROM incapacidade_cid
			WHERE cid10_categoria IS NOT NULL GROUP BY cid10_categoria`
		);
		return Object.fromEntries(
			result.map((row) => [
				row.cid10_categoria,
				row.cid10_descricao ? `${row.cid10_categoria} ${row.cid10_descricao}` : row.cid10_categoria
			])
		);
	})();
}
