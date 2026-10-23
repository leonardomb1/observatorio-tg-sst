import { tool, type InferUITools } from 'ai';
import * as z from 'zod';
import { chartSpec } from '#lib/consulta.ts';
import { toUf } from '#lib/uf.ts';
import { readOnly, type QueryResult } from '../catalog/consulta.ts';
import type { Query } from '../catalog/query.ts';
import type { Db } from '../db/client.ts';
import { search } from '../rag/search.ts';
import type { VoyageConfig } from '../rag/voyage.ts';

export interface ToolDeps {
	query: Query;
	db: Db;
	voyage: VoyageConfig | null;
}

const MODEL_ROWS = 60;
const MODEL_CHARS = 12_000;

/** What the model reads back: enough rows to answer, never the whole result. */
function compact(result: QueryResult) {
	let rows = result.rows.slice(0, MODEL_ROWS);
	while (rows.length > 1 && JSON.stringify(rows).length > MODEL_CHARS) {
		rows = rows.slice(0, Math.ceil(rows.length / 2));
	}
	return {
		columns: result.columns,
		rows,
		totalRows: result.rows.length,
		note:
			rows.length < result.rows.length || result.truncated
				? 'Resultado cortado; agregue mais no SQL se precisar das demais linhas.'
				: null
	};
}

const sql = z
	.string()
	.min(1)
	.describe('Uma instrução SELECT (ou WITH ... SELECT) sobre as visões de dm_sst.');

/** Builds the tools for one request; citation numbers continue from those already in the conversation. */
export function createTools(deps: ToolDeps, firstRef: number) {
	let nextRef = firstRef;

	return {
		consultar_dados: tool({
			description:
				'Executa uma consulta SQL somente leitura no datamart do observatório e devolve as linhas. Use para qualquer número citado na resposta.',
			inputSchema: z.object({
				finalidade: z
					.string()
					.describe('O que a consulta responde, em uma frase curta, exibida ao usuário.'),
				sql
			}),
			execute: ({ sql }) => readOnly(deps.query, sql),
			toModelOutput: ({ output }) => ({ type: 'json', value: compact(output) })
		}),

		mostrar_grafico: tool({
			description:
				'Executa uma consulta SQL e exibe o resultado ao usuário como gráfico com tabela e download. Devolve as mesmas linhas para você comentar.',
			inputSchema: chartSpec.extend({ sql }),
			execute: async ({ sql, ...spec }) => {
				const result = await readOnly(deps.query, sql);
				const missing = [spec.categoria, ...spec.series.map((serie) => serie.coluna)].filter(
					(column) => result.rows.length > 0 && !result.columns.includes(column)
				);
				if (missing.length > 0) {
					throw new Error(
						`Colunas ausentes no resultado: ${missing.join(', ')}. Colunas disponíveis: ${result.columns.join(', ')}.`
					);
				}
				if (
					spec.tipo === 'mapa' &&
					result.rows.some((row) => toUf(String(row[spec.categoria] ?? '')) === null)
				) {
					throw new Error(
						'Para mapa, a coluna de categoria precisa trazer a sigla ou o nome da UF em todas as linhas.'
					);
				}
				return { spec, ...result };
			},
			toModelOutput: ({ output }) => ({
				type: 'json',
				value: { exibido: true, ...compact(output) }
			})
		}),

		buscar_documentos: tool({
			description:
				'Busca trechos nas normas regulamentadoras e nos documentos de referência do observatório. Devolve trechos numerados para citar como [n].',
			inputSchema: z.object({
				consulta: z
					.string()
					.min(3)
					.describe('Pergunta ou termos, em português; inclua o número do item da NR se souber.')
			}),
			execute: async ({ consulta }) => {
				const result = await search(deps.db, deps.voyage, consulta, { k: 6 });
				return {
					results: result.hits.map((hit) => ({
						ref: nextRef++,
						title: hit.title,
						trail: hit.trail,
						itemCode: hit.itemCode,
						pageStart: hit.pageStart,
						pageEnd: hit.pageEnd,
						content: hit.content
					}))
				};
			}
		})
	};
}

export type ConsultaTools = InferUITools<ReturnType<typeof createTools>>;
