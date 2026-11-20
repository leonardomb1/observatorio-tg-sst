import { resolve } from '$app/paths';
import type { IconName } from '#lib/components/Icon.svelte';
import type { Dimension } from './filters.ts';

interface Section {
	id: string;
	title: string;
	icon: IconName;
	/** The question the section answers, in one sentence. */
	summary: string;
	/** Page filters the section's source can apply; the others are ignored there, with a notice. */
	dims: readonly Dimension[];
	/** Whether the year filter applies. */
	year: boolean;
}

export interface Group {
	slug: 'acidentes' | 'saude-do-trabalhador' | 'trabalho-e-informalidade' | 'internacional';
	title: string;
	icon: IconName;
	summary: string;
	sections: readonly Section[];
}

const ACCIDENT_DIMS: readonly Dimension[] = [
	'uf',
	'municipio',
	'sexo',
	'idade',
	'atividade',
	'ocupacao',
	'tipo',
	'agente',
	'lesao',
	'parte'
];
const HEALTH_DIMS: readonly Dimension[] = ['uf', 'sexo', 'idade', 'raca', 'ocupacao'];

/** The four subject groups, each one page with a section per topic, in menu order. */
export const GROUPS: readonly Group[] = [
	{
		slug: 'acidentes',
		title: 'Acidentes',
		icon: 'triangle-alert',
		summary:
			'Acidentes e óbitos comunicados por CAT, onde e em que trabalho acontecem, quem se acidenta e o que vem depois.',
		sections: [
			{
				id: 'visao-geral',
				title: 'Visão geral',
				icon: 'chart',
				summary: 'Acidentes e óbitos por ano e a taxa por vínculo formal.',
				dims: ACCIDENT_DIMS,
				year: true
			},
			{
				id: 'estados',
				title: 'Estados',
				icon: 'map',
				summary: 'Onde o risco é maior, pela taxa de cada unidade federativa.',
				dims: ACCIDENT_DIMS,
				year: true
			},
			{
				id: 'municipios',
				title: 'Municípios',
				icon: 'map',
				summary: 'Os municípios com mais acidentes, e o mapa de cada estado município a município.',
				dims: ACCIDENT_DIMS,
				year: true
			},
			{
				id: 'atividades',
				title: 'Atividades e ocupações',
				icon: 'factory',
				summary: 'Em que atividade econômica e em que ocupação os acidentes se concentram.',
				dims: ACCIDENT_DIMS,
				year: true
			},
			{
				id: 'perfil',
				title: 'Quem se acidenta',
				icon: 'users',
				summary: 'Acidentes por sexo e faixa etária.',
				dims: ACCIDENT_DIMS,
				year: true
			},
			{
				id: 'como-acontece',
				title: 'Como acontece',
				icon: 'triangle-alert',
				summary:
					'Agente causador, natureza da lesão, parte do corpo e diagnóstico, nos acidentes e nos óbitos.',
				dims: ACCIDENT_DIMS,
				year: true
			},
			{
				id: 'quando',
				title: 'Quando acontece',
				icon: 'activity',
				summary: 'Acidentes por mês e por dia da semana, e quem emite a comunicação.',
				dims: ACCIDENT_DIMS,
				year: true
			},
			{
				id: 'adolescentes',
				title: 'Adolescentes',
				icon: 'user',
				summary: 'Acidentes de trabalhadores com até 17 anos: onde, em que atividade e como.',
				dims: ACCIDENT_DIMS.filter((key) => key !== 'idade'),
				year: true
			},
			{
				id: 'beneficios',
				title: 'Benefícios',
				icon: 'wallet',
				summary:
					'Benefícios acidentários concedidos pelo INSS: auxílios, aposentadorias, pensões e auxílio-acidente, quanto duram e quanto custam.',
				dims: ['uf', 'sexo', 'idade', 'atividade'],
				year: true
			},
			{
				id: 'raca-escolaridade',
				title: 'Raça e escolaridade',
				icon: 'users',
				summary: 'Acidentes por raça/cor e escolaridade, e quem chega à Previdência sem CAT.',
				dims: ['uf'],
				year: false
			},
			{
				id: 'caminhoneiros',
				title: 'Caminhoneiros',
				icon: 'truck',
				summary: 'Condutores de caminhão em acidentes nas rodovias federais.',
				dims: ['uf', 'sexo', 'idade'],
				year: true
			}
		]
	},
	{
		slug: 'saude-do-trabalhador',
		title: 'Saúde do trabalhador',
		icon: 'heart-pulse',
		summary:
			'Adoecimento ligado ao trabalho que a CAT não mostra: afastamentos por transtorno mental, notificações e mortes no SUS.',
		sections: [
			{
				id: 'saude-mental',
				title: 'Saúde mental',
				icon: 'heart-pulse',
				summary:
					'Afastamentos do INSS por transtorno mental e quantos têm o vínculo com o trabalho reconhecido.',
				dims: ['uf', 'sexo'],
				year: true
			},
			{
				id: 'notificacoes-sus',
				title: 'Notificações no SUS',
				icon: 'activity',
				summary:
					'Agravos de saúde do trabalhador notificados ao SUS, inclusive de quem trabalha sem carteira.',
				dims: [...HEALTH_DIMS, 'agravo'],
				year: true
			},
			{
				id: 'mortes-no-sus',
				title: 'Mortes no SUS',
				icon: 'file',
				summary: 'Óbitos por acidente de trabalho no registro de mortalidade do SUS.',
				dims: HEALTH_DIMS,
				year: true
			}
		]
	},
	{
		slug: 'trabalho-e-informalidade',
		title: 'Trabalho e informalidade',
		icon: 'briefcase',
		summary:
			'O mercado de trabalho por trás das taxas: quem fica fora do emprego formal, quanto ele gira e o trabalho escravo.',
		sections: [
			{
				id: 'informalidade',
				title: 'Informalidade',
				icon: 'briefcase',
				summary: 'Quanto do trabalho fica fora do emprego formal que as taxas medem.',
				dims: ['uf'],
				year: false
			},
			{
				id: 'rotatividade',
				title: 'Rotatividade',
				icon: 'repeat',
				summary: 'Quanto o emprego formal troca de trabalhadores em cada estado e atividade.',
				dims: ['uf', 'atividade'],
				year: true
			},
			{
				id: 'trabalho-escravo',
				title: 'Trabalho escravo',
				icon: 'link',
				summary: 'Empregadores e trabalhadores do cadastro de trabalho análogo à escravidão.',
				dims: ['uf', 'atividade'],
				year: true
			}
		]
	},
	{
		slug: 'internacional',
		title: 'Internacional',
		icon: 'globe',
		summary: 'O Brasil ao lado da União Europeia, dos Estados Unidos e de outros países.',
		sections: [
			{
				id: 'europa',
				title: 'Europa',
				icon: 'globe',
				summary: 'Taxa de óbitos por atividade econômica no Brasil e na União Europeia.',
				dims: [],
				year: false
			},
			{
				id: 'estados-unidos',
				title: 'Estados Unidos',
				icon: 'globe',
				summary: 'Mortes e casos registráveis nos Estados Unidos, pela OSHA.',
				dims: [],
				year: false
			},
			{
				id: 'oit',
				title: 'OIT',
				icon: 'globe',
				summary: 'Taxa de acidentes fatais por país, pelas estatísticas da OIT.',
				dims: [],
				year: false
			}
		]
	}
];

export function findGroup(slug: Group['slug']): Group {
	const group = GROUPS.find((each) => each.slug === slug);
	if (!group) throw new Error(`Grupo desconhecido: ${slug}`);
	return group;
}

/** Path of a group's page; links add the site-wide search with `globalSearch`. */
export function groupPath(slug: Group['slug']): string {
	switch (slug) {
		case 'acidentes':
			return resolve('/(grupos)/acidentes');
		case 'saude-do-trabalhador':
			return resolve('/(grupos)/saude-do-trabalhador');
		case 'trabalho-e-informalidade':
			return resolve('/(grupos)/trabalho-e-informalidade');
		case 'internacional':
			return resolve('/(grupos)/internacional');
	}
}
