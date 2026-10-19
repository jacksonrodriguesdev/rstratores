# Pré-Black Friday — campanha amarela (Instagram e Facebook, espanhol e português)

Estilo pedido: capa preta com balões, confete, logo e fita de isolamento; cards amarelos com a
moldura «PRÉ-BLACK FRIDAY», a logo, a peça recortada num pedestal e as informações.

| Pasta | O que é |
|---|---|
| `saida/{es,pt}/capa_*.png` | Capa: feed 4:5, quadrada 1:1 e story 9:16 |
| `saida/{es,pt}/cards/` | 100 cards **sem preço**: informações da peça + -20% |
| `saida/{es,pt}/com-preco/` | 20 cards **com preço** (peças abaixo de R$ 1.000, já com o desconto) |
| `saida/mosaico_{es,pt}.png` | Visão geral dos 100 cards |
| `carrosseis.md` | Ordem dos carrosséis (capa + 9 cards; o Facebook aceita até 10 imagens) |
| `legendas.md` | Legendas prontas |

## Gerar de novo

```bash
npx tsx marketing/pre-black-amarelo/montar.ts     # 100 peças + preços de hoje (-DESCONTO%)
node marketing/pre-black-amarelo/gerar.mjs        # capas e cards (fotos recortadas em .fotos/)
node marketing/pre-black-amarelo/legendas.mjs
```

- Desconto: `DESCONTO` em `montar.ts` (hoje 20, o mesmo do site).
- Preços: calculados como no site (R$ igual ao site; $U pela cotação do dia, por isso a data).
- Fotos: só da agrotrator.com.br (loja própria); o fundo branco é recortado automaticamente.
  Peça com foto de fundo cinza não recorta bem: troque por outra em `montar.ts`.
