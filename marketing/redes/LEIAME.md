# Padrão AGRO PARTS para Instagram (1080×1080)

Estilo inspirado nos exemplos enviados: verde forte, cortes diagonais, peça recortada grande,
placa metálica «OFERTA DEL DÍA», estrela amarela «PRECIO IMBATIBLE», faixa de contato no rodapé.

```bash
npx tsx marketing/redes/gerar.mjs
```

Saída em `marketing/redes/saida/` (PNGs, `legendas.md`, `mosaico.png`).

## O que é gerado

| Arquivo | Conteúdo |
|---|---|
| `oferta_dia_*` | Oferta del día: código, nome, marca do trator, peça recortada, «Precio imbatible» |
| `oferta_mes_*` | Ofertas del mes com selo de % e 3–4 peças |
| `marca_*` | «AGRO PARTS es el lugar indicado para repuestos para John Deere…» |
| `institucional_stock` | Mais de 29.000 repuestos |
| `institucional_fecha_*` | Datas comemorativas |
| `chamada_*` | Envios DAC, «¿Tu tractor necesita un repuesto?», busca por código, talleres |

## Configuração (`config.json`)

- `mes`, `ofertaMes.percentual`, `ofertaMes.condicoes`: textos da oferta do mês. **Confirme a promoção.**
- `ofertasDoDia`: quantas ofertas do dia gerar. `seed`: mude para sortear outras peças.
- `fechas`: datas comemorativas (dia, título, texto).
- `whatsapp`: número exibido no rodapé (vazio = «Cotizá por WhatsApp»).

## Fotos de fundo (`fundos/`)

- `envios.jpg` (frota DAC) e `campo.jpg` já estão aqui.
- **Foto da máquina de cada marca**: coloque `john-deere.jpg`, `massey-ferguson.jpg`,
  `new-holland.jpg`, `valtra.jpg`, `case-ih.jpg` (fotos próprias ou de banco de imagens com
  licença). Sem elas, o fundo é um campo ilustrado desenhado pelo próprio gerador.

As peças são recortadas automaticamente do fundo branco (`recortes/`, cache).
