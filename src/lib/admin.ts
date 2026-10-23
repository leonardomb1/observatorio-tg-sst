export const documentStatusLabel: Record<string, string> = {
	pending: 'Na fila',
	extracting: 'Extraindo texto',
	chunking: 'Dividindo em trechos',
	embedding: 'Vetorizando',
	ready: 'Pronto',
	failed: 'Falhou',
	archived: 'Arquivado'
};

export const jobStateLabel: Record<string, string> = {
	queued: 'Na fila',
	running: 'Executando',
	done: 'Concluída',
	failed: 'Falhou',
	cancelled: 'Cancelada'
};

export const collectionLabel: Record<string, string> = {
	normas: 'Normas Regulamentadoras',
	metodologia: 'Metodologia',
	referencias: 'Referências',
	tese: 'Trabalho de Graduação'
};

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function formatDateTime(value: Date | string | null): string {
	return value ? dateTime.format(new Date(value)) : '—';
}

/** How long an event code stays valid, from the moment it is created. */
export const EVENT_DURATIONS = {
	'4h': { hours: 4, label: '4 horas' },
	'8h': { hours: 8, label: '8 horas' },
	'1d': { hours: 24, label: '1 dia' },
	'3d': { hours: 72, label: '3 dias' },
	'7d': { hours: 168, label: '7 dias' }
} as const;

export type EventDuration = keyof typeof EVENT_DURATIONS;
