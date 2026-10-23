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
