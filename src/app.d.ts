import type { SessionUser } from '#lib/server/auth/session.ts';

declare global {
	namespace App {
		interface Error {
			id?: string;
		}
		interface Locals {
			admin?: SessionUser;
			user?: SessionUser;
		}
	}
}

export {};
