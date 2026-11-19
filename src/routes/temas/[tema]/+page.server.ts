import { error } from '@sveltejs/kit';
import { PUBLIC_CACHE, warehouse } from '#lib/server/warehouse.ts';
import { findTopic, type Topic } from '#lib/topics.ts';
import type { PageServerLoad } from './$types';

async function topicData(slug: Topic['slug']) {
	switch (slug) {
		case 'saude-mental':
			return { slug, data: await warehouse.mentalHealth() } as const;
		case 'notificacoes-sus':
			return { slug, data: await warehouse.sinanNotifications() } as const;
		case 'mortes-no-sus':
			return { slug, data: await warehouse.healthDeaths() } as const;
		case 'informalidade':
			return { slug, data: await warehouse.informality() } as const;
		case 'desigualdade':
			return { slug, data: await warehouse.socialProfile() } as const;
		case 'caminhoneiros':
			return { slug, data: await warehouse.highwayDrivers() } as const;
		case 'rotatividade':
			return { slug, data: await warehouse.turnover() } as const;
		case 'europa':
			return { slug, data: await warehouse.europeComparison() } as const;
		case 'trabalho-escravo':
			return { slug, data: await warehouse.slaveRegister() } as const;
	}
}

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const topic = findTopic(params.tema);
	if (!topic) error(404, 'Tema não encontrado.');
	const content = await topicData(topic.slug);
	setHeaders(PUBLIC_CACHE);
	return { topic, content };
};
