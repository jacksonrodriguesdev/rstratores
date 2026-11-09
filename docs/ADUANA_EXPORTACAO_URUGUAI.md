# Exportação Brasil → Uruguai com preferência Mercosul (AGRO PARTS Mayorista)

Base documental da camada aduaneira do canal de atacado (`/empresas`, Admin → Empresas (atacado) →
Aduana e Embarques). Pesquisado em novembro de 2026. **Não substitui o contador nem o despachante
aduaneiro**: as normas mudam, e cada operação deve ser conferida antes do embarque.

Código: `src/lib/aduana/` (regras em `aduana-comum.ts`, servidor em `aduana.server.ts`, lista do
ACE 02 em `ace02-ncm.ts`).

## 1. Quando a peça entra no Uruguai com arancel 0%

O imposto de importação zero entre Brasil e Uruguai **não depende só de a peça ser vendida pelo Brasil**.
Ele depende de a peça ser **originária do Mercosul** e de isso ser **provado**.

- **Regime de Origem do Mercosul (ROM)**: Decisão CMC nº 05/23, incorporada no Brasil pelo Decreto
  nº 12.058/2024 e em vigor desde **18/07/2024**. A Decisão CMC nº 06/23 (Decreto nº 12.059/2024) dá
  tratamento diferenciado ao Paraguai e ao Uruguai.
  - Produto **totalmente obtido** no Mercosul, ou produto que cumpre o **Requisito Específico de
    Origem (REO)** da sua NCM no Apêndice II.
  - Os critérios do REO são: **valor máximo de materiais não originários** (45% para Brasil e
    Argentina; 50% para o Uruguai até 31/12/2032; 60% para o Paraguai até 2038), **salto tarifário**
    (de posição ou subposição) ou **processo produtivo**, aplicados de forma cumulativa ou alternativa,
    conforme a NCM.
  - A regra **de minimis** é de 10% do FOB.
  - **Prova de origem** em modelo híbrido: certificado emitido por entidade habilitada **ou**
    autocertificação (Declaração de Origem).
  - A **validade é de 12 meses**, e a **guarda dos documentos é de 5 anos**, tanto pelo produtor ou
    exportador quanto pela entidade.
  - A verificação é feita pela autoridade do país importador.
- **Consequência para uma revenda** (o nosso caso): a peça fabricada no Brasil pode ter origem
  Mercosul. A peça **importada da Ásia e revendida no Brasil não tem**, porque é extrazona.
  - A origem é do **produto**, não da loja. Precisamos da declaração do fabricante (produtor) ou da
    **Declaração do Fornecedor do Material** (Apêndice X do ROM).
  - No sistema isso fica em **Aduana → Origem das peças**, nos status COMPROVADA, INFORMADA,
    EXTRAZONA e A_VERIFICAR.

### Setor automotivo: ACE 02 (Brasil–Uruguai)

- O comércio automotivo entre Brasil e Uruguai segue o **ACE 02, 76º Protocolo Adicional**,
  internalizado pelo Decreto nº 8.655/2016.
  - O Apêndice I tem **629 NCMs** (NCM/SH 2012): 550 de autopeças e 79 de veículos e máquinas,
    inclusive **máquinas agrícolas**. A lista está em `ace02-ncm.ts`.
- **Autopeças simples** (alínea "j", exceto conjuntos e subconjuntos) seguem a **regra de origem geral
  do Mercosul**.
  - No certificado vai a observação: _"Produto(s) exportado(s) sob o Amparo do Acordo Bilateral entre
    Brasil e Uruguai – ACE 02 – 76 PA"_.
- **Veículos, máquinas e conjuntos** precisam de um índice de conteúdo regional mínimo de **55%**
  (Brasil) ou 50% (Uruguai), conforme o Título II, Art. 8º do 76º PA.
  - Abaixo desse índice, valem as cotas: US$ 350 milhões por ano para o Brasil e US$ 650 milhões para
    o Uruguai.
- As NCMs fora do ACE 02 vão pelo **ACE 18** (Mercosul) com o ROM.
- **Atenção:** a lista é da NCM 2012. Depois disso a NCM mudou (2017 e 2022), então a correlação deve
  ser confirmada com a entidade ou com o despachante.

### Prova de origem: duas opções (Admin → Aduana → "Prova de origem")

1. **Certificado de Origem Digital (COD)** do Mercosul, emitido por entidade habilitada pela SECEX.
   - No RS, a entidade é a FIERGS.
   - Entre Brasil e Uruguai o COD é aceito desde a Portaria SECEX nº 18/2018. Ele tem o mesmo valor
     jurídico do papel, pelo ADE Coana nº 6/2018.
