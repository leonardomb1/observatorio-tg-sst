<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import { columnBars, rankingBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import { formatDecimal, formatInteger, formatPercent } from '#lib/format.ts';
	import type { SocialProfile } from '#lib/server/catalog/desigualdade.ts';
	import { topicSource } from '#lib/sources.ts';

	interface Props {
		data: SocialProfile;
	}

	let { data }: Props = $props();

	const source = $derived(topicSource('aeat', `edição ${data.edition}, dados de ${data.year}`));
	const schooling = $derived(
		data.groups.filter((row) => row.dimension === 'instrucao' && row.group !== 'Ignorada')
	);
	const race = $derived(
		data.groups.filter((row) => row.dimension === 'raca_cor' && row.group !== 'Ignorada')
	);
	const lowest = $derived(schooling[0]);
	const highSchool = $derived(schooling.find((row) => row.group === 'Médio Completo'));
	const black = $derived(
		race
			.filter((row) => row.group === 'Preta' || row.group === 'Parda')
			.reduce((sum, row) => sum + (row.sharePct ?? 0), 0)
	);
	const columns = [
		{ key: 'group', label: 'Grupo' },
		{
			key: 'accidents',
			label: 'Acidentes',
			numeric: true,
			format: (cell: unknown) => formatInteger(cell as number | null)
		},
		{
			key: 'sharePct',
			label: 'Participação entre informados (%)',
			numeric: true,
			format: (cell: unknown) => formatDecimal(cell as number | null)
		},
		{
			key: 'withoutCatPct',
			label: 'Reconhecidos sem CAT (%)',
			numeric: true,
			format: (cell: unknown) => formatDecimal(cell as number | null)
		}
	] as const;
</script>

<div class="l-grid panels">
	<Panel
		title={lowest?.withoutCatPct != null && highSchool?.withoutCatPct != null
			? `Entre quem não tem instrução, ${formatPercent(lowest.withoutCatPct / 100)} dos acidentes só chegaram à Previdência sem CAT; com ensino médio completo, ${formatPercent(highSchool.withoutCatPct / 100)}`
			: `Acidentes reconhecidos sem CAT por escolaridade, ${data.year}`}
		subtitle="Acidentes reconhecidos sem CAT, em % dos acidentes de cada nível de instrução, Brasil, {data.year}"
		{source}
		{columns}
		rows={schooling}
		slug="sem-cat-por-escolaridade-{data.year}"
	>
		{#snippet note()}
			<p>
				O acidente sem CAT chega à Previdência pelo benefício, quando a perícia reconhece o nexo com
				o trabalho sem que o empregador tenha comunicado. É a única medida oficial da
				subnotificação, e ela é maior entre os menos escolarizados.
			</p>
			<p>
				Os microdados públicos da CAT não trazem raça/cor nem escolaridade; a fonte é o anuário.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Parcela de acidentes reconhecidos sem CAT por nível de instrução em {data.year}."
				height="18rem"
				option={(tokens) =>
					columnBars(
						tokens,
						schooling.map((row) => ({
							label: row.group
								.replace('Fundamental', 'Fund.')
								.replace('Incompleto', 'inc.')
								.replace('Completo', 'comp.')
								.replace('Superior', 'Sup.')
								.replace('Instrução', 'instrução'),
							value: row.withoutCatPct
						})),
						(value) => formatPercent(value / 100)
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title={black
			? `Pessoas pretas e pardas somam ${formatPercent(black / 100)} dos acidentes de trabalho com raça/cor informada`
			: `Acidentes por raça/cor, ${data.year}`}
		subtitle="Participação de cada grupo nos acidentes com raça/cor informada, Brasil, {data.year}"
		{source}
		{columns}
		rows={race}
		slug="acidentes-por-raca-cor-{data.year}"
	>
		{#snippet note()}
			<p>
				A participação exclui os acidentes com raça/cor ignorada. Sem o total de trabalhadores de
				cada grupo no denominador, ela mostra quem se acidenta, não o risco de cada grupo.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Participação de cada grupo de raça/cor nos acidentes em {data.year}."
				height="14rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						race.map((row) => ({ label: row.group, value: row.sharePct })),
						(value) => formatPercent(value / 100)
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title={`Participação de pessoas pretas e pardas nos acidentes por UF, ${data.year}`}
		subtitle="Acidentes de pessoas pretas e pardas, em % dos acidentes com raça/cor informada, por UF, {data.year}"
		{source}
		columns={[
			{ key: 'uf', label: 'UF' },
			{
				key: 'blackSharePct',
				label: 'Pretas e pardas (%)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			},
			{
				key: 'withoutCatBlackPct',
				label: 'Sem CAT entre pretas e pardas (%)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			},
			{
				key: 'withoutCatWhitePct',
				label: 'Sem CAT entre brancas (%)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			}
		]}
		rows={data.ufs}
		slug="pretas-e-pardas-por-uf-{data.year}"
	>
		{#snippet note()}
			<p>
				A composição acompanha a da população de cada estado; a tabela mostra também a parcela de
				acidentes reconhecidos sem CAT em cada grupo.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Participação de pessoas pretas e pardas nos acidentes por UF em {data.year}."
				height="40rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						data.ufs.map((row) => ({ label: row.uf, value: row.blackSharePct })),
						(value) => formatPercent(value / 100)
					)}
			/>
		{/snippet}
	</Panel>
</div>

<style>
	.panels {
		--grid-min: 30rem;
		--grid-gap: var(--space-7) var(--space-6);
	}
</style>
