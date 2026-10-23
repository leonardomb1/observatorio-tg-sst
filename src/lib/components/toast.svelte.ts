import { createContext } from 'svelte';

export interface Toast {
	id: number;
	message: string;
	tone: 'info' | 'error';
}

export class Toaster {
	items = $state<Toast[]>([]);
	#next = 0;

	show(message: string, tone: Toast['tone'] = 'info', durationMs = 5000) {
		const id = this.#next++;
		this.items.push({ id, message, tone });
		setTimeout(() => {
			this.dismiss(id);
		}, durationMs);
	}

	dismiss(id: number) {
		this.items = this.items.filter((item) => item.id !== id);
	}
}

export const [getToaster, setToaster] = createContext<Toaster>();
