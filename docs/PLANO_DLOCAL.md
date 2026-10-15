# Plano: pagamentos dLocal no AGRO PARTS

Análise do sistema dLocal do **Repuestos Avenida** (Laravel, `C:\Users\USER\rapuestos\repuestosavenida`)
e plano para trazer o pagamento para o AGRO PARTS (TanStack Start + Prisma + MySQL, Hostinger).
Data da análise: 2026-10-15.

---

## 1. Como o Repuestos Avenida faz hoje

### 1.1 Visão geral

| Peça | Onde | O que faz |
|---|---|---|
| Cliente da API | `app/Services/Payments/DlocalService.php` | Assina cada chamada (HMAC-SHA256 V2), manda chave de idempotência, traduz os códigos de status (100…700) |
| Checkout | `app/Http/Controllers/CheckoutController.php` | Endereço → forma de pagamento → cria pedido. Cartão, efectivo (Abitab/Redpagos) e transferência bancária manual |
| Cartão | `resources/js/Pages/Checkout/CheckoutPaymentViaCard.vue` + `DlocalCardPaymentMethodService` + `Jobs/Orders/AttemptCardCharge` | Smart Fields no navegador → token → cartão salvo no cofre do dLocal (`/secure_cards`) → cobrança com `card_id` numa fila |
| Efectivo | `Jobs/Orders/CreateCashPayment` + `OrderCashPaymentController` | Pede a "factura" à dLocal (`payment_method_id` RE = Redpagos, AI = Abitab) com CI/RUT; mostra o número para pagar no balcão |
| Webhooks | `routes/api.php` → `DlocalWebhookController` + `TrackDlocalWebhook` | `/webhooks/dlocal/payments`, `/refunds`, `/chargebacks`; confere a assinatura e registra cada aviso |
| Confirmação | `DlocalPaymentWebhookService` | Acha o pagamento, confere valor/moeda/pedido, atualiza o status com trava no banco e avança o pedido |
| Financeiro (admin) | `app/Services/Finance/*`, `resources/js/Pages/Admin/Finance/Dlocal/*` | Visão geral, transações, revisão manual, reembolsos, contestações (chargebacks), conciliação, liquidações (CSV) |
| Rotinas | `routes/console.php` | Conciliação a cada 15 min, monitor a cada 5 min (alerta por e-mail), limpeza diária às 03:30 |

### 1.2 Fluxo do cartão
1. A página carrega o `dLocal.js` (sandbox ou produção) e monta os **Smart Fields** (número, validade, CVV
   ficam em campos do próprio dLocal: o número do cartão **nunca** passa pelo servidor da loja).
2. O navegador gera um **token** e envia ao servidor.
3. O servidor salva o cartão no cofre do dLocal (`POST /secure_cards`) e guarda só `card_id`, bandeira,
   final e validade (tabela `payment_methods`).
4. O pedido é criado com o pagamento **pendente**; uma fila chama `POST /payments` com o `card_id`.
5. Resposta e webhook atualizam o status: `paid`/`authorized` → pedido segue; `rejected` → pedido para.

Bandeiras na tela: Visa, Mastercard, Diners, Lider, OCA, Amex. Moeda sempre **UYU**, país **UY**.

### 1.3 Fluxo do efectivo (Abitab / Redpagos)
1. Cliente escolhe a rede e digita CI (6–8 dígitos) ou RUT (12). O documento é **criptografado** no banco.
2. A fila pede a referência (`POST /payments`, fluxo DIRECT) com `notification_url`.
3. A dLocal devolve o `ticket` (número/código de barras). O documento é apagado do payload guardado.
4. Quando o cliente paga no balcão, o webhook marca `paid` e o pedido avança.
5. Se o cliente trocar a forma de pagamento, o pagamento antigo fica "substituído"; se ele pagar o
   antigo mesmo assim, o sistema detecta o **pagamento atrasado** e registra para o admin resolver.

### 1.4 Banco de dados

| Tabela | Para quê |
|---|---|
| `payments` | Um por tentativa: pedido, método (card/cash/bank_transfer), provedor, `provider_payment_id`, `idempotency_key`, status, valor, moeda, `payload` (JSON com respostas e avisos) |
| `payment_methods` | Cartões salvos (só `card_id` do cofre, bandeira, final, validade, consentimento, IP) |
| `payment_refunds` + `payment_refund_events` | Reembolsos total/parcial, com histórico |
| `payment_chargebacks` + `payment_chargeback_events` | Contestações abertas pelo banco do cliente |
| `dlocal_webhook_receipts` | Cada aviso recebido: tipo, hash, assinatura válida?, processado?, erro |
| `dlocal_sync_runs` / `dlocal_sync_items` | Execuções da conciliação e divergências achadas |
| `dlocal_settlement_reports` / `_entries` | Relatórios de liquidação (CSV) importados e casados com pagamentos |
| `payment_reviews`, `payment_proofs` | Revisão manual e comprovantes (transferência) |

