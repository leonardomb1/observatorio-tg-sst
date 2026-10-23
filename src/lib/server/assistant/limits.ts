import { createHash, randomBytes } from 'node:crypto';

const salt = randomBytes(16).toString('hex');
let day = '';
const perConnection = new Map<string, number>();

/**
 * Counts today's questions from one network address. Only a salted hash is kept,
 * in memory, and the map is dropped at midnight, so no address is ever stored.
 */
export function countConnection(address: string): number {
	const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
	if (today !== day) {
		day = today;
		perConnection.clear();
	}
	const key = createHash('sha256')
		.update(salt + address)
		.digest('base64url');
	const count = (perConnection.get(key) ?? 0) + 1;
	perConnection.set(key, count);
	return count;
}
