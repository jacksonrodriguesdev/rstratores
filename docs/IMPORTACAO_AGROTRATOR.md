# Catálogo do agrotrator.com.br no AGRO PARTS

Peças, preços (+50%) e fotos vindos do agrotrator.com.br (loja VTEX).

## O que os scripts fazem

| Passo | Script | Saída |
|---|---|---|
| 1. Baixar o catálogo (título, marca, categorias, preço, estoque, descrição, fotos) | `node scripts/extratores/agrotrator_precos.cjs` | `dados/precos_agrotrator/catalogo.json` |
| 2. Achar fotos que são só a logo do agrotrator | `node scripts/extratores/agrotrator_fotos_logo.cjs` | `dados/precos_agrotrator/fotos_logo.json` |
| 3. Importar no banco local (simulação sem `--aplicar`) | `node scripts/catalogo/importar_agrotrator_completo.cjs --aplicar` | banco local + backup em `dados/` + SQL |
| 3b. Só gerar o SQL de novo (banco local já importado) | `node scripts/catalogo/importar_agrotrator_completo.cjs --so-sql` | `scripts/importacao/agrotrator_completo_producao_N.sql` |
| 4. Tirar as logos do banco local | `node scripts/catalogo/remover_logos_agrotrator.cjs --aplicar` | banco local |

Regras:
- Peça que já temos com o **mesmo SKU**: ganha preço e, se não tem foto visível, as fotos de lá.
- Peça com o mesmo código original de **outro fabricante**: não mexe.
- Peça que não temos: entra como nova (descrição gerada; título em espanhol feito pelo site).
- Preço: `valor_compra` = preço do agrotrator (R$), `margem` = 50, `preco_brl` = valor × 1,5. O site mostra em $U pela cotação do dia.
- Fotos: 600×600. Primeiro aparecem direto do agrotrator; o botão do admin copia para o servidor.

## Colocar no ar (Hostinger)

1. **Backup do banco** no phpMyAdmin (Exportar) antes de tudo.
2. Rodar no phpMyAdmin, nesta ordem, os SQL que ainda estiverem pendentes:
   `automacoes_producao`, `automacoes2_producao`, `popup_producao`, `marketing1_producao`, `pesquisa_precos_producao`.
3. Rodar `agrotrator_completo_producao_1.sql` até o último número, **na ordem** (Importar → escolher arquivo).
   Cada um tem até ~8 MB. Pode rodar de novo sem duplicar.
   (O `precos_agrotrator_producao.sql` das 962 peças já está incluído nestes; não precisa rodar.)
4. Fazer o deploy do código (GitHub).
5. Admin → Produtos → **Fotos do agrotrator** → "Copiar fotos para o servidor".
   Roda em segundo plano no servidor (pode fechar a página). São ~40 mil fotos (~1,2 GB): precisa desse espaço livre na pasta de uploads.
   Se parar no meio (reinício do servidor), é só clicar de novo: continua de onde parou.
6. Os preços aparecem sozinhos (o padrão do site é mostrar preço). Para esconder: Produtos e preços → Mostrar preços.

## Desfazer no banco local

O backup da importação fica em `dados/backup_agrotrator_completo_<data>.json`
(peças que existiam, como estavam antes, e a lista das peças novas).
