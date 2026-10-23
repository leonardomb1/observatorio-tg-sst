/** Federative units by abbreviation, as IBGE names them. */
export const UF_NAMES: Record<string, string> = {
	AC: 'Acre',
	AL: 'Alagoas',
	AM: 'Amazonas',
	AP: 'Amapá',
	BA: 'Bahia',
	CE: 'Ceará',
	DF: 'Distrito Federal',
	ES: 'Espírito Santo',
	GO: 'Goiás',
	MA: 'Maranhão',
	MG: 'Minas Gerais',
	MS: 'Mato Grosso do Sul',
	MT: 'Mato Grosso',
	PA: 'Pará',
	PB: 'Paraíba',
	PE: 'Pernambuco',
	PI: 'Piauí',
	PR: 'Paraná',
	RJ: 'Rio de Janeiro',
	RN: 'Rio Grande do Norte',
	RO: 'Rondônia',
	RR: 'Roraima',
	RS: 'Rio Grande do Sul',
	SC: 'Santa Catarina',
	SE: 'Sergipe',
	SP: 'São Paulo',
	TO: 'Tocantins'
};

const plain = (text: string) =>
	text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.trim();
const BY_NAME = new Map(Object.entries(UF_NAMES).map(([uf, name]) => [plain(name), uf]));

/** The state's abbreviation from either its abbreviation or its full name. */
export function toUf(label: string): string | null {
	const upper = label.trim().toUpperCase();
	return upper in UF_NAMES ? upper : (BY_NAME.get(plain(label)) ?? null);
}
