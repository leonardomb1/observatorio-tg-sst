export type YearStatus = 'consolidado' | 'provisorio' | 'parcial';

export const yearStatusLabel: Record<YearStatus, string> = {
	consolidado: 'Consolidado',
	provisorio: 'Provisório',
	parcial: 'Parcial'
};

export const yearStatusHint: Record<YearStatus, string> = {
	consolidado: 'Ano fechado e sem atualizações relevantes esperadas.',
	provisorio:
		'Ano fechado, mas comunicações emitidas com atraso ainda estão sendo publicadas. O número tende a subir.',
	parcial: 'Ano em curso: contém apenas os meses já publicados e não é comparável a anos fechados.'
};
