# Vendas, etiquetas e avaliações (cupom de 15%)

## Como funciona
1. **Admin → Vendas e etiquetas → Nova venda**: cliente (ou buscar a conta do site), país, peças
   (busca no catálogo com o preço do dia, valor editável) e envio. Ao salvar: imprimir etiqueta
   10×15 cm (térmica) ou A4, mandar o link pelo WhatsApp ou copiar.
2. **Etiqueta** (`/etiqueta/<id>`): logo no topo, destinatário em destaque, remetente, pedido,
   conteúdo e, no rodapé, o QR único «Avalie e ganhe 15%». O remetente se edita no botão
   **Remetente** (fica salvo em `configuracoes`, chave `etiqueta_remetente`).
3. **Cliente escaneia** → `/avaliar/<codigo>` (Brasil: `/pt/avaliar/<codigo>`), sem login: estrelas
   e comentário por peça. **Qualquer nota** ganha o cupom (incentivo só para avaliações positivas é
   enganoso). Cupom `AVAL…`: 15%, uso único, 60 dias, privado (não aparece em /cupones), também
   por e-mail se houver. Um cupom por venda.
4. **Admin → Avaliações**: aprovar, rejeitar (só spam/ofensa/dados pessoais), responder.
   Só as aprovadas aparecem na peça, com selo «Compra verificada» e aviso de que ganhou cupom.
5. **Google**: depois de avaliar, botão «Avaliar no Google» **sem prêmio** (a política do Google
   proíbe incentivo). Precisa de `GOOGLE_PLACE_ID` no hPanel. Na página da peça, a média e as
   avaliações vão no `Product` (aggregateRating) para o Google mostrar estrelas.

Tabelas `vendas` e `avaliacoes` são criadas sozinhas (`garantirTabelasAvaliacoes`).
Teste: `scripts/ci/testar-avaliacoes.ts` (no CI).

## Próximas fases
- **Fase 2 (mais avaliações):** e-mail automático ~7 dias após a venda («já chegou? avalie e ganhe
  15%») pelas automações; avaliação também para quem paga pelo link de pagamento; lembrete no
  WhatsApp.
- **Fase 3 (maturação, 1º mês):** painel de taxa de avaliação, nota média e recompra com o cupom;
  melhores avaliações na home e como arte de depoimento no Estúdio (só avaliações reais).
- **Fase 4 (ajuste, 2º–3º mês):** testar 10% × 15% e a validade; segunda chance para quem não
  avaliou.
- Metas: 20–30% das vendas com avaliação no 1º mês, nota média acima de 4,5, 10% dos cupons
  virando nova compra.