2. **Autocertificação**: o produtor ou exportador emite a **Declaração de Origem** na fatura comercial
   ou em outro documento aceito pelo acordo.
   - Base: Portaria SECEX nº 373/2024, em vigor desde **01/03/2025**. É facultativa.
   - A SECEX pode verificar de ofício e fazer visita técnica, e pode inabilitar a empresa por até
     5 anos em caso de fraude ou de erros reincidentes.
   - O sistema gera um **modelo** em `/empresas/documento/<código>?tipo=origen`. Antes de usar,
     confirme o texto com o Apêndice V do ROM e o guia de autocertificação da SECEX.

## 2. Trâmite de exportação no Brasil (Receita Federal / Portal Único Siscomex)

| #   | Etapa no sistema                  | O que é                                                                                                                                                      | Base                                                                                                                     |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Proforma aceita                   | Proposta com NCM, origem, Incoterm, validade                                                                                                                 | —                                                                                                                        |
| 2   | Pagamento recebido                | Recebimento do exterior por contrato de câmbio                                                                                                               | Banco / regulamentação cambial                                                                                           |
| 3   | Prova de origem                   | COD da entidade ou Declaração de Origem                                                                                                                      | ROM (Dec. CMC 05/23), Portaria SECEX 373/2024                                                                            |
| 4   | Fatura comercial e packing list   | Documentos do embarque (o despachante uruguaio usa no DUA)                                                                                                   | —                                                                                                                        |
| 5   | NF-e de exportação                | CFOP **7.102** (revenda) ou **7.101** (produção própria); 7.501 para mercadoria recebida com fim específico                                                  | Tabela CFOP; imunidade do ICMS (CF art. 155, §2º, X, "a") e desoneração de IPI/PIS/COFINS — **confirmar com o contador** |
| 6   | DU-E                              | Declaração Única de Exportação no Portal Único, elaborada a partir da NF-e; o exportador precisa estar habilitado (RADAR)                                    | IN RFB 1.702/2017; IN RFB 1.984/2020                                                                                     |
| 7   | Transporte: CRT e MIC/DTA         | Contrato de transporte internacional (CRT) por transportadora habilitada na ANTT + manifesto MIC/DTA; o MIC/DTA de saída exige a DU-E registrada e vinculada | Acordo ATIT; manual MIC-DTA de saída da RFB                                                                              |
| 8   | Desembaraço e saída               | Presença de carga, desembaraço na fronteira; DU-E averbada após a saída                                                                                      | IN RFB 1.702/2017                                                                                                        |
| 9   | Despacho de importação no Uruguai | O despachante do comprador registra o DUA no sistema LUCIA (DNA)                                                                                             | DNA Uruguai                                                                                                              |
| 10  | Entregue                          | Conforme o Incoterm                                                                                                                                          | —                                                                                                                        |

O sistema impede pular etapas que dependem uma da outra:

- DU-E concluída só depois da NF-e;
- transporte (MIC/DTA) só depois da DU-E;
- saída só depois do transporte.

Os documentos de cada etapa (COD, DANFE, extrato da DU-E, CRT, MIC/DTA) são anexados em uma **pasta
privada** e entregues só ao admin e à empresa dona, quando marcados "o cliente vê"
(`/api/empresas/arquivo/<id>`).

### Antes do primeiro embarque (Admin → Aduana → "Pronto para exportar?")

- **CNPJ** e razão social do exportador.
- **Regime tributário**: o MEI pode exportar e pedir o RADAR, mas as vendas contam no teto anual do
  MEI. Para atacado de exportação, avalie com o contador migrar para ME no Simples Nacional.
- **Habilitação no Siscomex (RADAR)**, pelo sistema Habilita (IN RFB 1.984/2020).
  - A **exportação não tem teto** de valor; os limites do RADAR valem para importação.
  - A modalidade expressa é, pela IN, de S.A. de capital aberto, empresas públicas e de economia mista.
- **Certificado digital e-CNPJ**, para o Portal Único e a NF-e.
- **Cadastro na entidade certificadora**, ou a decisão pela autocertificação.
- **Transportadora habilitada** para o transporte rodoviário internacional (ANTT), que emite CRT e
  MIC/DTA.
- **NCM em cada peça**: o sistema grava a NCM no catálogo quando ela é preenchida na cotação ou no
  registro de origem.
- **Origem comprovada** das peças que vão com preferência.

## 3. Lado uruguaio (comprador)

- Importação com **despachante de aduana** habilitado pela DNA, que registra o **DUA** no sistema
  LUCIA.
  - Documentos: fatura comercial, documento de transporte (CRT/MIC) e prova de origem.
  - O portal guarda os dados do despachante da empresa.
