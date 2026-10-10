# Campanha especial — catálogos de tratores (espanhol e português)

```bash
node marketing/catalogos_especial/gerar.mjs
```

Saída: `saida/es/` e `saida/pt/` — 4 posts de feed, carrossel de 5 slides e 2 stories por idioma,
com `legendas.md` e `mosaico.png`.

Texto das linhas em `config.json` (`linhas_es` / `linhas_pt`): hoje "de las principales líneas",
porque há poucos catálogos publicados. Quando houver catálogos de todas as marcas, troque por
"de todas las líneas" / "de todas as linhas" e rode de novo.
As capas são desenhadas (sem material das montadoras). A tela do celular vem de marketing/vitrine/telas.
