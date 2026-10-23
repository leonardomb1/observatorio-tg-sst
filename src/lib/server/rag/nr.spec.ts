import { describe, expect, it } from 'vitest';
import fixture from './fixtures/nr-26-35.json';
import { MAX_CHUNK_CHARS } from './chunk.ts';
import { detectNrNumber, parseNr } from './nr.ts';

interface Row {
	nr: number;
	item: string;
	ordem: number;
	texto: string;
}

/** The fixture holds rows scraped from the official PDFs; joined in order they are the PDF text. */
function officialText(nr: number): string {
	return (fixture as Row[])
		.filter((row) => row.nr === nr && row.item !== '__integra__')
		.toSorted((a, b) => a.ordem - b.ordem)
		.map((row) => row.texto)
		.join('\n');
}

const nr35 = parseNr(35, officialText(35));
const nr26 = parseNr(26, officialText(26));
const byCode = (code: string) => nr35.chunks.find((chunk) => chunk.itemCode === code);

describe('parseNr', () => {
	it('takes the real title from the preamble', () => {
		expect(nr35.title).toBe('Trabalho em Altura');
		expect(nr26.title).toBe('Sinalização de Segurança');
		expect(nr35.slug).toBe('nr-35');
	});

	it('detects the NR number from the heading', () => {
		expect(detectNrNumber(officialText(35))).toBe(35);
		expect(detectNrNumber('texto sem cabeçalho')).toBeNull();
	});

	it('ignores the publication history before the first item', () => {
		expect(nr35.chunks.some((chunk) => chunk.content.includes('Publicação D.O.U.'))).toBe(false);
	});

	it('removes the page footer', () => {
		expect(nr35.chunks.some((chunk) => /não substitui o publicado/i.test(chunk.content))).toBe(
			false
		);
	});

	it('moves bled section headings into the trail of the next items', () => {
		const item = byCode('35.2.1');
		expect(item?.blocks).toEqual([
			'35.2.1 Aplica-se o disposto nessa Norma a toda atividade com diferença de nível acima de 2,0m (dois metros) do nível inferior, onde haja risco de queda.'
		]);
		expect(byCode('35.5.1')?.trail).toBe(
			'NR-35 – Trabalho em Altura > 35.5 Planejamento e Organização'
		);
		expect(byCode('35.4.4.1')?.content).not.toContain('Planejamento e Organização');
	});

	it('splits alíneas into their own citable blocks', () => {
		const item = byCode('35.3.1');
		expect(item?.blocks[0]).toBe('35.3.1 Cabe à organização:');
		expect(item?.blocks.slice(1).every((block) => /^[a-j]\) /.test(block))).toBe(true);
		expect(item?.blocks).toHaveLength(11);
	});

	it('keeps every main-body item with its parent code', () => {
		const codes = nr35.chunks
			.map((chunk) => chunk.itemCode)
			.filter((code) => code?.startsWith('35.'));
		expect(new Set(codes).size).toBe(55);
		expect(byCode('35.6.9.1.1')?.parentCode).toBe('35.6.9.1');
	});

	it('separates the glossary and the annexes from the last item', () => {
		expect(byCode('35.7.3.1')?.content.length).toBeLessThan(400);
		const glossary = nr35.chunks.filter((chunk) => chunk.trail.endsWith('> Glossário'));
		expect(glossary.length).toBeGreaterThan(10);
		expect(glossary.every((chunk) => chunk.blocks.length === 1)).toBe(true);
		const annexItem = byCode('Anexo I 2.3');
		expect(annexItem?.trail).toBe(
			'NR-35 – Trabalho em Altura > Anexo I – Acesso por Cordas > 2 Campo de Aplicação'
		);
		expect(annexItem?.parentCode).toBeNull();
	});

	it('repairs detached hyphens from the PDF extraction', () => {
		expect(byCode('Anexo I 2.1')?.content).toContain('considera-se');
	});

	it('keeps chunks under the size cap and numbers them in order', () => {
		for (const { chunks } of [nr35, nr26]) {
			expect(chunks.every((chunk) => chunk.blocks.join('\n').length <= MAX_CHUNK_CHARS + 600)).toBe(
				true
			);
			expect(chunks.map((chunk) => chunk.seq)).toEqual(chunks.map((_, index) => index));
		}
	});
});