- **Arancel**: 0% para mercadoria com origem Mercosul e prova de origem. Sem preferência, aplica-se a
  TEC/AEC da NCM.
- **Tasa Consular**: 3% do valor em aduana para bens do Mercosul (amparados no ACE 18) e 5% para
  extrazona. Esses são os valores citados em fontes de 2018 a 2026; o Uruguai não suspendeu a taxa em 2024. **Confirmar na DNA.**
- **IVA de importação**: 22% (tasa básica) ou 10% (tasa mínima), sobre CIF + arancel (+ IMESI). Para a
  empresa contribuinte, costuma ser crédito.
- A estimativa "Costo puesto en Uruguay" mostrada ao comprador usa esses valores, que são editáveis em
  Admin → Aduana. É **estimativa**, não liquidação oficial.

## 4. Pontos de fronteira cadastrados

Chuí/Chuy, Jaguarão/Río Branco, Santana do Livramento/Rivera, Aceguá, Quaraí/Artigas e Barra do
Quaraí/Bella Unión.

## 5. Fontes consultadas

- CNI — _Cartilha da Indústria sobre o novo Regime de Origem do Mercosul_ (2024):
  https://static.portaldaindustria.com.br/media/filer_public/2f/5c/2f5c8b95-6f43-49ae-abe0-7f9eca606eab/cni_cartilha-industria-novo-regime-origem-mercosul_202407.pdf
- Decreto nº 12.059/2024 (Decisão CMC 06/23): http://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/decreto/d12059.htm
- Mercosul — Perguntas frequentes ROM: https://www.mercosur.int/pt-br/politica-comercial/regime-de-origem-do-mercosul/perguntas-frequentes-rom
- Siscomex — Brasil–Uruguai (ACE 02): https://www.gov.br/siscomex/pt-br/acordos-comerciais/brasil-uruguai-ace-02
- Decreto nº 8.655/2016 (76º PA ACE 02, Apêndice I) e instrutivo às entidades certificadoras (Fecomércio MG):
  https://www.fecomerciomg.org.br/wp-content/uploads/2021/11/DECRETO-No-8.655-76-PA.pdf ·
  https://www.fecomerciomg.org.br/wp-content/uploads/2021/11/INSTRUTIVO-REGRA-DE-ORIGEM-76-P.A.docx.pdf
- Portaria SECEX nº 373/2024 (autocertificação): https://abimaq.org.br/blogmaq/2497/regulamentacao-da-autocertificacao-de-origem-portaria-secex-n-3732024-em-vigor-a-partir-de-1-de-marco-de-2025
- COD Brasil–Uruguai: https://noticias.portaldaindustria.com.br/noticias/internacional/brasil-comeca-a-emitir-certificado-de-origem-digital-para-o-uruguai/ ·
  https://www.ibet.com.br/ato-declaratorio-executivo-coana-no-6-de-05-de-abril-de-2018/
- Manual de preenchimento da DU-E (Siscomex): https://www.gov.br/siscomex/pt-br/informacoes/manual-de-preenchimento-du-e-v25.pdf
- Manual MIC-DTA de saída (RFB): https://www37.receita.fazenda.gov.br/exportacao/others/Ajuda/Download/Manual-MIC-DTA-Saida.pdf
- RADAR e MEI (Sebrae): https://datasebrae.com.br/data/docs/datasebrae-para/Estudos-biblioteca/internacionalizacao/exporta%C3%A7%C3%A3o-e-importa%C3%A7%C3%A3o/MEI%20pode%20exportar.pdf
- CFOP 7.102: https://www.fazcomex.com.br/cfop/cfop-na-exportacao-principais-codigos/
- Tasa Consular Uruguai (MEF 2023; PwC): https://www.gub.uy/ministerio-economia-finanzas/comunicacion/publicaciones/exposicion-motivos-rc-2023/7-insercion-internacional/71-medidas ·
  https://www.pwc.com.uy/es/acerca-de-nosotros/publicaciones/analisis-comex-pwc/ediciones-anteriores/uruguay-reduce-tasa-consular-a-la-importacion-de-productos-chile.html

### O que ainda não foi confirmado em fonte oficial

- O texto exato do campo 13 do certificado de autopeças no **novo** ROM. O instrutivo de 2016 cita o
  77º PA do ACE 18, que foi substituído pelo ROM 05/23.
- A modalidade de RADAR do MEI em 2026.
- As alíquotas vigentes da Tasa Consular, direto na DNA.
- A correlação NCM 2012 → NCM 2022 das 629 posições do ACE 02.
