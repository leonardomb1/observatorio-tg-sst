import type { UIDataTypes, UIMessage } from 'ai';
import * as z from 'zod';
import type { ConsultaTools } from '#lib/server/assistant/tools.ts';
import { formatDecimal, formatInteger } from './format.ts';

export const chartSpec = z.object({
	tipo: z
		.enum(['colunas', 'barras', 'linhas', 'mapa'])
		.describe(
			'colunas para séries anuais, barras horizontais para ranking de categorias, linhas para comparar séries no tempo, mapa para comparar as UFs no mapa do Brasil (categoria com a sigla ou o nome da UF, uma série)'
		),
	categoria: z
		.string()
		.describe('Coluna do resultado usada no eixo de categorias (ano, UF, CNAE).'),
	series: z
		.array(z.object({ coluna: z.string(), rotulo: z.string() }))
		.min(1)
		.max(4)
		.describe('Colunas numéricas a desenhar, com o rótulo exibido na legenda.'),
	titulo: z.string().describe('Frase que afirma o achado, não o tema.'),
	subtitulo: z.string().describe('Medida, unidade, denominador e período.'),
	formato: z
		.enum(['inteiro', 'decimal', 'percentual'])
		.describe('percentual quando o valor já está em pontos percentuais (12,5 = 12,5%)'),
	casas: z.number().int().min(0).max(3).default(1)
});

export type ChartSpec = z.infer<typeof chartSpec>;

export type ConsultaMessage = UIMessage<unknown, UIDataTypes, ConsultaTools>;

export function specFormat(spec: Pick<ChartSpec, 'formato' | 'casas'>): (value: number) => string {
	if (spec.formato === 'inteiro') return (value) => formatInteger(value);
	if (spec.formato === 'percentual') return (value) => `${formatDecimal(value, spec.casas)}%`;
	return (value) => formatDecimal(value, spec.casas);
}

/** Warehouse cells arrive as numbers, strings or null; charts need numbers or null. */
export function numeric(cell: unknown): number | null {
	if (typeof cell === 'number') return cell;
	if (typeof cell === 'string' && cell.trim() !== '' && !Number.isNaN(Number(cell))) {
		return Number(cell);
	}
	return null;
}