### 1.5 Status do dLocal (como são traduzidos)
`100/101` pendente (101 = esperando 3D Secure) · `200` pago · `300–342` recusado (motivos: banco,
saldo, cartão vencido, CVV, risco, 3DS exigido…) · `400` cancelado · `600` autorizado · `700` verificado.
Internamente: `pending`, `paid`, `authorized`, `verified`, `rejected`, `cancelled`, `refunded_partial`, `refunded_total`.

### 1.6 O que está bem feito (vamos copiar)
- **Assinatura HMAC-SHA256 V2** em toda chamada e **verificação da assinatura** dos webhooks com comparação segura (`hash_equals`).
- **Idempotência**: cada pagamento/reembolso tem chave única (retentativas não cobram duas vezes).
- **Travas no banco** (`lockForUpdate`) e **status que não volta atrás** (um aviso atrasado não desfaz um `paid` nem um reembolso).
- O webhook **confere valor, moeda, pedido e rede** antes de aceitar.
- **Pagamento substituído / atrasado**: trata quem troca de forma de pagamento e paga a antiga.
- **Privacidade**: CI/RUT criptografado e removido do que fica guardado; IP guardado como hash.
- **Reembolso** em centavos inteiros, com bloqueio se já houver um em aberto e limite do saldo.
- **Conciliação automática** (consulta a dLocal a cada 15 min para o que está em aberto), **registro de webhooks**, **monitor com alertas** e **limpeza** de dados antigos.

### 1.7 Problemas encontrados (não copiar)
| # | Problema | Onde | Risco |
|---|---|---|---|
| 1 | **Endereço do pagador fixo com dados de exemplo** ("Rio de Janeiro, Volta Redonda, Servidao B-1") em toda cobrança com cartão | `AttemptCardCharge.php` linha ~96 | Dados falsos na dLocal: análise de fraude pior, recusas |
| 2 | Ao salvar cartão, sem endereço usa **padrão brasileiro** ("RJ", CEP "00000-000") | `DlocalCardPaymentMethodService.php` | Idem |
| 3 | **Sem 3D Secure**: o status 101 (esperando 3DS) não leva o cliente ao banco | Fluxo do cartão | Cartões que exigem 3DS ficam pendentes ou são recusados |
| 4 | Cobrança com cartão **não envia `notification_url`** (o efectivo envia) | `AttemptCardCharge` | Depende de configuração no painel da dLocal |
| 5 | Rota `/checkout/payment/card` **sem exigir login** (as outras exigem) | `routes/web.php` linha 515 | Erro para visitante; inconsistente |
| 6 | Banner anuncia **"10x sem juros"**, mas o pagamento **não tem parcelamento** | `BannerService.php` | Promessa que o checkout não cumpre |
| 7 | **Nenhum teste automático** do dLocal e nenhuma documentação | `tests/`, `docs/` | Mudanças quebram pagamento sem ninguém ver |
| 8 | País/moeda fixos (`UY`/`UYU`) espalhados pelo código | Vários | Dificulta aceitar o RS em R$ |

---

## 2. Como encaixar no AGRO PARTS

Hoje o AGRO PARTS **não tem checkout**: o cliente monta o carrinho, manda a cotação pelo WhatsApp
(agora exige cadastro), a equipe confirma peça, preço e **frete** e marca o carrinho como **"Ganho"**
com o valor (isso já dispara a compra no Pixel/API de Conversões do Meta).

**Recomendação: começar por "link de pagamento" ligado ao carrinho**, e não por um checkout completo:
- O frete é combinado caso a caso; um checkout automático precisaria calcular frete por DAC/Correios.
- O preço e a disponibilidade são confirmados no WhatsApp antes de cobrar (peças com código exato).
- Reaproveita o que já existe: carrinho, etapa "Ganho", valor fechado, conversão do Meta.

### Fluxo proposto
1. Cliente manda a cotação (WhatsApp) → equipe confirma peças, preço e frete.
2. No admin (Carrinhos), botão **"Cobrar"**: valor (peças + frete), moeda, validade → gera o link
   `agropartsuy.com/pagar/<código>` e a mensagem pronta para o WhatsApp.
3. Cliente abre o link (já logado), vê o resumo e escolhe:
   - **Tarjeta** (Smart Fields; com 3D Secure quando o banco pedir), ou
   - **Abitab / Redpagos** (gera o número para pagar no balcão).
4. A dLocal avisa pelo webhook → pagamento `paid` → carrinho vira **"Ganho"** com o valor pago
   automaticamente → conversão no Meta → e-mail de confirmação para o cliente e aviso para a equipe.
