import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { extractText } from 'unpdf';

const run = promisify(execFile);

export interface Page {
	number: number | null;
	text: string;
}

export interface Extraction {
	pages: Page[];
	ocrPages: number;
	extractor: string;
}

const MIN_TEXT_PER_PAGE = 50;
const OCR_TIMEOUT_MS = 120_000;

async function ocrPage(pdfPath: string, workdir: string, page: number): Promise<string> {
	const prefix = join(workdir, `p${page}`);
	await run(
		'pdftoppm',
		[
			'-f',
			String(page),
			'-l',
			String(page),
			'-r',
			'300',
			'-gray',
			'-png',
			'-singlefile',
			pdfPath,
			prefix
		],
		{ timeout: OCR_TIMEOUT_MS }
	);
	const { stdout } = await run(
		'tesseract',
		[`${prefix}.png`, 'stdout', '-l', 'por', '--psm', '3'],
		{
			timeout: OCR_TIMEOUT_MS,
			maxBuffer: 16 * 1024 * 1024
		}
	);
	await rm(`${prefix}.png`, { force: true });
	return stdout;
}

/** Text layer per page; pages without one are rendered and run through Tesseract. */
async function extractPdf(
	bytes: Uint8Array,
	onOcrPage: (done: number, total: number) => Promise<void>
): Promise<Extraction> {
	const { text } = await extractText(new Uint8Array(bytes), { mergePages: false });
	const missing = text.flatMap((pageText, index) =>
		pageText.trim().length < MIN_TEXT_PER_PAGE ? [index] : []
	);
	if (missing.length === 0) {
		return {
			pages: text.map((pageText, index) => ({ number: index + 1, text: pageText })),
			ocrPages: 0,
			extractor: 'unpdf'
		};
	}

	const workdir = await mkdtemp(join(tmpdir(), 'ocr-'));
	try {
		const pdfPath = join(workdir, 'source.pdf');
		await writeFile(pdfPath, bytes);
		const pages = [...text];
		for (const [done, index] of missing.entries()) {
			pages[index] = await ocrPage(pdfPath, workdir, index + 1);
			await onOcrPage(done + 1, missing.length);
		}
		return {
			pages: pages.map((pageText, index) => ({ number: index + 1, text: pageText })),
			ocrPages: missing.length,
			extractor: 'unpdf+tesseract'
		};
	} finally {
		await rm(workdir, { recursive: true, force: true });
	}
}

export async function extract(
	bytes: Uint8Array,
	mimeType: string,
	onOcrPage: (done: number, total: number) => Promise<void> = () => Promise.resolve()
): Promise<Extraction> {
	if (mimeType === 'application/pdf') return extractPdf(bytes, onOcrPage);
	if (mimeType.startsWith('text/')) {
		return {
			pages: [{ number: null, text: new TextDecoder('utf-8').decode(bytes) }],
			ocrPages: 0,
			extractor: 'utf8'
		};
	}
	throw new Error(`Formato não suportado: ${mimeType}`);
}
