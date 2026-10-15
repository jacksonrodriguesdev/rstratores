# Carrossel Instagram: tração ZF (1080×1080)

```bash
node marketing/traccion_zf/gerar.mjs
```

Saída em `saida/es/` (Uruguai) e `saida/pt/` (RS): 13 artes cada, na ordem do carrossel, e
`legendas.md` com o texto do post. `saida/mosaico_es.png` e `mosaico_pt.png` mostram a sequência.

- `01_capa`: "TRACCIÓN ZF", repuestos para tu tractor.
- `02`–`12`: uma peça por arte (nome, código, marca do trator, WhatsApp das cotações).
- `13_final`: revisión preventiva + WhatsApp, logo e @agroparts.

Peças: 11 componentes de tração ZF (Valtra e Massey Ferguson) com foto e estoque no dia
(2026-10-14). Para trocar uma peça: edite `PECAS` no `gerar.mjs` e coloque a foto em `fotos/<sku>.jpg`
(fotos da loja agrotrator). Confira o estoque antes de publicar de novo.

Fotos de trator (Wikimedia Commons, uso comercial liberado): o crédito do autor vai em cada arte.
Não remova. Autores e licenças em `../transmision/fotos/creditos.json` e
`../posts_pecas/fotos/creditos.json`.