5. Admin vê tudo em **Financeiro → Pagamentos**: status, reembolsos, contestações e conciliação.

Depois (fase 5), se quiser: checkout completo pelo site, cartões salvos, parcelamento e R$ para o RS.

---

## 3. Plano por fases

### Fase 0 — Pré-requisitos (dono)
- [ ] **Conta de comerciante dLocal para o AGRO PARTS** (a conta do Repuestos Avenida é de outra
      empresa; a dLocal exige cadastro/KYC da empresa que recebe).
- [ ] Credenciais do **sandbox** primeiro: `X-Login`, `X-Trans-Key`, `Secret Key` e a chave pública
      dos **Smart Fields**. Colocar como variáveis de ambiente no hPanel — **nunca** mandar no chat.
- [ ] Confirmar com a dLocal: métodos ativos no Uruguai (cartões, OCA, Abitab, Redpagos), 3D Secure,
      parcelamento (cuotas), taxas e prazo de liquidação.
- [ ] Faturação: como emitir a e-factura (DGI) das vendas pagas pelo site.

Variáveis: `DLOCAL_X_LOGIN`, `DLOCAL_X_TRANS_KEY`, `DLOCAL_SECRET_KEY`, `DLOCAL_BASE_URL`
(`https://sandbox.dlocal.com` → `https://api.dlocal.com`), `DLOCAL_AMBIENTE` (`sandbox`/`producao`),
`VITE_DLOCAL_SMARTFIELDS_KEY`.

### Fase 1 — Base (cliente da API + banco)
- `src/lib/dlocal.server.ts`: assinatura V2 (`X-Date`, `X-Login`, `X-Trans-Key`, `X-Version: 2.1`,
  `Authorization: V2-HMAC-SHA256, Signature: …`), `X-Idempotency-Key`, tempo limite, erros tratados,
  tabela de status, verificação de assinatura dos avisos com `crypto.timingSafeEqual`.
- Prisma (criadas sozinhas em produção, como `site_eventos`):
  - `pagamentos`: carrinho, cliente, método (`cartao`/`efectivo`), `order_id` único na dLocal,
    `provider_payment_id`, chave de idempotência, status, valor, moeda, validade do link, código do link,
    `ticket` (efectivo), `payload` (sem documento), datas.
  - `pagamento_eventos`: histórico (criado, enviado, aviso recebido, conciliado, reembolso…).
  - `dlocal_avisos`: cada webhook (tipo, hash, assinatura válida?, processado?, erro, sem dados pessoais).
  - `reembolsos` e `contestacoes` (fase 4).
- Testes com o sandbox e verificação no GitHub (com respostas simuladas da dLocal).

### Fase 2 — Link de pagamento (admin + página do cliente)
- Admin → Carrinhos: botão **"Cobrar"** (valor, moeda UYU, validade), link e texto para o WhatsApp.
- Página `/pagar/<código>` (es e pt), exige login do dono do carrinho:
  - **Tarjeta**: Smart Fields → token → `POST /payments` (`payment_method_id: CARD`, `card.token`,
    `notification_url`, `callback_url`); se vier **3D Secure** (`redirect_url`), manda o cliente ao
    banco e volta para `/pagar/<código>/retorno`.
  - **Abitab / Redpagos**: CI/RUT (validado, criptografado, apagado depois) → número para pagar.
  - Dados reais do pagador (nome, e-mail, documento, cidade/departamento): **nada de endereço de exemplo**.
- Tela de status: "pago", "esperando pagamento no balcão (número X, vence em…)", "recusado (motivo
  em linguagem simples)" com "tentar de novo".

### Fase 3 — Webhooks e confirmação
- Rotas `/api/public/dlocal/pagamentos`, `/reembolsos`, `/contestacoes`: confere assinatura, registra o
  aviso, acha o pagamento (`id` ou `order_id`), confere valor/moeda/pedido, atualiza com transação
  (status que não volta atrás).
- `paid` → carrinho **"Ganho"** com o valor pago, conversão do Meta (já existe), e-mail ao cliente,
  aviso à equipe.
- **Conciliação**: a cada 15 min (no próprio servidor, como as automações) consulta `GET /payments/{id}`
  dos pagamentos em aberto — cobre aviso perdido.
- Link vencido / efectivo expirado (status 340) → cancela e permite gerar outro.

### Fase 4 — Financeiro no admin
- **Pagamentos**: lista com filtros, detalhe (linha do tempo, resposta da dLocal), totais do mês.
- **Reembolso** total ou parcial (centavos inteiros, um aberto por vez, limite do saldo) + aviso.
- **Contestações**: alerta destacado, prazo, valor, motivo.
- **Saúde da integração**: credenciais presentes, ambiente x endereço, avisos com falha, pagamentos
  presos, última conciliação (como o `dlocal:monitor`), alerta por e-mail.
