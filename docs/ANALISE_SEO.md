# Análise de SEO — agropartsuy.com

Data: 2026-10-15. Rastreamento do site no ar: 23 páginas-chave + amostra de 140 endereços do
sitemap (80 páginas + 60 peças aleatórias, es e pt). Sem acesso ao Search Console (indexação
real) nem a ferramentas de backlinks: esses pontos estão marcados como "conferir".

## Resumo

| Área | Nota | Situação |
|---|---|---|
| Técnico (status, canonical, hreflang, sitemap, robots) | **9/10** | Muito bom. Só um redirecionamento temporário. |
| Dados estruturados (schema) | **6/10** | Bem montado, mas **73% das peças usam o logo como foto** e **57% não têm preço**. |
| Títulos e descrições | **7/10** | Únicos em todas as páginas; nomes de peça em MAIÚSCULAS e longos demais. |
| Conteúdo das peças | **4/10** | Texto-modelo repetido em ~49 mil peças; sem modelos compatíveis. |
| Velocidade (celular) | **6/10** | 64–83 no Lighthouse (era 35–56). Faltam imagens otimizadas. |
| Autoridade / marca / local | **2/10** | Domínio novo, sem perfil no Google, nome igual ao da gigante agroparts.com. |

**Conclusão:** a parte técnica está pronta para escalar. O que segura o ranking agora é
(1) conteúdo repetido nas peças, (2) autoridade do domínio e presença local, e (3) os erros de
schema que tiram as peças dos resultados ricos (foto/preço).

---

## 1. Técnico — o que está certo
- Todas as 140 páginas da amostra respondem **200**, com **canonical** apontando para elas mesmas.
- **0 títulos e 0 descrições duplicados** na amostra.
- **hreflang** es-UY / pt-BR / x-default em todas as páginas e também no sitemap.
- `http://` e `www.` → **301** para `https://agropartsuy.com`. Página inexistente → **404** real.
- Compressão **Brotli**, HTML em 50–250 ms (a /loja leva ~1,9 s na primeira visita, sem cache).
- **Sitemap**: 99.548 endereços (5 arquivos de peças + páginas), com `lastmod` nas peças.
- **robots.txt** bloqueia admin, API, conta, login, pagamento e buscas internas.
- Uma H1 por página; páginas de marca/categoria/local com Breadcrumb, ItemList e FAQ.

### Problemas técnicos
| # | Problema | Impacto | Correção |
|---|---|---|---|
| T1 | `/loja/` (barra no fim) → **307** temporário | Baixo | Trocar para 301 |
| T2 | Banners da home com `alt=""` (as imagens têm texto da promoção) | Baixo | `alt` descritivo vindo do admin de banners |
| T3 | `/repuestos`, `/repuestos-agricolas`, `/cotizar`, `/catalogos` sem Breadcrumb no schema | Baixo | Acrescentar |
| T4 | Login com duas H1 (celular + computador) | Nenhum (noindex) | Opcional |

## 2. Dados estruturados das peças (prioridade alta)
| # | Problema | Amostra | Impacto | Correção |
|---|---|---|---|---|
| S1 | **Peça sem foto usa o logo (`icon-512.png`) como imagem do produto** | 44 de 60 (73%) | Google pode mostrar o logo como foto da peça no Imagens/Shopping; contraria a regra da loja | Sem foto → não mandar `image` no schema (e og:image do logo só para redes sociais) |
| S2 | **Peça sem preço não tem `offers`** | 34 de 60 (57%) | O Search Console marca "Product snippet inválido"; a peça não ganha resultado rico | Mostrar preço em mais peças (a pesquisa de preços do admin ajuda) |
| S3 | Sem avaliações (`aggregateRating`) | 60 de 60 | Sem estrelas no Google | Coletar avaliações reais (Google Reviews já integrado) — nunca inventar |
| S4 | Sem GTIN/EAN | 60 de 60 | Pequeno (peças agrícolas raramente têm) | Usar EAN quando existir no cadastro |

## 3. Títulos e descrições
- Títulos com mais de 60 caracteres: **63%** das peças (o Google corta). Mediana 70, máximo 99.
- **58%** dos nomes estão em MAIÚSCULAS ("BARRA DE DIRECAO ESQUERDA") e alguns sem acento.
- Nomes genéricos sem marca: "ENGRANAJE — Cód. 053312EA", "PERNO", "FILTRO", "HORQUILLA".
- Descrições: todas presentes e únicas; 30% passam de 160 caracteres.

