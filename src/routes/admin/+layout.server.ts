import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	admin: locals.admin ? { username: locals.admin.username } : null
});
