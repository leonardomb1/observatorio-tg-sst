import { formatMonthYear } from './format.ts';

const CAT_RAIS = {
	name: 'INSS (CAT) e RAIS/MTE',
	href: 'https://dadosabertos.inss.gov.br/dataset/inss-comunicacao-de-acidente-de-trabalho-cat'
};

const INSS_BENEFITS = {
	name: 'INSS, benefícios concedidos (dados abertos)',
	href: 'https://dadosabertos.inss.gov.br/'
};

/** Public bases behind the topic pages, without the reference date each panel adds. */
export const TOPIC_SOURCES = {
	aeat: {
		name: 'Anuário Estatístico de Acidentes do Trabalho (AEAT), Previdência Social',
		href: 'https://www.gov.br/previdencia/pt-br/assuntos/previdencia-social/saude-e-seguranca-do-trabalhador/acidente_trabalho_incapacidade'
	},
	pnad: {
		name: 'PNAD Contínua, IBGE (SIDRA, tabela 4093), e RAIS/MTE',
		href: 'https://sidra.ibge.gov.br/tabela/4093'
	},
	eurostat: {
		name: 'Eurostat, estatísticas europeias de acidentes de trabalho (ESAW), e CAT/RAIS',
		href: 'https://ec.europa.eu/eurostat/web/health/database'
	},
	caged: {
		name: 'Novo CAGED e RAIS/MTE, e CAT/INSS',
		href: 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho'
	},
	sim: {
		name: 'Sistema de Informações sobre Mortalidade (SIM), Ministério da Saúde, e CAT/INSS',
		href: 'https://dadosabertos.saude.gov.br/dataset/sim'
	},
	incapacidade: {
		name: 'INSS, benefícios concedidos (dados abertos)',
		href: 'https://dadosabertos.inss.gov.br/'
	},
	sinan: {
		name: 'Sistema de Informação de Agravos de Notificação (SINAN), Ministério da Saúde',
		href: 'https://datasus.saude.gov.br/transferencia-de-arquivos/'
	},
	prf: {
		name: 'Polícia Rodoviária Federal, dados abertos de acidentes',
		href: 'https://www.gov.br/prf/pt-br/acesso-a-informacao/dados-abertos/dados-abertos-da-prf'
	},
	escravidao: {
		name: 'Cadastro de Empregadores (trabalho análogo à escravidão), MTE',
		href: 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/areas-de-atuacao/cadastro_de_empregadores'
	}
} as const;

export function topicSource(key: keyof typeof TOPIC_SOURCES, updatedAt: string) {
	return { ...TOPIC_SOURCES[key], updatedAt };
}

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
