import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const target = new URL(`${resolve('/(historia)')}${url.search}#estados`, url);
	redirect(301, `${target.pathname}${target.search}${target.hash}`);
};
