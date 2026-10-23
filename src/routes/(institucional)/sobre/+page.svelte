<script lang="ts">
	import { resolve } from '$app/paths';
	import { CONTACT_EMAIL } from '#lib/contact.ts';
</script>

<svelte:head>
	<title>Sobre — Observatório SST</title>
	<meta
		name="description"
		content="Quem mantém o Observatório SST, com que objetivo e como entrar em contato."
	/>
</svelte:head>

<h1>Sobre o observatório</h1>

<p>
	O Observatório SST reúne dados públicos sobre acidentes e doenças do trabalho no Brasil e os
	apresenta em painéis e em uma consulta em linguagem natural. O objetivo é tornar esses dados
	acessíveis a quem não trabalha com bases estatísticas: trabalhadores, estudantes, jornalistas,
	gestores e profissionais de saúde e segurança no trabalho.
</p>

<h2>O projeto</h2>
<p>
	O observatório é um projeto acadêmico, desenvolvido como Trabalho de Graduação na Fatec
	Indaiatuba. Não é um canal oficial da Fatec, do Centro Paula Souza nem dos órgãos que produzem os
	dados.
</p>

<h2>Como os números são calculados</h2>
<p>
	As taxas dividem os acidentes comunicados ao INSS pelo emprego formal registrado na RAIS. Cada
	painel informa o denominador, o período e a situação de cada ano (consolidado, parcial ou
	provisório). A página <a href={resolve('/(institucional)/fontes')}>Fontes e dados</a> lista as bases
	usadas e seus limites.
</p>

<h2>Código</h2>
<p>
	O código do site e do tratamento dos dados é aberto:
	<a href="https://github.com/leonardomb1/observatorio-tg-sst">site</a> e
	<a href="https://github.com/leonardomb1/observatorio-sst">modelos de dados</a>.
</p>

<h2>Contato</h2>
<p>
	Correções, sugestões e pedidos sobre dados pessoais: <a href="mailto:{CONTACT_EMAIL}"
		>{CONTACT_EMAIL}</a
	>.
</p>
