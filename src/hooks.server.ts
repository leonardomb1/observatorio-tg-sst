import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';

const securityHeaders = {
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'strict-origin-when-cross-origin',
	'permissions-policy': 'camera=(), microphone=(), geolocation=()',
	'x-frame-options': 'SAMEORIGIN'
};

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	for (const [name, value] of Object.entries(securityHeaders)) {
		response.headers.set(name, value);
	}
	return response;
};

export const handleError: HandleServerError = ({ kind, error, event }) => {
	const id = crypto.randomUUID();
	if (kind === 'unknown') {
		console.error(
			JSON.stringify({ level: 'error', id, path: event.url.pathname, error: String(error) })
		);
	}
	return { id };
};
