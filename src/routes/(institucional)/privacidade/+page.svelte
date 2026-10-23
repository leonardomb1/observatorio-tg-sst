<script lang="ts">
	import { resolve } from '$app/paths';
	import { AUTHOR, CONTACT_EMAIL, POLICY_DATE } from '#lib/contact.ts';
</script>

<svelte:head>
	<title>Privacidade — Observatório SST</title>
	<meta
		name="description"
		content="Quais dados o Observatório SST trata, para quê, por quanto tempo e como exercer seus direitos."
	/>
</svelte:head>

<h1>Aviso de privacidade</h1>
<p class="updated">Versão de {POLICY_DATE}.</p>

<p>
	Este aviso explica quais dados pessoais o observatório trata, com que finalidade e quais são os
	seus direitos pela Lei Geral de Proteção de Dados (Lei 13.709/2018). Os painéis podem ser usados
	sem cadastro e sem fornecer nenhum dado pessoal.
</p>

<h2>Quem é o controlador</h2>
<p>
	{AUTHOR}, pessoa física, autor do projeto acadêmico descrito em
	<a href={resolve('/(institucional)/sobre')}>Sobre</a>. Contato para qualquer assunto de
	privacidade:
	<a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>.
</p>

<h2>Dados tratados</h2>
<table>
	<thead>
		<tr><th scope="col">Dado</th><th scope="col">Finalidade</th><th scope="col">Guarda</th></tr>
	</thead>
	<tbody>
		<tr>
			<td>Endereço IP, navegador e página acessada</td>
			<td>Funcionamento e segurança do site (registros do servidor e da rede de distribuição)</td>
			<td>Até 30 dias</td>
		</tr>
		<tr>
			<td>Identificador anônimo da consulta (cookie)</td>
			<td>Manter suas conversas e o limite diário de perguntas, sem login</td>
			<td>1 ano no navegador</td>
		</tr>
		<tr>
			<td>Perguntas e respostas da consulta</td>
			<td>Exibir o histórico das suas conversas</td>
			<td>Até você apagá-las na própria consulta, ou enquanto o serviço estiver no ar</td>
		</tr>
		<tr>
			<td>Contagem de perguntas por rede</td>
			<td>Evitar abuso do assistente; só um resumo criptográfico do IP, em memória</td>
			<td>Apagada à meia-noite</td>
		</tr>
	</tbody>
</table>
<p>
	As conversas da consulta ficam ligadas apenas ao identificador anônimo do cookie, sem nome ou
	e-mail. Não use a consulta para informar dados pessoais, de saúde ou de terceiros.
</p>
<p>
	A base legal é o legítimo interesse (art. 7º, IX) para registros e segurança, e a execução dos
	termos de uso (art. 7º, V) para a consulta.
</p>

<h2>Cookies</h2>
<p>
	O site usa apenas cookies necessários ao funcionamento: o identificador anônimo da consulta (<code
		>obs_visitante</code
	>, válido só nas páginas da consulta) e, para administradores, o cookie de sessão do painel
	administrativo. Não há cookies de publicidade nem de análise de audiência, por isso não há banner
	de consentimento.
</p>

<h2>Com quem os dados são compartilhados</h2>
<ul>
	<li>Hetzner (Alemanha): hospedagem do site e do banco de dados.</li>
	<li>Cloudflare (Estados Unidos): distribuição do site e proteção contra ataques.</li>
	<li>
		Anthropic (Estados Unidos): processa as perguntas da consulta para gerar as respostas. Pela
		política comercial da Anthropic, os dados enviados pela API não são usados para treinar modelos
		e são apagados em até 30 dias. Veja <a href={resolve('/(institucional)/ia')}
			>Inteligência artificial</a
		>.
	</li>
</ul>
<p>
	A transferência para os Estados Unidos ocorre porque é necessária para prestar a consulta que você
	pediu (art. 33, IX). Nenhum dado é vendido ou usado para publicidade.
</p>

<h2>Seus direitos</h2>
<p>
	Você pode pedir confirmação de tratamento, acesso, correção, exclusão e informações sobre
	compartilhamento (art. 18). As conversas da consulta podem ser renomeadas ou apagadas por você
	mesmo, na lista de conversas. Pedidos são respondidos em até 15 dias pelo e-mail <a
		href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a
	>. Você também pode peticionar à
	<a href="https://www.gov.br/anpd">Autoridade Nacional de Proteção de Dados</a>.
</p>

<h2>Segurança</h2>
<p>
	O tráfego é sempre criptografado (HTTPS), o acesso aos servidores é restrito ao autor e o painel
	administrativo exige login com autenticação própria. Incidentes de segurança que possam causar
	risco aos titulares serão comunicados à ANPD e aos afetados.
</p>

<h2>Menores de idade</h2>
<p>A consulta com inteligência artificial não é destinada a menores de 18 anos.</p>

<h2>Mudanças</h2>
<p>Alterações neste aviso são publicadas nesta página, com a data da versão.</p>
