import { describe, expect, it } from 'vitest';
import { addressKey, withinBurst } from './limits.ts';

describe('withinBurst', () => {
	it('lets the ceiling through and refuses the next one in the same minute', () => {
		const key = addressKey('203.0.113.7');
		const results = Array.from({ length: 4 }, () => withinBurst(key, 3));
		expect(results).toEqual([true, true, true, false]);
	});

	it('keeps separate counts per key', () => {
		expect(withinBurst(addressKey('198.51.100.1'), 1)).toBe(true);
		expect(withinBurst(addressKey('198.51.100.2'), 1)).toBe(true);
	});

	it('never stores the address itself', () => {
		expect(addressKey('203.0.113.7')).not.toContain('203');
	});
});
