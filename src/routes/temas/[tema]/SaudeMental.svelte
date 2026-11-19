<script lang="ts">
	import Chart from '#lib/charts/Chart.svelte';
	import { rankingBars, yearBars } from '#lib/charts/options.ts';
	import Panel from '#lib/components/Panel.svelte';
	import { formatCompact, formatDecimal, formatInteger, formatPercent } from '#lib/format.ts';
	import type { MentalHealth } from '#lib/server/catalog/incapacidade.ts';
	import { topicSource } from '#lib/sources.ts';

	interface Props {
		data: MentalHealth;
	}

	let { data }: Props = $props();

	const source = $derived(
		topicSource(
			'incapacidade',
			`concessões de ${data.years[0]?.year ?? '—'} a ${data.years.at(-1)?.year ?? '—'}`
		)
	);
	const reliable = $derived(data.years.filter((row) => row.complete && row.diagnosisReliable));
	const first = $derived(reliable[0]);
	const last = $derived(reliable.find((row) => row.year === data.year));
	const growth = $derived(first && last && first !== last ? last.grants / first.grants : null);
	const unreliable = $derived(data.years.filter((row) => !row.complete || !row.diagnosisReliable));
	const mental = $derived(data.groups.find((row) => row.group.startsWith('Transtornos mentais')));
	const injuries = $derived(data.groups.find((row) => row.group.startsWith('Lesões')));
	const topTwo = $derived(data.diagnoses.slice(0, 2));
</script>

<div class="l-grid panels">
	<Panel
		title={last && first && growth
			? `Afastamentos por transtorno mental chegaram a ${formatInteger(last.grants)} em ${last.year}, ${formatDecimal(growth)} vezes os de ${first.year}`
			: 'Afastamentos por transtorno mental por ano'}
		subtitle="Auxílios por incapacidade temporária concedidos com diagnóstico no capítulo F da CID-10 (B31 e B91)"
		{source}
		columns={[
			{ key: 'year', label: 'Ano' },
			{
				key: 'grants',
				label: 'Concessões',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			},
			{
				key: 'accidentGrants',
				label: 'Acidentárias (B91)',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			},
			{
				key: 'diagnosisPct',
				label: 'Concessões com CID informado (%)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			}
		]}
		rows={data.years}
		slug="afastamentos-transtorno-mental-por-ano"
	>
		{#snippet note()}
			<p>
				Barras claras com contorno tracejado são anos que não se comparam:
				{unreliable.map((row) => row.year).join(', ')}. O primeiro e o último estão incompletos, e
				de 2021 a 2023 o INSS publicou a maior parte das concessões sem o diagnóstico, de modo que a
				contagem mede a falta do dado e não o adoecimento.
			</p>
			<p>
				Conta concessões de benefício, não pessoas: quem se afasta duas vezes no ano aparece duas
				vezes.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Afastamentos por transtorno mental por ano; anos comparáveis em barras escuras."
				height="18rem"
				option={(tokens) =>
					yearBars(
						tokens,
						data.years.map((row) => ({
							year: row.year,
							status: row.complete && row.diagnosisReliable ? 'consolidado' : 'parcial',
							value: row.grants
						})),
						(value) => formatCompact(value)
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title={mental?.accidentPct != null && injuries?.accidentPct != null
			? `Só ${formatPercent(mental.accidentPct / 100)} dos afastamentos por transtorno mental têm o nexo com o trabalho reconhecido, contra ${formatPercent(injuries.accidentPct / 100)} nas lesões`
			: `Parcela acidentária por grupo de diagnóstico, ${data.year}`}
		subtitle="Afastamentos temporários concedidos como acidentários (B91), em % do total do grupo, {data.year}"
		{source}
		columns={[
			{ key: 'group', label: 'Grupo de diagnóstico' },
			{
				key: 'grants',
				label: 'Concessões',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			},
			{
				key: 'accidentPct',
				label: 'Acidentárias (%)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			}
		]}
		rows={data.groups}
		slug="parcela-acidentaria-por-diagnostico-{data.year}"
	>
		{#snippet note()}
			<p>
				O mesmo diagnóstico pode ser concedido como previdenciário (B31, sem nexo) ou acidentário
				(B91, com nexo reconhecido pela perícia ou pelo nexo técnico epidemiológico). A parcela
				acidentária mede quanto do adoecimento ligado ao trabalho a Previdência reconhece como tal,
				não quanto dele é de fato ligado ao trabalho.
			</p>
		{/snippet}
		{#snippet chart()}
			<Chart
				label="Parcela acidentária dos afastamentos por grupo de diagnóstico em {data.year}."
				height="12rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						data.groups.map((row) => ({
							label: row.group,
							value: row.accidentPct,
							highlight: row.group.startsWith('Transtornos mentais')
						})),
						(value) => formatPercent(value / 100)
					)}
			/>
		{/snippet}
	</Panel>

	<Panel
		title={topTwo.length === 2
			? `${topTwo.map((row, index) => `${index === 0 ? row.name : row.name.charAt(0).toLowerCase() + row.name.slice(1)} (${row.code})`).join(' e ')} lideram os afastamentos mentais de ${data.year}`
			: `Diagnósticos mais frequentes, ${data.year}`}
		subtitle="Afastamentos temporários por categoria da CID-10, capítulo F, {data.year}"
		{source}
		columns={[
			{ key: 'code', label: 'CID-10' },
			{ key: 'name', label: 'Diagnóstico' },
			{
				key: 'grants',
				label: 'Concessões',
				numeric: true,
				format: (cell) => formatInteger(cell as number)
			},
			{
				key: 'accidentPct',
				label: 'Acidentárias (%)',
				numeric: true,
				format: (cell) => formatDecimal(cell as number | null)
			}
		]}
		rows={data.diagnoses}
		slug="diagnosticos-mentais-{data.year}"
	>
		{#snippet chart()}
			<Chart
				label="Afastamentos temporários pelos dez diagnósticos mentais mais frequentes em {data.year}."
				height="22rem"
				option={(tokens) =>
					rankingBars(
						tokens,
						data.diagnoses.map((row) => ({ label: `${row.code} ${row.name}`, value: row.grants })),
						(value) => formatInteger(value)
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
