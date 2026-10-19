# E-mail marketing — análise, funil, remarketing e anúncios

Admin → **E-mail marketing**: abas Campanhas · Automações · **Análise** · **Funil** · **Anúncios**.

## Antes de tudo: webhook do Resend (aberturas e cliques)

Sem ele, os e-mails saem, mas o painel não sabe quem abriu nem clicou.

1. Resend → **Webhooks → Add endpoint** → `https://agropartsuy.com/api/public/resend-webhook`
2. Eventos: `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`.
3. Copie o **Signing secret** (`whsec_...`) para `RESEND_WEBHOOK_SECRET` no hPanel da Hostinger
   (nunca no chat ou no código).

A partir daí cada clique fica gravado com o link e o aparelho (`email_cliques`).

## Análise

Período de 7/30/90/180 dias: enviados, abertura, cliques, clique/abertura, quem **visitou o
site** vindo do e-mail (7 dias), **chamou no WhatsApp** (7 dias) e **comprou** (link de pagamento
pago em 14 dias), com o valor. Gráfico por dia (com tabela), melhor horário e dia da semana para
abrir (use para agendar), aparelho, ranking de campanhas e automações e links mais clicados.

## Funil e remarketing

Escolha uma campanha ou automação: enviados → entregues → abriram → clicaram → visitaram →
WhatsApp → compraram. Três grupos para reenviar, cada um com o botão **Criar campanha para esse
grupo** (rascunho com o mesmo conteúdo e assunto sugerido):

- **Não abriram** → assunto novo («¿Lo viste? …»)
- **Abriram e não clicaram** → mude a oferta/botão
- **Clicaram e não compraram** → ofereça ajuda no WhatsApp ou cupom

O público «Remarketing» também pode ser escolhido à mão em qualquer campanha. Quem se
descadastrou nunca recebe.

## Anúncios por e-mail

Destaque (título, texto, imagem opcional, botão e link) que entra sozinho no fim das campanhas e
automações, antes do rodapé, com o rótulo «Destacado».

- **Ligado** + período opcional (começa/termina) · **Onde**: campanhas, automações ou os dois.
- Vários no ar: rodízio pelo **peso** (o mesmo cliente vê o mesmo anúncio no dia).
- Números: exibições (e-mails com o anúncio), quantos viram (abriram) e cliques.
- Uma campanha ou automação pode ficar sem anúncio: «Incluir o anúncio» no editor.
- O link leva `utm_content=anuncio-<id>`: o clique é contado no anúncio certo.

## Imagens das automações

`public/email/automacoes/<tipo>.jpg` (1200×600, JPG), geradas por
`node marketing/email-automacoes/gerar.mjs` com fotos recortadas das peças da agrotrator. Toda
automação nova já vem com a imagem; as que já existiam sem imagem de topo ganham a nova uma vez
(quem escolheu uma imagem própria fica com ela).

## Testes

`scripts/ci/testar-email-marketing.ts` (no CI): anúncio no e-mail e no texto, rodízio, exibições,
cliques pelo webhook (inclusive no anúncio), funil com visita/WhatsApp/compra, público de
remarketing e resumo.
