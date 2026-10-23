import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { RequestHandler } from './$types';

/** The old page defaulted to deaths, so links without `medida` keep showing deaths. */
export const GET: RequestHandler = ({ url }) => {
	const params = new URLSearchParams(url.search);
	if (!params.has('medida')) params.set('medida', 'obitos');
	const target = new URL(`${resolve('/(historia)')}?${params.toString()}#atividades`, url);
	redirect(301, `${target.pathname}${target.search}${target.hash}`);
};
