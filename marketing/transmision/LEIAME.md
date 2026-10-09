# Propagandas de transmissão (Instagram 1080×1350)

```bash
node marketing/transmision/gerar.mjs
```

Saída em `saida/`: 13 PNGs, `legendas.md` e `mosaico.png`.

- `00_transmision_todas`: visão geral (206 peças de transmissão, 4 marcas).
- `<marca>_1_*`, `<marca>_2_*`: uma peça em destaque (nome, código, fabricante, máquina).
- `<marca>_lista_codigos`: 6 códigos da marca + quantos há a mais.

Peças, nomes em espanhol e totais: `config.json` (tirados de `PRODUCTS/agrotrator.csv`, categoria
«Engrenagens e Transmissão»). Para trocar uma peça, edite o `config.json` e rode de novo.

## Fotos (`fotos/`)

Baixadas do Wikimedia Commons, licença **CC BY 2.0**: uso comercial liberado, **com crédito
do autor** (já vai na arte; não remova). Autores e links em `fotos/creditos.json`.
Não há foto das peças (parte das fotos do catálogo veio de outra loja).