**Correção sugerida:** título no formato `Nome Em Caixa Normal Marca Código | AGRO PARTS`,
cortando o sufixo quando passar de 60; nome genérico ganha categoria e máquina
("Engranaje de transmisión para tractor — 053312EA").

## 4. Conteúdo das peças (o maior limitador)
- ~49 mil peças × 2 idiomas = ~99 mil páginas, quase todas com o **mesmo texto-modelo**:
  "Antes de comprar, verificá el código…" aparece em 100% da amostra; "Repuesto para tractores
  y máquinas New Holland." em 1 de cada 5.
- **Nenhuma peça tem modelos compatíveis** preenchidos (campo `veiculos_compativeis` vazio).
- Para um domínio novo, isso costuma virar "Rastreada, mas não indexada" no Search Console:
  o Google indexa uma fração e ignora o resto.

**O que fazer (por ordem de retorno):**
1. **Modelos compatíveis** nas peças mais buscadas (ex.: "MF 275, MF 290, MF 292") — é o que o
   mecânico digita no Google. Começar pelas 500 peças com mais visitas/pedidos (o painel
   Interesse dos clientes já mostra quais).
2. **Equivalências de código** (original × paralelo: Mahle, Fleetguard, Donaldson…).
3. **Medidas/especificações** quando houver (rolamentos, retentores, filtros).
4. Páginas de **modelo de trator** ("Repuestos Massey Ferguson 275") ligando às peças — é a
   busca mais comum do setor, e hoje não existe página para ela.

## 5. Velocidade
Medido em produção (Lighthouse celular, mediana de 3): home 67, loja 64, peça 66, marca 83,
local 81. Pendentes: redimensionar fotos e servir **WebP**, carregar o JS de pop-up, carrinho e
busca só quando usados. Ainda **sem dados reais de usuários (CrUX)**: domínio novo.

## 6. Autoridade, marca e presença local (prioridade alta, fora do código)
- **Nome igual ao de uma gigante:** "agroparts" é a plataforma mundial de peças agrícolas
  (agroparts.com, LexCom/Alemanha). Quem buscar "agro parts" verá ela. Usar sempre
  **"AGRO PARTS Uruguay"** / "AGRO PARTS Chuy" nos perfis, títulos e redes.
- **Perfil da Empresa no Google (Google Business Profile)** em Chuy: é o que faz aparecer no
  mapa para "repuestos agrícolas Chuy/Rocha". Mesmo nome, endereço e telefone do site.
- **Backlinks / citações**: cadastros em guias do Uruguai e do RS, fornecedores (Pellegrino,
  Mahle…), Mercado Libre (link na loja), Facebook/Instagram, associações rurais e cooperativas.
- Num buscador de teste, nenhuma busca pelo nome ou por "repuestos tractores Chuy" trouxe o site:
  a presença ainda é mínima. **Conferir no Search Console** quantas páginas estão indexadas.

## 7. Plano de ação
| Prioridade | Ação | Quem | Esforço |
|---|---|---|---|
| 1 | Tirar o logo do schema das peças sem foto (S1) | Claude | 15 min |
| 1 | Search Console: enviar sitemap, ver "Páginas" e "Melhorias > Produtos" | Dono | 15 min |
| 1 | Criar o Perfil da Empresa no Google em Chuy | Dono | 30 min |
| 2 | Títulos em caixa normal, até 60 caracteres, nome genérico com categoria (seção 3) | Claude | 2 h |
| 2 | 301 na barra final (T1), alt dos banners (T2), breadcrumbs (T3) | Claude | 1 h |
| 2 | Imagens WebP redimensionadas | Claude | 3 h |
| 3 | Modelos compatíveis + equivalências nas 500 peças principais | Equipe + Claude (importação) | contínuo |
| 3 | Páginas por modelo de trator (MF 275, JD 5705…) | Claude | 1 dia |
| 3 | Mais preços publicados (S2) | Dono | contínuo |
| 4 | Citações e backlinks locais (seção 6) | Dono | contínuo |
| 4 | Pedir avaliações no Google a cada venda | Dono | contínuo |
