import type { IconName } from '#lib/components/Icon.svelte';

export interface Topic {
	slug:
		| 'saude-mental'
		| 'notificacoes-sus'
		| 'mortes-no-sus'
		| 'informalidade'
		| 'desigualdade'
		| 'caminhoneiros'
		| 'rotatividade'
		| 'europa'
		| 'trabalho-escravo';
	title: string;
	icon: IconName;
	/** One sentence on the question the page answers. */
	summary: string;
}

/** The topic pages, in the order the index and the menu list them. */
export const TOPICS: readonly Topic[] = [
	{
		slug: 'saude-mental',
		title: 'Saúde mental',
		icon: 'heart-pulse',
		summary:
			'Afastamentos do INSS por transtorno mental e quantos deles têm o vínculo com o trabalho reconhecido.'
	},
	{
		slug: 'notificacoes-sus',
		title: 'Notificações no SUS',
		icon: 'activity',
		summary:
			'Agravos de saúde do trabalhador notificados ao SUS, inclusive de quem trabalha sem carteira.'
	},
	{
		slug: 'mortes-no-sus',
		title: 'Mortes no SUS',
		icon: 'file',
		summary: 'Óbitos por acidente de trabalho no registro de mortalidade do SUS, frente aos da CAT.'
	},
	{
		slug: 'informalidade',
		title: 'Informalidade',
		icon: 'briefcase',
		summary: 'Quanto do trabalho fica fora do emprego formal que as taxas do observatório medem.'
	},
	{
		slug: 'desigualdade',
		title: 'Raça e escolaridade',
		icon: 'users',
		summary: 'Acidentes por raça/cor e escolaridade, e quem mais chega à Previdência sem CAT.'
	},
	{
		slug: 'caminhoneiros',
		title: 'Caminhoneiros',
		icon: 'truck',
		summary: 'Condutores de caminhão em acidentes nas rodovias federais, por ano e hora do dia.'
	},
	{
		slug: 'rotatividade',
		title: 'Rotatividade',
		icon: 'repeat',
		summary: 'Atividades que mais trocam trabalhadores, ao lado da taxa de acidentes de cada uma.'
	},
	{
		slug: 'europa',
		title: 'Comparação com a Europa',
		icon: 'globe',
		summary: 'Taxa de óbitos por atividade econômica no Brasil e na União Europeia.'
	},
	{
		slug: 'trabalho-escravo',
		title: 'Trabalho escravo',
		icon: 'link',
		summary: 'Empregadores e trabalhadores do cadastro de trabalho análogo à escravidão.'
	}
];

export function findTopic(slug: string): Topic | undefined {
	return TOPICS.find((each) => each.slug === slug);
}
