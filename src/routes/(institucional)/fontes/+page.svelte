<svelte:head>
	<title>Fontes e dados — Observatório SST</title>
	<meta
		name="description"
		content="Bases públicas usadas pelo Observatório SST, como são tratadas e seus limites."
	/>
</svelte:head>

<h1>Fontes e dados</h1>

<p>
	O observatório só usa bases públicas. Os dados são carregados, limpos e agregados por um processo
	aberto, descrito no repositório
	<a href="https://github.com/leonardomb1/observatorio-sst">observatorio-sst</a>. Os números não
	representam a posição oficial dos órgãos produtores.
</p>

<h2>Bases usadas</h2>
<ul>
	<li>
		<a href="https://dadosabertos.inss.gov.br/dataset/inss-comunicacao-de-acidente-de-trabalho-cat"
			>Comunicações de Acidente de Trabalho (CAT)</a
		>, INSS, dados abertos.
	</li>
	<li>
		<a href="https://dadosabertos.inss.gov.br/">Benefícios concedidos</a>, INSS, dados abertos.
	</li>
	<li>
		Relação Anual de Informações Sociais (RAIS) e Novo CAGED, Ministério do Trabalho e Emprego
		(PDET).
	</li>
	<li>Anuário Estatístico de Acidentes do Trabalho (AEAT), Previdência Social.</li>
	<li>
		Indicador 8.8.1 dos Objetivos de Desenvolvimento Sustentável, Organização Internacional do
		Trabalho (ILOSTAT).
	</li>
	<li>Formulário 300A, Occupational Safety and Health Administration (OSHA), Estados Unidos.</li>
	<li>Normas regulamentadoras, Ministério do Trabalho e Emprego.</li>
	<li>
		Tabelas de referência: CID-10, CBO, CNAE (IBGE/Concla), municípios (IBGE) e tabelas do eSocial.
	</li>
</ul>

<h2>Limites que valem para todo o site</h2>
<ul>
	<li>
		A CAT cobre o emprego formal regido pela CLT e só os acidentes comunicados. Há subnotificação, e
		a taxa real tende a ser maior.
	</li>
	<li>
		As taxas usam como denominador os vínculos formais da RAIS em 31 de dezembro e, por padrão,
		excluem a administração pública, cujos servidores estatutários não emitem CAT.
	</li>
	<li>
		Anos parciais ou provisórios aparecem marcados nos gráficos e não são comparados aos anos
		consolidados.
	</li>
</ul>

<h2>Reutilização</h2>
<p>
	Ao reutilizar números do observatório, cite a base original e o Observatório SST, com a data de
	acesso.
</p>
