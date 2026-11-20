<script lang="ts">
	import { resolve } from '$app/paths';
	import { DIMENSION_KEYS, DIMENSIONS } from '#lib/filters.ts';
	import { yearStatusHint, yearStatusLabel, type YearStatus } from '#lib/status.ts';
	import { GROUPS } from '#lib/topics.ts';

	const statuses: YearStatus[] = ['consolidado', 'provisorio', 'parcial'];
</script>

<svelte:head>
	<title>Metodologia — Observatório SST</title>
	<meta
		name="description"
		content="Como o Observatório SST organiza as análises, o que cada filtro alcança em cada fonte, como as taxas são calculadas e os limites dos dados."
	/>
</svelte:head>

<h1>Metodologia</h1>

<p>
	O observatório reúne bases públicas sobre acidentes, adoecimento e condições de trabalho em quatro
	grupos de análises: acidentes, saúde do trabalhador, trabalho e informalidade, e comparações
	internacionais. Cada grupo é uma página com uma seção por tema, e cada seção traz, quando a fonte
	permite, o recorte por estado, a série histórica, o perfil (sexo, idade e raça/cor) e a atividade
	ou ocupação. As bases e os seus produtores estão em <a href={resolve('/(institucional)/fontes')}
		>Fontes e dados</a
	>.
</p>

<h2>Filtros</h2>
<p>
	Os filtros ficam no endereço da página, de modo que uma visão filtrada pode ser compartilhada como
	link. O estado escolhido acompanha a navegação por todo o site; os demais valem para a página em
	que foram escolhidos. Cada seção aplica só os filtros que a sua fonte registra e avisa quando
	ignora algum. O ano escolhido vale para os recortes de cada seção; quando a fonte não tem esse
	ano, a seção mostra o mais próximo disponível e diz qual.
</p>
<p>
	Nos gráficos de um recorte, o próprio filtro daquele recorte não se aplica: com o filtro de sexo
	feminino, por exemplo, o gráfico por sexo continua mostrando homens e mulheres, com o valor
	escolhido em destaque. Os demais filtros se aplicam.
</p>

<div class="matrix">
	<table>
		<caption>Filtros que cada seção aplica</caption>
		<thead>
			<tr>
				<th scope="col">Seção</th>
				<th scope="col">Ano</th>
				{#each DIMENSION_KEYS as key (key)}<th scope="col">{DIMENSIONS[key].label}</th>{/each}
			</tr>
		</thead>
		{#each GROUPS as group (group.slug)}
			<tbody>
				<tr><th scope="rowgroup" colspan={DIMENSION_KEYS.length + 2}>{group.title}</th></tr>
				{#each group.sections as section (section.id)}
					<tr>
						<th scope="row">{section.title}</th>
						<td>{section.year ? 'Sim' : '—'}</td>
						{#each DIMENSION_KEYS as key (key)}
							<td>{section.dims.includes(key) ? 'Sim' : '—'}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		{/each}
	</table>
</div>

<h2>Medidas</h2>
<ul>
	<li>
		<strong>Taxa de acidentes e de óbitos</strong>: acidentes (ou óbitos) com CAT por 100 mil
		vínculos formais. O denominador são os vínculos ativos da RAIS em 31 de dezembro, sem a
		administração pública (seção O da CNAE), cujos servidores estatutários não comunicam acidentes
		ao INSS. O numerador tem os acidentes com estado conhecido e fora da administração pública, como
		no anuário oficial. A taxa só aparece quando os filtros ativos são estado e atividade, os únicos
		recortes que a RAIS oferece; com outros filtros, as seções mostram contagens.
	</li>
	<li>
		<strong>Letalidade</strong>: óbitos por mil acidentes do mesmo recorte.
	</li>
	<li>
		<strong>Parcela acidentária</strong>: afastamentos concedidos como acidentários (B91), com o
		nexo com o trabalho reconhecido, em % de todos os afastamentos do mesmo diagnóstico.
	</li>
	<li>
		<strong>Rotatividade</strong>: o menor entre admissões e desligamentos do ano no Novo CAGED, em
		% dos vínculos ativos da RAIS em 31 de dezembro.
	</li>
	<li>
		<strong>Vínculos por 100 ocupados</strong>: vínculos formais da RAIS sobre as pessoas ocupadas
		na PNAD Contínua do 4º trimestre; mostra quanto do trabalho as taxas alcançam.
	</li>
</ul>

<h2>Situação dos anos</h2>
<ul>
	{#each statuses as status (status)}
		<li><strong>{yearStatusLabel[status]}</strong>: {yearStatusHint[status]}</li>
	{/each}
</ul>
<p>
	Nos gráficos, anos que não são fechados aparecem em barra clara com contorno tracejado e não devem
	ser comparados aos demais.
</p>

<h2>Classificações</h2>
<ul>
	<li>
		Atividade: seções da CNAE 2.0, a partir da atividade do empregador. O SINAN registra a atividade
		na CNAE 1.0, cujas divisões não equivalem às da 2.0, e os afastamentos do INSS só trazem a
		atividade a partir de junho de 2023 e na minoria dos casos; nesses temas o filtro de atividade
		não se aplica.
	</li>
	<li>Ocupação: grandes grupos da CBO 2002.</li>
	<li>
		Idade: faixas de até 17, 18 a 24, 25 a 34, 35 a 44, 45 a 54, 55 a 64 e 65 anos ou mais, na data
		do evento.
	</li>
	<li>Raça/cor: categorias do IBGE, como registradas pela fonte.</li>
	<li>
		Estado: o do empregador nas fontes da Previdência e do Trabalho, o de residência ou ocorrência
		nas da Saúde, e o do acidente nas rodovias federais.
	</li>
</ul>

<h2>Limites</h2>
<ul>
	<li>
		A CAT alcança só quem tem emprego formal no regime geral; o trabalho informal, os servidores
		estatutários e os autônomos ficam de fora, e parte dos acidentes nunca é comunicada.
	</li>
	<li>
		No SIM, o campo que marca o óbito como acidente de trabalho fica em branco em boa parte dos
		registros; os números são um piso.
	</li>
	<li>
		Recortes muito filtrados podem ter poucos casos. Valores pequenos variam muito de um ano para o
		outro e devem ser lidos com cuidado.
	</li>
	<li>
		As comparações internacionais juntam fontes que medem de formas diferentes e mostram ordens de
		grandeza, não um ranking exato.
	</li>
</ul>

<style>
	.matrix {
		overflow-x: auto;
	}

	table {
		inline-size: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	caption {
		padding-block-end: var(--space-2);
		color: var(--ink-2);
		text-align: start;
	}

	th,
	td {
		padding: var(--space-1) var(--space-2);
		border-block-end: var(--border);
		text-align: start;
	}

	td {
		color: var(--ink-2);
	}

	tbody th[scope='rowgroup'] {
		padding-block-start: var(--space-4);
		font-family: var(--font-serif);
	}

	tbody th[scope='row'] {
		font-weight: 400;
	}
</style>