- Limpeza automática de avisos antigos (90 dias; com erro, 365).

### Fase 5 — Opcional (depois de rodar)
- Checkout completo pelo site (frete DAC por departamento).
- Cartões salvos (cofre `/secure_cards`, com consentimento).
- Parcelamento (cuotas), se a conta permitir — e só então anunciar "en cuotas".
- **Rio Grande do Sul em R$** (PIX, boleto, cartão BR): exige método Brasil ativo na conta dLocal e CPF do pagador.
- Importar relatório de liquidação (CSV) e casar com os pagamentos.

---

## 4. Segurança e conformidade
- Cartão só por **Smart Fields** (o número nunca toca o nosso servidor).
- Chaves só no servidor (variáveis da Hostinger); só a chave pública dos Smart Fields vai ao navegador.
- Webhook sem assinatura válida → 401 e registro; corpo bruto usado na verificação.
- Documento (CI/RUT/CPF) criptografado e removido do payload; IP só como hash.
- Idempotência em toda criação (pagamento, reembolso).
- Sandbox até tudo passar: cartões de teste aprovados/recusados/3DS e efectivo pago/expirado.

## 5. Estimativa
| Fase | Trabalho de código | Depende de |
|---|---|---|
| 1 Base | 1 dia | credenciais do sandbox |
| 2 Link + página | 2 dias | Smart Fields key |
| 3 Webhooks + conciliação | 1–2 dias | URL pública cadastrada na dLocal |
| 4 Financeiro | 2 dias | — |
| 5 Opcional | por item | conta dLocal (Brasil, cuotas) |

## 6. Decisões em aberto
1. Começar por **link de pagamento** (recomendado) ou checkout completo?
2. Aceitar pagamento do **RS em R$** já no início ou só Uruguai?
3. **Cartões salvos** para clientes que voltam (oficinas)?
4. Manter **transferência bancária** manual como opção (como no Repuestos Avenida)?

---

## 7. Implementado (2026-10-15): link de pagamento — Uruguai e Brasil

Decisão do dono: começar pelo **link de pagamento**, com itens, ligado à conta do cliente, e
**aceitar o Brasil em R$ (PIX e cartão)** além do Uruguai.

| Parte | Arquivo |
|---|---|
| Tabelas `links_pagamento`, `pagamentos`, `pagamento_eventos`, `dlocal_avisos` (criadas sozinhas em produção) | `prisma/schema.prisma`, `src/lib/pagamentos.server.ts` |
| Cliente da API (assinatura, idempotência, status, motivos de recusa es/pt) | `src/lib/dlocal.server.ts` |
| Formas de pagamento, CI/RUT, CPF/CNPJ, valores | `src/lib/pagamentos-comum.ts` |
| Admin → Vendas → **Pagamentos (links)** e botão **Cobrar (link)** em Carrinhos | `src/routes/admin.pagamentos.tsx`, `admin.carrinhos.tsx` |
| Página do cliente `/pagar/<código>` (es) e `/pt/pagar/<código>` (pt) | `src/routes/pagar.$codigo.tsx` |
| Conta → **Mis compras / Minhas compras** | `src/routes/cuenta.tsx` |
| Aviso da dLocal `POST /api/public/dlocal/pagamentos` | `src/routes/api/public/dlocal.pagamentos.ts` |
| Conferência automática (10 min) e limpeza de avisos | `src/lib/automacoes.server.ts` |
| Testes com dLocal falsa (CI) | `scripts/ci/testar-pagamentos.ts`, `scripts/ci/fumaca.cjs` |

Formas: **Uruguai** ($U) tarjeta, Abitab, Redpagos · **Brasil** (R$) cartão de crédito e PIX.
Sem parcelamento por enquanto (só anunciar "cuotas/parcelas" depois de ativar).

### Para ativar (dono, no hPanel da Hostinger — nunca pelo chat)
1. Conta dLocal da AGRO PARTS com **Uruguai e Brasil** ativos (cartão, Abitab, Redpagos, PIX).
2. Variáveis: `DLOCAL_X_LOGIN`, `DLOCAL_X_TRANS_KEY`, `DLOCAL_SECRET_KEY`, `DLOCAL_SMARTFIELDS_KEY`,
   `DLOCAL_AMBIENTE=sandbox` (depois `producao`). Opcional: `PAGAMENTOS_AVISO_EMAIL` (aviso de venda paga).
3. No painel da dLocal, endereço de avisos: `https://agropartsuy.com/api/public/dlocal/pagamentos`.
4. Testar no sandbox com os cartões de teste da dLocal; depois trocar para `producao`.

### Ainda não feito (próximas fases)
Reembolso pelo painel (hoje: pelo painel da dLocal; o sistema marca "pago 2×" para devolver),
contestações, importação de liquidação, cartões salvos, parcelamento, checkout completo.
