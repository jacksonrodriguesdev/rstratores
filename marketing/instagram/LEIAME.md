# Instagram AGRO PARTS — feed 4:5, carrossel e stories

```bash
node marketing/instagram/gerar.mjs
```

Saída em `marketing/instagram/saida/`: 21 PNGs, `legendas.md` (texto pronto + hashtags) e `mosaico.png`.

| Arquivo | Formato | Conteúdo |
|---|---|---|
| `01_manifiesto` | 1080×1350 | «El campo uruguayo no para. Tu tractor tampoco.» |
| `02_29mil_repuestos` | 1080×1350 | +29.000 repuestos, categorias |
| `03_catalogos_mecanicos` | 1080×1350 | Catálogos e manuais grátis para quem cria conta |
| `04_cotiza_3_pasos` | 1080×1350 | Buscá → armá tu lista → pedí el precio |
| `05_envios_19_departamentos` | 1080×1350 | DAC para os 19 departamentos |
| `06_busca_por_codigo` | 1080×1350 | Busca por código e Pedido rápido |
| `07`–`11_marca_*` | 1080×1350 | John Deere, New Holland, Massey Ferguson, Valtra, Case IH |
| `12_checklist_zafra` | 1080×1350 | Revisão antes da zafra (bom para «guardar») |
| `13_que_tractor_tenes` | 1080×1350 | Pergunta para comentários (engajamento) |
| `14_carrusel_1..5` | 1080×1350 | Carrossel «¿Cómo pedir tu repuesto?» (postar juntos) |
| `15`–`17_story_*` | 1080×1920 | Catálogos, WhatsApp, envios (pôr o sticker de link sobre o botão) |

## Fotos

Caminhos em `config.json` → `fotos` (hoje apontam para a pasta `../tratores`, fora do git).
Não há fotos de peças: parte das fotos do catálogo veio de outra loja.

Antes de impulsionar, confirme a licença de cada foto:
- `atardecer` (nome de arquivo do Freepik: a licença grátis pede crédito ao autor);
- `johnDeereSiembra`, `johnDeerePolvo`, `newHolland`: parecem fotos de divulgação das marcas;
- `noche` (AGRO-MOB-BANNER) e `pulverizacion`: origem desconhecida.

Ficaram de fora: os modelos de outras empresas (só serviram de inspiração) e a foto com
marca d'água de fotógrafo (`images.jfif`). Para trocar por fotos próprias, mude o caminho no
`config.json` e rode de novo.

`whatsapp` no `config.json`: número mostrado na faixa amarela (vazio = «Cotizá por WhatsApp»).
