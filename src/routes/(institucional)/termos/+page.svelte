<script lang="ts">
	import { resolve } from '$app/paths';
	import { AUTHOR, CONTACT_EMAIL, POLICY_DATE } from '#lib/contact.ts';
</script>

<svelte:head>
	<title>Termos de uso — Observatório SST</title>
	<meta name="description" content="Condições de uso do Observatório SST e da consulta com IA." />
</svelte:head>

<h1>Termos de uso</h1>
<p class="updated">Versão de {POLICY_DATE}.</p>

<h2>O serviço</h2>
<p>
	O Observatório SST é um projeto acadêmico, gratuito e sem fins comerciais, mantido por {AUTHOR}.
	Oferece painéis com dados públicos sobre acidentes de trabalho e uma consulta em linguagem natural
	com inteligência artificial. Não é um canal oficial da Fatec, do Centro Paula Souza nem dos órgãos
	que produzem os dados.
</p>

<h2>Dados e informações</h2>
<p>
	Os dados vêm de bases públicas, listadas em <a href={resolve('/(institucional)/fontes')}
		>Fontes e dados</a
	>, e são apresentados no estado em que se encontram, com as datas de atualização indicadas em cada
	painel. Eles não representam a posição oficial dos órgãos produtores.
</p>

<h2>Uso da consulta</h2>
<ul>
	<li>As respostas são geradas por inteligência artificial e podem conter erros.</li>
	<li>
		São informação geral, não parecer jurídico, laudo técnico ou orientação médica. Confira o texto
		oficial das normas.
	</li>
	<li>Não informe dados pessoais, de saúde ou de terceiros nas perguntas.</li>
	<li>
		Não é permitido usar a consulta para fins ilícitos, para tentar contornar seus limites ou para
		sobrecarregar o serviço.
	</li>
	<li>
		Há limites diários de perguntas, descritos em <a href={resolve('/(institucional)/ia')}
			>Inteligência artificial</a
		>.
	</li>
	<li>
		Códigos de evento valem pelo período e pelo total de perguntas definidos pelo autor, e podem ser
		encerrados a qualquer momento.
	</li>
	<li>A consulta não é destinada a menores de 18 anos.</li>
</ul>

<h2>Disponibilidade e responsabilidade</h2>
<p>
	O serviço pode ficar fora do ar, mudar ou ser encerrado sem aviso. Na medida permitida em lei, o
	autor não responde por decisões tomadas com base nas informações do site.
</p>

<h2>Privacidade</h2>
<p>
	O tratamento de dados pessoais está descrito no <a href={resolve('/(institucional)/privacidade')}
		>Aviso de privacidade</a
	>.
</p>

<h2>Contato e foro</h2>
<p>
	Dúvidas e notificações: <a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>. Estes termos seguem
	a lei brasileira, e eventuais conflitos podem ser levados ao foro do domicílio do usuário.
</p>
