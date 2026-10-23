import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.ts';
import { originalFile } from '#lib/server/rag/documents.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const file = await originalFile(db, params.version);
	if (!file) error(404, 'Arquivo não encontrado.');
	const filename = encodeURIComponent(file.filename ?? 'documento');
	return new Response(new Uint8Array(file.bytes), {
		headers: {
			'content-type': file.mimeType ?? 'application/octet-stream',
			'content-disposition': `attachment; filename*=UTF-8''${filename}`,
			'cache-control': 'private, no-store'
		}
	});
};
