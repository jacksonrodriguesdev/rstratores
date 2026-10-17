# Campanhas (Black Friday) e cupons — AGRO PARTS

Data: 2026-10-17. Análise do sistema de cupons/promoções do **Repuestos Avenida**
(`C:\Users\USER\rapuestos\repuestosavenida`) e o que foi construído no AGRO PARTS.

## 1. O que o Repuestos Avenida tem

| Peça | Como funciona lá |
|---|---|
| Tabela `coupons` | Código, tipo (percentual, valor fixo, frete grátis), valor, desconto máximo, compra mínima, limite total e por cliente, só primeira compra, e-mail específico, início/fim, "cumulativo", utm_campaign, cupom "pai" e aposentado |
| Restrições | `category_coupon` e `coupon_product`: o cupom vale só em categorias/produtos (calcula o subtotal elegível) |
| Carteira | `coupon_user`: o cliente "salva" o cupom na conta (com validade própria) |
| Uso | `coupon_usages`: cada uso com o desconto aplicado e o pedido |
| Página pública `/coupons` | Cupons ativos, agrupados por categoria; os que ainda não começaram aparecem como **"MISTERIO"** (sem código nem valor) |
| Datas duplas | Botão que gera um cupom por "data dupla" do ano (01/01, 02/02…), com sorteio do tipo |
| Remarketing | Cupons de remarketing enviados por e-mail a uma lista |
| Painel | Uso por período, cupons ativos, desconto concedido |
| `promotions` | Tabela de promoções (condição/recompensa/visual), mas na prática só agrupa cupons |
| Black Friday | **Não existe** (nem modo de campanha, nem tema, nem contagem) |

Bom para copiar: cupom mistério, restrição por categoria, limite por cliente, primeira compra.
Diferença importante: lá o cupom entra num carrinho com checkout; aqui a venda fecha no WhatsApp
e no **link de pagamento** — então o cupom é aplicado pela equipe no link.

## 2. O que foi construído

### Campanha com fases (Admin → Campanhas e cupons)
- **Criar Black Friday (modelo pronto)**: datas do ano calculadas sozinhas — Black na sexta depois
  do Thanksgiving (00:00 do Uruguai) até 23:59 do Cyber Monday; **pré** começa 30 dias antes.
  Black Friday 2026: pré em 28/10, Black de 27/11 a 30/11.
- **Fases**: antes da pré nada aparece → **PRÉ** (contagem "faltan X días", descontos da pré,
  cupons mistério) → **BLACK** (descontos da campanha, "termina en") → acaba sozinha.
- **Uma campanha ativa por vez**; nasce desligada; **prévia** só para o admin
  (`?ver_campanha=pre` / `?ver_campanha=black`), mesmo antes de ligar.

### Versão black do site
- Com o tema black, o `<html>` recebe `data-tema="black"`: botões e destaques passam de verde para
  **preto e dourado**, o header fica preto com brilho dourado.
- **Barra de contagem no topo de todas as páginas** (fase, contagem, "hasta -X%"), leva a
  `/black-friday`.
- **Hero da campanha no topo da home** (opção da campanha) ou em qualquer posição pelo Construtor
  da Home (componentes "Campanha: contagem regressiva" e "Campanha: vitrine de ofertas").

### Descontos (categoria, marca, peça avulsa, site todo)
- Regras por fase (só pré, só Black, as duas). **A regra da peça vale mais**; entre categoria,
  marca e site todo vale o maior. Se a peça já tem promoção própria melhor, fica a promoção.
- O desconto entra no cálculo de preço único do site (`precoVenda`): **vitrines, página da peça,
  preço para o Google, Google Shopping e links** mudam juntos, com o selo **"BLACK -30%"**.
- O preço troca sozinho na virada de fase (a memória de preços vence na hora da mudança).
- "Quantas peças cada regra pega" mostra o alcance antes de ligar.
- **Destaque**: as peças das regras em destaque formam a vitrine de ofertas (home e /black-friday).

### Páginas públicas
- **`/black-friday`** (e `/pt/black-friday`): endereço fixo o ano todo (bom para o Google). Fora
  da campanha: "viene llegando" com contagem para a próxima e cadastro para ser avisado. Na
  campanha: hero, descontos por categoria/marca (com link para as páginas de cada uma), ofertas
  em destaque, cupons, como funciona. Dados estruturados `SaleEvent`. No sitemap.
- **`/cupones`** (e `/pt/cupones`): cupons públicos e ativos; copiar código; "usar por WhatsApp"
  (pede cadastro, como as cotações); **cupom mistério** com contagem até ser revelado — o código
  nem vai no HTML antes da hora.

### Cupons
- Percentual, valor fixo ($U ou R$) ou frete grátis; compra mínima; início/fim; mistério até
  (revelar); limite total e por cliente; só primeira compra; público ou oculto; ligado a uma
  campanha.
- **No link de pagamento** (Admin → Pagamentos → novo link): campo "Cupom" → "Aplicar" confere
  tudo (datas, mínimo, moeda, limites, primeira compra pelo e-mail do cliente) e preenche o
  desconto (ou o frete grátis). Quando o link é pago, o uso do cupom é contado.

## 3. Como usar na Black Friday 2026
1. Admin → Campanhas e cupons → **Criar Black Friday (modelo pronto)**.
2. Ajuste os descontos (categorias/marcas/peças), clique em "Quantas peças cada regra pega" e
   salve **desligada**.
3. Confira com **Ver pré** e **Ver Black** (só você vê).
4. Crie os cupons (botão "Cupom mistério da Black" já vem preenchido).
5. **Ligue** a campanha. Em 28/10 a pré entra no ar sozinha; em 27/11, a Black; em 01/12, acaba.

## 4. Próximas ideias
- E-mail automático na virada de fase (pré começou / Black começou / último dia) para quem tem
  cadastro — reaproveitando as automações de e-mail.
- Carteira de cupons na conta do cliente ("salvar cupom", como no Repuestos Avenida).
- Cupom restrito a categoria/peça (hoje vale para o pedido inteiro).
- "Datas duplas" e outras campanhas prontas (Dia do Agricultor, aniversário da loja).
- Relatório da campanha: visitas, pedidos no WhatsApp e vendas por fase.
