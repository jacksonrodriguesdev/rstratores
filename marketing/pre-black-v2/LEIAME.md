# Pré-Black Friday v2 — capas 3D, cards de produto e kit (espanhol e português)

Versão nova e mais chamativa das artes da pré-Black. Visual: preto e dourado, **parede 3D de
fotos do site** no fundo, título em relevo, moeda dourada «-20%» e cartões 3D com espessura
dourada e reflexo. Estamos na **pré-Black** (o desconto já vale no site); a **Black Friday vai de
27 a 30/11**.

| Pasta | O que é |
|---|---|
| `saida/es/capas`, `saida/pt/capas` | Capa geral + 10 capas de categoria (feed 4:5) e capa geral em story (9:16) |
| `saida/es/cards`, `saida/pt/cards` | 50 cards de produto por idioma (feed 4:5), 3 layouts alternados |
| `saida/es/kit`, `saida/pt/kit` | Carrossel «como funciona» (6) + 7 stories (já começou, 30/15/7 dias, amanhã, enquete, cupom misterioso) |
| `saida/destaques` | 9 capas dos destaques do perfil (moeda com ícone; servem para os dois idiomas) |
| `saida/mosaico_*.png` | Visão geral de cada grupo |
| `legendas_es.md`, `legendas_pt.md` | Legenda pronta de cada card (com o link da peça) e da capa geral |
| `carrosseis.md` | Quais cards vão em cada carrossel de categoria |

## Gerar de novo

```bash
node marketing/pre-black-v2/capas.mjs
node marketing/pre-black-v2/cards.mjs
node marketing/pre-black-v2/kit.mjs
node marketing/pre-black-v2/legendas.mjs
```

- **Desconto**: `DESCONTO` em `comum.mjs` (hoje 20, o mesmo do site). Mudou no admin? Troque e
  rode de novo.
- **Peças e títulos**: vêm de `../produtos-50/selecao.json` (50 peças, títulos revisados em ES/PT).
- **Fotos**: só da agrotrator.com.br (loja própria). Na primeira vez são baixadas para `.fotos/`
  (fora do git) e usadas de lá.
- Sem preço nas artes (muda com a cotação); a legenda leva para a página da peça.
- Cupom misterioso (slide A5 e story S7): só publique depois de criar o cupom no admin.
- Stories 30/15/7 dias: publicar em 28/10, 12/11 e 20/11; «amanhã» em 26/11.
