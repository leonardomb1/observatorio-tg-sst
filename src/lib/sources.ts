import { formatMonthYear } from './format.ts';

const CAT_RAIS = {
	name: 'INSS (CAT) e RAIS/MTE',
	href: 'https://dadosabertos.inss.gov.br/dataset/inss-comunicacao-de-acidente-de-trabalho-cat'
};

const INSS_BENEFITS = {
	name: 'INSS, benefícios concedidos (dados abertos)',
	href: 'https://dadosabertos.inss.gov.br/'
};

export function benefitsSource(publishedUntil: { year: number; month: number }) {
	return {
		...INSS_BENEFITS,
		updatedAt: `dados até ${formatMonthYear(publishedUntil.year, publishedUntil.month)}`
	};
}

export function catSource(publishedUntil: { year: number; month: number }) {
	return {
		...CAT_RAIS,
		updatedAt: `dados até ${formatMonthYear(publishedUntil.year, publishedUntil.month)}`
	};
}
