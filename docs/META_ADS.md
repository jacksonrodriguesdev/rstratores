# Meta Ads (Admin → Meta Ads)

Anúncios do Facebook e Instagram num lugar só. Usa a conta de anúncios escolhida em
**Instagram e Facebook → Conectar Facebook** (ou um token colado em Integrações).

| Aba | O que tem |
|---|---|
| Visão geral | Gasto, alcance, cliques no link, custo por clique, visitas à página, leads/conversas, custo por resultado, compras do pixel; gráfico por dia (escolha a métrica); **retorno no site** medido pelo próprio site: sessões, WhatsApp, cotações, carrinhos, cadastros, vendas por link e receita de quem chegou por anúncio pago |
| Campanhas | Campanhas → conjuntos, números do período, **pausar/ativar** e **orçamento diário** (campanha ou conjunto); fica no histórico da Central de Anúncios |
| Anúncios | Últimos anúncios com a arte, textos e números; **prévia oficial** (feed, Instagram, story, computador); pausar/ativar |
| Público e cidades | Idade × gênero, departamento/região, posicionamento e aparelho (Meta); **cidades e rotas no site** (entrada → próximas páginas) de quem veio do anúncio |
| Leads | Formulários dos anúncios (Lead Ads) + WhatsApp, cotações e cadastros vindos de anúncio, organizados por etapa (novo, contatado, negociando, ganho, perdido) com anotação, valor e botão de WhatsApp |
| Criar anúncio | Visitas ao site ou conversas no WhatsApp, orçamento, datas, idade e gênero, imagem, textos e botão. Público **só Uruguai**. Cria **pausado** (ou ativo, se marcar); se a Meta recusar, desfaz o que ficou pela metade |
| Conta e saldo | Status, gasto total, saldo a pagar, limite de gasto, forma de pagamento e links para **Pagamentos e fundos** e o Gerenciador |

## Limites (da Meta)

- **Adicionar fundos / trocar cartão / pagar saldo**: só no Gerenciador (a API não permite mover
  dinheiro). A aba Conta abre a página certa.
- **Cidade** na Meta: ela só informa região/departamento; as cidades vêm do próprio site (IP).
- **Leads de formulário**: o app precisa do caso de uso «Capturar e gerenciar leads de anúncios»
  (permissões `leads_retrieval` e `pages_manage_ads`) e de **Reconectar** o Facebook.
- **Conversas no WhatsApp**: o número da loja precisa estar ligado à página do Facebook.
- Anúncio novo passa pela revisão da Meta antes de rodar.

Teste: `scripts/ci/testar-meta-ads.ts` (API da Meta falsa, no CI).
