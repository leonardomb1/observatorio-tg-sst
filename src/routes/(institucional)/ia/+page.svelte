<script lang="ts">
	import { resolve } from '$app/paths';
	import { CONTACT_EMAIL } from '#lib/contact.ts';
</script>

<svelte:head>
	<title>Inteligência artificial — Observatório SST</title>
	<meta
		name="description"
		content="Como funciona a consulta com inteligência artificial do Observatório SST, o que ela faz e seus limites."
	/>
</svelte:head>

<h1>Sobre a consulta com inteligência artificial</h1>

<p>
	As respostas da <a href={resolve('/consulta')}>Consulta</a> são escritas por um modelo de inteligência
	artificial de um fornecedor externo. Você conversa com um programa, não com uma pessoa.
</p>

<h2>O que ela faz</h2>
<ul>
	<li>
		Consulta o mesmo banco de dados dos painéis e mostra a tabela de dados usada em cada número.
	</li>
	<li>Monta gráficos a partir dessas consultas.</li>
	<li>Busca trechos das normas regulamentadoras e cita a fonte de cada afirmação.</li>
</ul>

<h2>Limites</h2>
<ul>
	<li>
		O modelo pode errar ao escrever uma consulta ou ao resumir um trecho. Confira a tabela e as
		fontes exibidas em cada resposta.
	</li>
	<li>
		A resposta é informação geral. Não é parecer jurídico, laudo técnico nem orientação médica, e
		não substitui o SESMT, um profissional habilitado ou o texto oficial da norma.
	</li>
	<li>
		Só estão na base as normas carregadas no observatório. Se a norma que você procura não estiver
		lá, o assistente informa isso em vez de responder de memória.
	</li>
</ul>

<h2>Seus dados</h2>
<p>
	A pergunta e o histórico da conversa são enviados ao fornecedor do modelo, no exterior, para gerar
	a resposta, e não são usados para treinar modelos. Não informe dados pessoais, de saúde ou de
	terceiros. Detalhes em <a href={resolve('/(institucional)/privacidade')}>Privacidade</a>.
</p>

<h2>Limite de uso</h2>
<p>
	Para manter o serviço gratuito, cada pessoa tem um número de perguntas por dia, e o site tem um
	orçamento diário. Os limites voltam à meia-noite, no horário de Brasília. Em eventos, um código de
	evento dá à sala um total próprio de perguntas.
</p>

<h2>Respostas erradas</h2>
<p>
	Se uma resposta estiver errada, envie o endereço da conversa para
	<a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>.
</p>
