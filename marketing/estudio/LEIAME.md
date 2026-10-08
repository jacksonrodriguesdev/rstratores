# Estúdio de criativos (Instagram e Facebook)

Gera de uma vez cerca de 40 imagens prontas para postar, com as peças do site (fotos de
`public/catalogo`, nomes em espanhol, código, marca do trator e categoria) e as legendas.

## Como gerar

Na pasta do projeto:

```bash
npx tsx marketing/estudio/gerar.mjs
```

O resultado fica em `marketing/estudio/saida/<nome da campanha>/`:

- as imagens `.png` (feed 1080×1350, stories 1080×1920);
- `legendas.md`: a legenda de cada imagem, com hashtags;
- `mosaico.png`: todas lado a lado, para conferir antes de postar.

## O que muda em cada campanha (`campanha.json`)

| Campo | Para que serve |
|---|---|
| `nome` | Nome da pasta de saída. Use um nome novo por campanha (ex.: `outubro-filtros`). |
| `seed` | Número do sorteio das peças. Mude para gerar outra seleção de peças. |
| `oferta.ativa` | `false` tira o selo de % e os textos de oferta de todas as imagens. |
| `oferta.percentual` | O número do selo («HASTA 30% OFF»). **Confirme que a promoção existe.** |
| `oferta.prefixo` / `sufixo` | Texto em volta do número («HASTA», «OFF»). |
| `oferta.titulo` | Título da faixa («Ofertas de la semana»). |
| `oferta.condicoes` | Letra miúda das imagens de oferta. |
| `categorias` | Categorias usadas (nomes como estão no admin). As 4 primeiras viram grades. |
| `marcas` | Marcas de trator com post de destaque. |
| `quantidade` | Quantos posts de oferta, de código e de stories. |

Para várias campanhas, copie o arquivo (ex.: `campanha-filtros.json`) e rode:

```bash
npx tsx marketing/estudio/gerar.mjs marketing/estudio/campanha-filtros.json
```

## Modelos

| Arquivo | Formato | Ideia |
|---|---|---|
| `oferta_*` | Feed | Uma peça recortada sobre fundo claro, selo de %, nome, código e marca |
| `grade_*` | Feed | «Lo más pedido en …»: 4 peças da categoria |
| `marca_*` | Feed | Nome da marca gigante + 3 peças para esse trator |
| `codigo_*` | Feed | Código da peça em letra gigante: «¿Tenés este código? Lo tenemos.» |
| `oferta_semana_*` | Feed | Fundo amarelo, % gigante e 3 peças |
| `dica_*` | Feed | Consejo de taller (filtros, rodamientos, retenes, embrague) |
| `story_*` | Story | Peça em destaque com selo de % e botão |
| `carrusel_*` | Carrossel | Capa «TOP 5», 5 peças e cartão final |

## Fotos

O estúdio mede cada foto (quanto da imagem a peça ocupa e se ela é fina demais) e usa só as
que aparecem bem num post. A medição fica em `cache_fotos.json`; apague o arquivo para medir de
novo depois de trocar fotos. As fotos vieram da extração de outra loja: para usar em anúncios
por muito tempo, prefira fotos próprias ou peça autorização.
