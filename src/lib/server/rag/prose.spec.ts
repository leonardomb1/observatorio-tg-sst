import { describe, expect, it } from 'vitest';
import { chunkProse } from './prose.ts';

describe('chunkProse', () => {
	it('builds the heading trail from markdown', () => {
		const text =
			'# Metodologia\n\nIntro.\n\n## Denominador\n\nEstoque da RAIS em 31/12.\n\nSem estatutários.';
		const chunks = chunkProse('Nota técnica', [{ number: null, text }]);
		expect(chunks.map((chunk) => chunk.trail)).toEqual([
			'Nota técnica > Metodologia',
			'Nota técnica > Metodologia > Denominador'
		]);
		expect(chunks[1]?.blocks).toEqual(['Estoque da RAIS em 31/12.', 'Sem estatutários.']);
	});

	it('does not repeat the document title in the trail', () => {
		const chunks = chunkProse('Nota técnica', [{ number: null, text: '# Nota técnica\n\nTexto.' }]);
		expect(chunks[0]?.trail).toBe('Nota técnica');
	});

	it('keeps page ranges and drops running headers', () => {
		const pages = [1, 2, 3, 4].map((number) => ({
			number,
			text: `Relatório anual — página ${number}\n\nParágrafo ${'x'.repeat(number)} com conteúdo.`
		}));
		const [chunk] = chunkProse('Relatório', pages);
		expect(chunk?.pageStart).toBe(1);
		expect(chunk?.pageEnd).toBe(4);
		expect(chunk?.content).not.toContain('Relatório anual');
	});

	it('joins words hyphenated across a line break', () => {
		const [chunk] = chunkProse('Doc', [
			{ number: 1, text: 'acidentes de tra-\nbalho registrados' }
		]);
		expect(chunk?.blocks).toEqual(['acidentes de trabalho registrados']);
	});
});
