# 50 peças da pré-Black Friday — 100 artes (espanhol + português)

Feed 4:5 (1080 × 1350), preto e dourado, com a foto da peça.

| Pasta / arquivo | O que é |
|---|---|
| `saida/es/` | 50 artes em espanhol (Uruguai): «Envíos por DAC a todo Uruguay» |
| `saida/pt/` | 50 artes em português (RS): «Envio para todo o RS», link `/pt` |
| `saida/mosaico_es.png`, `mosaico_pt.png` | Todas de uma vez |
| `legendas_es.md`, `legendas_pt.md` | Legenda pronta de cada arte, com o link da peça |

3 layouts se alternam (cartão branco, foto em cima com corte diagonal, foto num círculo).

## Fotos

Só fotos da **agrotrator.com.br** (loja própria). Ficaram de fora as da redeparts (outra loja)
e as de `public/catalogo` (origem não confirmada). As 50 foram escolhidas olhando uma a uma
(sem logo no lugar da foto, sem barras finas que quase não aparecem).

## Gerar de novo / trocar peças

```bash
npx tsx marketing/produtos-50/candidatas.ts      # 140 candidatas -> candidatas.json
node marketing/produtos-50/folha.mjs folha.png    # folha de contato para escolher
node marketing/produtos-50/montar-selecao.cjs     # índices + títulos ES/PT -> selecao.json
node marketing/produtos-50/gerar.mjs              # 100 PNGs + mosaicos
node marketing/produtos-50/legendas.cjs           # legendas
```

Sem preço e sem % nas artes: o preço muda com a cotação e com os descontos da campanha; a
legenda leva para a página da peça, que mostra o preço do dia.
