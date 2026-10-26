// Textos da página de cada peça (descrição, título e meta descrição) em espanhol e português.
// Antes, ~50 mil peças tinham o mesmo texto-modelo; o Google trata isso como conteúdo repetido e
// indexa só uma parte. Aqui o texto é montado com o que a peça tem de próprio:
// - o TIPO da peça (rolamento, retentor, filtro, bomba…): para que serve, sinais de desgaste, dica;
// - fabricante, marca da máquina, código (e o código escrito de outras formas, como se busca);
// - estoque, envio e a forma de confirmar a compatibilidade.
// As frases variam de peça para peça (escolha fixa pelo SKU: a mesma peça tem sempre o mesmo texto).
// Nada é inventado: sem modelos compatíveis no cadastro, o texto não cita modelos.
import { nomePeca } from "./pecas-es";

type Idioma = "es" | "pt";
type Par = [string, string]; // [es, pt]

export type PecaTexto = {
  sku: string;
  nome: string;
  nome_es?: string | null;
  codigo_fabricante?: string | null;
  fabricante?: string | null;
  marca?: string | null;
  marca_confirmada?: boolean | null;
  categoria?: string | null;
  estoque?: number | null;
  descricao?: string | null; // descrição do cadastro (em português)
};

// Escolha estável: mesma peça → mesma frase; peças diferentes → frases diferentes
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const escolher = <T>(lista: T[], sku: string, sal: string) =>
  lista[hash(sku + "|" + sal) % lista.length];
const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

// ---------------------------------------------------------------- Nome legível
// "BARRA DE DIRECAO ESQUERDA" → "Barra de direcao esquerda"; códigos e siglas ficam em maiúsculas
const SIGLAS = new Set([
  "MF",
  "JD",
  "NH",
  "CNH",
  "TDP",
  "TDF",
  "PTO",
  "TDA",
  "4X4",
  "4WD",
  "2WD",
  "HP",
  "CV",
  "ISO",
  "MWM",
  "AGCO",
  "ZF",
  "SKF",
  "NSK",
  "FAG",
  "INA",
  "TIMKEN",
  "NTN",
  "KOYO",
  "FERSA",
  "MAHLE",
  "BOSCH",
  "DANA",
  "PERKINS",
  "CUMMINS",
  "VALMET",
  "LUK",
  "SACHS",
  "FPT",
  "IVECO",
  "CASE",
  "IH",
  "ORING",
  "O-RING",
  "DIN",
  "SAE",
  "NPT",
  "BSP",
  "UNF",
  "EUA",
  "USA",
  "LE",
  "LD",
]);
const MARCAS =
  /^(MASSEY|FERGUSON|VALTRA|JOHN|DEERE|NEW|HOLLAND|FORD|AGRALE|CASE|FIAT|YANMAR|KUBOTA|STARA|JACTO|BALDAN|TATU|SEMEATO|IMPLEMAQ|SISU)$/;
export function nomeLegivel(nome: string) {
  const palavras = nome.trim().replace(/\s+/g, " ").split(" ");
  return palavras
    .map((w, i) => {
      const s = sem(w).replace(/[^A-Z0-9-]/g, "");
      if (/\d/.test(w) || SIGLAS.has(s)) return w.toUpperCase();
      if (MARCAS.test(s)) return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      const min = w.toLowerCase();
      return i === 0 ? min.charAt(0).toUpperCase() + min.slice(1) : min;
    })
    .join(" ");
}

// ---------------------------------------------------------------- Tipos de peça
type Tipo = {
  re: RegExp; // sobre o nome em português, sem acento, maiúsculo
  funcao: Par[]; // para que serve (variações)
  desgaste: Par; // sinais de que precisa trocar
  dica: Par; // dica de troca/montagem
  curto: Par; // resumo para a meta descrição
};
const TIPOS: Tipo[] = [
  {
    re: /\bROLAMENTO|\bROL\.|\bRULEMAN/,
    funcao: [
      [
        "Sostiene ejes y piezas que giran, reduciendo la fricción entre las partes.",
        "Sustenta eixos e peças que giram, reduzindo o atrito entre as partes.",
      ],
      [
        "Permite que el eje gire con suavidad y soporta las cargas del conjunto.",
        "Permite que o eixo gire com suavidade e suporta as cargas do conjunto.",
      ],
    ],
    desgaste: [
      "Ruido metálico, juego en el eje o calentamiento indican que es hora de cambiarlo.",
      "Ruído metálico, folga no eixo ou aquecimento indicam que é hora de trocar.",
    ],
    dica: [
      "Al cambiarlo, revisá también el retén y el alojamiento: un asiento gastado acorta la vida del rodamiento nuevo.",
      "Na troca, confira também o retentor e o alojamento: um assento gasto encurta a vida do rolamento novo.",
    ],
    curto: ["rodamiento", "rolamento"],
  },
  {
    re: /\bRETENTOR|\bRETEN\b|\bSELO\b/,
    funcao: [
      [
        "Evita pérdidas de aceite y la entrada de polvo y agua en el conjunto.",
        "Evita vazamento de óleo e a entrada de poeira e água no conjunto.",
      ],
      [
        "Sella el eje giratorio para mantener el lubricante adentro y la suciedad afuera.",
        "Veda o eixo giratório para manter o lubrificante dentro e a sujeira fora.",
      ],
    ],
    desgaste: [
      "Manchas de aceite o goteo cerca del eje son la señal más común de un retén gastado.",
      "Manchas de óleo ou gotejamento perto do eixo são o sinal mais comum de retentor gasto.",
    ],
    dica: [
      "Montalo con el labio hacia el lado del aceite y sin dañar el borde: un pequeño corte ya provoca pérdidas.",
      "Monte com o lábio voltado para o lado do óleo e sem danificar a borda: um pequeno corte já causa vazamento.",
    ],
    curto: ["retén", "retentor"],
  },
  {
    re: /\bJUNTA|\bGAXETA|\bJTA\b|\bVEDACAO/,
    funcao: [
      [
        "Sella la unión entre dos piezas e impide pérdidas de aceite, agua o gases.",
        "Veda a união entre duas peças e impede vazamentos de óleo, água ou gases.",
      ],
      [
        "Garantiza el cierre hermético entre superficies del motor o de la transmisión.",
        "Garante o fechamento hermético entre superfícies do motor ou da transmissão.",
      ],
    ],
    desgaste: [
      "Pérdidas en las uniones o mezcla de fluidos indican una junta vencida.",
      "Vazamentos nas uniões ou mistura de fluidos indicam uma junta vencida.",
    ],
    dica: [
      "Limpiá bien las superficies y respetá el torque de apriete del fabricante.",
      "Limpe bem as superfícies e respeite o torque de aperto do fabricante.",
    ],
    curto: ["junta", "junta"],
  },
  {
    re: /\bANEL\b.*\b(ORING|O-RING|VEDACAO)|\bORING\b|\bO-RING\b|\bANEL O\b/,
    funcao: [
      [
        "Anillo de sellado para conexiones, tapas y sistemas hidráulicos.",
        "Anel de vedação para conexões, tampas e sistemas hidráulicos.",
      ],
    ],
    desgaste: [
      "Un O-ring endurecido o aplastado deja de sellar y provoca pérdidas.",
      "Um o-ring ressecado ou amassado deixa de vedar e causa vazamentos.",
    ],
    dica: [
      "Lubricalo con el mismo fluido del sistema antes de montarlo.",
      "Lubrifique com o mesmo fluido do sistema antes de montar.",
    ],
    curto: ["anillo de sellado", "anel de vedação"],
  },
  {
    re: /\bFILTRO|\bELEMENTO FILTRANTE|\bREFIL\b|\bCOADOR|\bTELA FILTR/,
    funcao: [
      [
        "Retiene impurezas y protege el motor y los sistemas del equipo.",
        "Retém impurezas e protege o motor e os sistemas do equipamento.",
      ],
      [
        "Mantiene limpio el fluido que circula por el sistema y evita el desgaste prematuro.",
        "Mantém limpo o fluido que circula pelo sistema e evita desgaste prematuro.",
      ],
    ],
    desgaste: [
      "Un filtro saturado reduce la potencia y aumenta el consumo y el desgaste.",
      "Um filtro saturado reduz a potência e aumenta o consumo e o desgaste.",
    ],
    dica: [
      "Cambialo en las horas indicadas por el manual, y antes si el equipo trabaja con mucho polvo.",
      "Troque nas horas indicadas no manual, e antes se o equipamento trabalha com muita poeira.",
    ],
    curto: ["filtro", "filtro"],
  },
  {
    re: /\bENGRENAGEM|\bPINHAO|\bCOROA\b|\bENGRANAJE|\bSATELITE|\bPLANETARIA|\bACASALADO|\bDIFERENCIAL|\bCAIXA (DE )?(CAMBIO|MARCHA)|\bGAIOLA|\bSINCRONIZADO|\bLUVA DE ENGATE/,
    funcao: [
      [
        "Transmite la fuerza entre ejes del conjunto de transmisión.",
        "Transmite a força entre os eixos do conjunto de transmissão.",
      ],
      [
        "Parte del tren de engranajes que lleva la potencia del motor a las ruedas o a la toma de fuerza.",
        "Parte do trem de engrenagens que leva a potência do motor às rodas ou à TDP.",
      ],
    ],
    desgaste: [
      "Dientes gastados o quebrados causan ruido, golpes y saltos de marcha.",
      "Dentes gastos ou quebrados causam ruído, trancos e escape de marcha.",
    ],
    dica: [
      "Revisá el engranaje que trabaja junto: cambiar sólo uno de un par gastado acelera el desgaste del nuevo.",
      "Confira a engrenagem que trabalha junto: trocar só uma de um par gasto acelera o desgaste da nova.",
    ],
    curto: ["engranaje", "engrenagem"],
  },
  {
    re: /\bSEMI ?EIXO|\bEIXO\b|\bARVORE\b/,
    funcao: [
      [
        "Eje que transmite el giro y sostiene engranajes, cubos o rodamientos.",
        "Eixo que transmite o giro e sustenta engrenagens, cubos ou rolamentos.",
      ],
    ],
    desgaste: [
      "Estrías gastadas, desalineación o vibración indican que el eje necesita reemplazo.",
      "Estrias gastas, desalinhamento ou vibração indicam que o eixo precisa ser trocado.",
    ],
    dica: [
      "Al cambiarlo, revisá rodamientos y retenes que trabajan sobre él.",
      "Na troca, revise os rolamentos e retentores que trabalham sobre ele.",
    ],
    curto: ["eje", "eixo"],
  },
  {
    re: /\bBUCHA|\bBUJE|\bCASQUILHO|\bBRONZINA/,
    funcao: [
      [
        "Pieza de desgaste que guía y apoya ejes y pernos, absorbiendo el roce.",
        "Peça de desgaste que guia e apoia eixos e pinos, absorvendo o atrito.",
      ],
    ],
    desgaste: [
      "El juego excesivo y los ruidos al trabajar muestran que la pieza ya cumplió su vida útil.",
      "Folga excessiva e ruídos durante o trabalho mostram que a peça já cumpriu sua vida útil.",
    ],
    dica: [
      "Verificá la medida (estándar o sobremedida) antes de pedir.",
      "Confira a medida (standard ou sobremedida) antes de pedir.",
    ],
    curto: ["buje", "bucha"],
  },
  {
    re: /\bPINO\b|\bPERNO\b|\bCAVILHA/,
    funcao: [
      [
        "Pieza de articulación o fijación entre componentes del equipo.",
        "Peça de articulação ou fixação entre componentes do equipamento.",
      ],
    ],
    desgaste: [
      "Un perno ovalado o con juego provoca golpes y desgasta los alojamientos.",
      "Um pino ovalizado ou com folga provoca trancos e desgasta os alojamentos.",
    ],
    dica: [
      "Cambiá también los bujes o trabas si están gastados.",
      "Troque também as buchas ou travas se estiverem gastas.",
    ],
    curto: ["perno", "pino"],
  },
  {
    re: /\bPARAFUSO|\bPORCA\b|\bARRUELA|\bPRISIONEIRO|\bBULON|\bTUERCA|\bARANDELA|\bTRAVA\b|\bANEL ELASTICO|\bGRAMPO|\bBUJAO|\bREBITE|\bCONTRA ?PINO|\bCHAVETA|\bCALCO|\bANEL (DE )?(SEGURANCA|TRAVA|ESPACADOR|ENCOSTO)|\bESPACADOR|\bANILHA|\bGRAXEIRA/,
    funcao: [
      [
        "Elemento de fijación para el montaje seguro de conjuntos mecánicos.",
        "Elemento de fixação para a montagem segura de conjuntos mecânicos.",
      ],
      [
        "Mantiene las piezas firmes y en posición durante el trabajo del equipo.",
        "Mantém as peças firmes e na posição durante o trabalho do equipamento.",
      ],
    ],
    desgaste: [
      "Roscas dañadas o piezas estiradas no garantizan el apriete correcto.",
      "Roscas danificadas ou peças esticadas não garantem o aperto correto.",
    ],
    dica: [
      "Usá la medida y la clase de resistencia originales y respetá el torque.",
      "Use a medida e a classe de resistência originais e respeite o torque.",
    ],
    curto: ["fijación", "fixação"],
  },
  {
    re: /\bMOLA\b|\bRESORTE/,
    funcao: [
      [
        "Mantiene la presión o el retorno de un mecanismo a su posición.",
        "Mantém a pressão ou o retorno de um mecanismo à sua posição.",
      ],
    ],
    desgaste: [
      "Un resorte vencido pierde fuerza y el mecanismo deja de volver o de trabar.",
      "Uma mola vencida perde força e o mecanismo deixa de retornar ou travar.",
    ],
    dica: [
      "Compará el largo libre con el resorte viejo antes de montarlo.",
      "Compare o comprimento livre com a mola velha antes de montar.",
    ],
    curto: ["resorte", "mola"],
  },
  {
    re: /\bBOMBA\b/,
    funcao: [
      [
        "Genera el caudal y la presión que el sistema necesita para funcionar.",
        "Gera a vazão e a pressão que o sistema precisa para funcionar.",
      ],
      [
        "Hace circular el fluido por el sistema con la presión adecuada.",
        "Faz o fluido circular pelo sistema com a pressão adequada.",
      ],
    ],
    desgaste: [
      "Pérdida de fuerza, ruido o calentamiento del fluido indican desgaste de la bomba.",
      "Perda de força, ruído ou aquecimento do fluido indicam desgaste da bomba.",
    ],
    dica: [
      "Antes de montarla, cambiá el filtro y revisá el nivel y el estado del fluido.",
      "Antes de montar, troque o filtro e confira o nível e o estado do fluido.",
    ],
    curto: ["bomba", "bomba"],
  },
  {
    re: /\bCILINDRO\b|\bPISTAO|\bPISTON|\bCAMISA\b|\bSEGMENTO|\bBIELA|\bVIRABREQUIM|\bCOMANDO\b|\bCABECOTE|\bVALVULA DE (ADMISSAO|ESCAPE)/,
    funcao: [
      [
        "Componente interno que trabaja bajo carga y temperatura elevadas.",
        "Componente interno que trabalha sob carga e temperatura elevadas.",
      ],
    ],
    desgaste: [
      "Pérdida de compresión, humo o consumo de aceite señalan desgaste interno.",
      "Perda de compressão, fumaça ou consumo de óleo sinalizam desgaste interno.",
    ],
    dica: [
      "Medí las tolerancias y usá juntas y sellos nuevos en el armado.",
      "Meça as tolerâncias e use juntas e vedações novas na montagem.",
    ],
    curto: ["pieza de motor o cilindro", "peça de motor ou cilindro"],
  },
  {
    re: /\bVALVULA/,
    funcao: [
      [
        "Controla el paso, la dirección o la presión del fluido en el sistema.",
        "Controla a passagem, a direção ou a pressão do fluido no sistema.",
      ],
    ],
    desgaste: [
      "Movimientos lentos, golpes o pérdida de presión pueden venir de una válvula trabada o gastada.",
      "Movimentos lentos, trancos ou perda de pressão podem vir de uma válvula travada ou gasta.",
    ],
    dica: [
      "Limpiá el sistema antes de montarla: la suciedad es la causa más común de falla.",
      "Limpe o sistema antes de montar: a sujeira é a causa mais comum de falha.",
    ],
    curto: ["válvula", "válvula"],
  },
  {
    re: /\bMANGUEIRA|\bMANGUERA|\bTUBO\b|\bCONEXAO|\bNIPLE|\bCANO\b/,
    funcao: [
      [
        "Conduce el fluido entre los componentes del sistema.",
        "Conduz o fluido entre os componentes do sistema.",
      ],
    ],
    desgaste: [
      "Fisuras, abultamientos o pérdidas en las uniones indican que hay que cambiarla.",
      "Rachaduras, bolhas ou vazamentos nas conexões indicam que é preciso trocar.",
    ],
    dica: [
      "Verificá el tipo de rosca y el largo antes de pedir.",
      "Confira o tipo de rosca e o comprimento antes de pedir.",
    ],
    curto: ["conducción de fluido", "condução de fluido"],
  },
  {
    re: /\bSENSOR|\bINTERRUPTOR|\bCHAVE\b|\bRELE\b|\bALTERNADOR|\bMOTOR DE PARTIDA|\bARRANQUE|\bSOLENOIDE|\bCHICOTE|\bLAMPADA|\bFAROL|\bCONECTOR|\bBATERIA|\bPAINEL|\bTACOMETRO|\bTRATOMETRO/,
    funcao: [
      [
        "Componente del sistema eléctrico que controla o informa el funcionamiento del equipo.",
        "Componente do sistema elétrico que controla ou informa o funcionamento do equipamento.",
      ],
    ],
    desgaste: [
      "Fallas intermitentes, alarmes en el tablero o falta de señal pueden venir de este componente.",
      "Falhas intermitentes, alarmes no painel ou falta de sinal podem vir deste componente.",
    ],
    dica: [
      "Revisá conectores y cableado antes de cambiarlo: muchas fallas son de contacto.",
      "Revise conectores e chicote antes de trocar: muitas falhas são de contato.",
    ],
    curto: ["componente eléctrico", "componente elétrico"],
  },
  {
    re: /\bEMBREAGEM|\bEMBRAGUE|\bPLATO\b|\bPLATOR|\bDISCO DE EMBR/,
    funcao: [
      [
        "Parte del embrague, que conecta y desconecta el motor de la transmisión.",
        "Parte da embreagem, que liga e desliga o motor da transmissão.",
      ],
    ],
    desgaste: [
      "Patinamiento, trepidación o dificultad para pasar los cambios indican desgaste del embrague.",
      "Patinação, trepidação ou dificuldade de engatar as marchas indicam desgaste da embreagem.",
    ],
    dica: [
      "Conviene cambiar disco, placa y rulemán de empuje juntos.",
      "Vale trocar disco, platô e rolamento de embreagem juntos.",
    ],
    curto: ["embrague", "embreagem"],
  },
  {
    re: /\bFREIO|\bFRENO|\bLONA\b|\bPASTILHA|\bSAPATA/,
    funcao: [
      [
        "Componente del sistema de freno, clave para la seguridad del equipo.",
        "Componente do sistema de freio, essencial para a segurança do equipamento.",
      ],
    ],
    desgaste: [
      "Frenado desparejo, ruido o pedal largo indican revisión del freno.",
      "Frenagem desigual, ruído ou pedal baixo indicam revisão do freio.",
    ],
    dica: [
      "Cambiá las piezas de freno de a pares, en ambos lados.",
      "Troque as peças de freio aos pares, nos dois lados.",
    ],
    curto: ["freno", "freio"],
  },
  {
    re: /\bDIRECAO|\bDIRECCION|\bTERMINAL\b|\bPIVO|\bBARRA DE/,
    funcao: [
      [
        "Pieza del sistema de dirección, que transmite el movimiento del volante a las ruedas.",
        "Peça do sistema de direção, que transmite o movimento do volante às rodas.",
      ],
    ],
    desgaste: [
      "Juego en el volante o desgaste irregular de los neumáticos indican revisión de la dirección.",
      "Folga no volante ou desgaste irregular dos pneus indicam revisão da direção.",
    ],
    dica: [
      "Después del cambio, alineá la dirección.",
      "Depois da troca, faça o alinhamento da direção.",
    ],
    curto: ["dirección", "direção"],
  },
  {
    re: /\bCORREIA|\bCORREA\b|\bCORRENTE\b|\bCADENA/,
    funcao: [
      [
        "Transmite movimiento entre poleas o piñones del equipo.",
        "Transmite movimento entre polias ou engrenagens do equipamento.",
      ],
    ],
    desgaste: [
      "Grietas, estiramiento o ruido indican que hay que cambiarla.",
      "Rachaduras, alongamento ou ruído indicam que é preciso trocar.",
    ],
    dica: [
      "Ajustá la tensión según el manual después de montarla.",
      "Ajuste a tensão conforme o manual depois de montar.",
    ],
    curto: ["transmisión por correa o cadena", "transmissão por correia ou corrente"],
  },
  {
    re: /\bCRUZETA|\bCARDAN|\bTDP\b|\bTOMADA DE FORCA/,
    funcao: [
      [
        "Pieza del cardán o de la toma de fuerza, que transmite potencia a los implementos.",
        "Peça do cardã ou da TDP, que transmite potência aos implementos.",
      ],
    ],
    desgaste: [
      "Golpes al arrancar o vibración en el cardán indican crucetas gastadas.",
      "Trancos na saída ou vibração no cardã indicam cruzetas gastas.",
    ],
    dica: ["Engrasá las crucetas en cada servicio.", "Lubrifique as cruzetas a cada revisão."],
    curto: ["cardán / toma de fuerza", "cardã / TDP"],
  },
  {
    re: /\bRADIADOR|\bVENTILADOR|\bVENTOINHA|\bTERMOSTATO|\bVALVULA TERMOSTATICA/,
    funcao: [
      [
        "Parte del sistema de refrigeración, que mantiene el motor en la temperatura correcta.",
        "Parte do sistema de arrefecimento, que mantém o motor na temperatura correta.",
      ],
    ],
    desgaste: [
      "Recalentamiento o pérdidas de líquido indican revisión del sistema de refrigeración.",
      "Superaquecimento ou perda de líquido indicam revisão do arrefecimento.",
    ],
    dica: [
      "Usá el líquido refrigerante indicado y purgá el aire del sistema.",
      "Use o líquido de arrefecimento indicado e sangre o ar do sistema.",
    ],
    curto: ["refrigeración", "arrefecimento"],
  },
  {
    re: /\bNAVALHA|\bCUCHILLA|\bFACA\b|\bDEDO\b|\bPENEIRA|\bZARANDA|\bCONTRA ?FACA|\bSEGADOR/,
    funcao: [
      [
        "Pieza de corte o trilla de cosechadoras e implementos.",
        "Peça de corte ou trilha de colheitadeiras e implementos.",
      ],
    ],
    desgaste: [
      "Corte irregular o pérdidas de grano indican piezas de corte gastadas.",
      "Corte irregular ou perda de grãos indicam peças de corte gastas.",
    ],
    dica: [
      "Revisá las piezas de corte antes de cada zafra.",
      "Revise as peças de corte antes de cada safra.",
    ],
    curto: ["pieza de corte", "peça de corte"],
  },
  {
    re: /\bDISCO\b|\bSEM ?FIM|\bHELICE|\bROSCA TRANSP|\bBATEDOR|\bLIMPADOR|\bSULCADOR|\bDOSADOR|\bELEVADOR|\bCARACOL|\bEMBOLO|\bCONCAVO|\bSACA ?PALHA|\bLAMINA/,
    funcao: [
      [
        "Pieza de trabajo de cosechadoras, sembradoras, pulverizadoras o implementos.",
        "Peça de trabalho de colheitadeiras, plantadeiras, pulverizadores ou implementos.",
      ],
      [
        "Componente de los mecanismos que cortan, siembran, trasladan o dosifican en el campo.",
        "Componente dos mecanismos que cortam, plantam, transportam ou dosam no campo.",
      ],
    ],
    desgaste: [
      "Pérdida de rendimiento, siembra irregular o pérdidas de grano indican piezas gastadas.",
      "Perda de rendimento, plantio irregular ou perda de grãos indicam peças gastas.",
    ],
    dica: [
      "Revisá estas piezas antes de cada zafra para no parar en plena temporada.",
      "Revise estas peças antes de cada safra para não parar em plena temporada.",
    ],
    curto: ["pieza de implemento", "peça de implemento"],
  },
  {
    re: /\bBICO INJETOR|\bINJETOR|\bBOMBA INJETORA|\bELEMENTO COMBUSTIVEL|\bVALVULA DE ALIVIO DIESEL/,
    funcao: [
      [
        "Parte del sistema de inyección de combustible del motor diésel.",
        "Parte do sistema de injeção de combustível do motor diesel.",
      ],
    ],
    desgaste: [
      "Humo negro, arranque difícil o motor falleando indican revisión de la inyección.",
      "Fumaça preta, partida difícil ou motor falhando indicam revisão da injeção.",
    ],
    dica: [
      "Usá combustible limpio y cambiá el filtro: la suciedad daña la inyección.",
      "Use combustível limpo e troque o filtro: a sujeira danifica a injeção.",
    ],
    curto: ["inyección", "injeção"],
  },
  {
    re: /\bGRAXA\b|\bOLEO (LUBRIF|HIDR|MOTOR|TRANSM)|\bLUBRIFICANTE|\bARLA/,
    funcao: [
      [
        "Lubricante o fluido para el mantenimiento del motor, la transmisión o la hidráulica.",
        "Lubrificante ou fluido para a manutenção do motor, da transmissão ou da hidráulica.",
      ],
    ],
    desgaste: [
      "Usar el lubricante correcto alarga la vida de motor, transmisión y bombas.",
      "Usar o lubrificante correto aumenta a vida do motor, da transmissão e das bombas.",
    ],
    dica: [
      "Respetá la especificación y los intervalos de cambio del manual del equipo.",
      "Respeite a especificação e os intervalos de troca do manual do equipamento.",
    ],
    curto: ["lubricante", "lubrificante"],
  },
  {
    re: /\bKIT MOTOR|\bSUPER KIT|\bJOGO DE JUNTAS|\bKIT REPARO|\bREPARO\b/,
    funcao: [
      [
        "Kit con las piezas necesarias para la reparación del conjunto en una sola compra.",
        "Kit com as peças necessárias para o reparo do conjunto em uma só compra.",
      ],
    ],
    desgaste: [
      "Ideal para la reforma completa, evitando que una pieza vieja acorte la vida de las nuevas.",
      "Ideal para a reforma completa, evitando que uma peça velha encurte a vida das novas.",
    ],
    dica: [
      "Confirmá el modelo del motor o del conjunto antes de pedir: los kits varían por serie.",
      "Confirme o modelo do motor ou do conjunto antes de pedir: os kits variam por série.",
    ],
    curto: ["kit de reparación", "kit de reparo"],
  },
  {
    re: /\bTURBO|\bTURBINA|\bCOLETOR|\bCURVA (DE )?(ESCAPE|SUCCAO|ADMISSAO)|\bESCAPAMENTO|\bSILENCIOSO|\bABAFADOR/,
    funcao: [
      [
        "Parte del sistema de admisión o escape del motor, que influye directo en la potencia y el consumo.",
        "Parte do sistema de admissão ou escape do motor, que influi direto na potência e no consumo.",
      ],
    ],
    desgaste: [
      "Humo excesivo, silbidos o pérdida de potencia pueden indicar fallas en admisión o escape.",
      "Fumaça excessiva, assobios ou perda de potência podem indicar falhas na admissão ou escape.",
    ],
    dica: [
      "Cambiá juntas y abrazaderas en el montaje para evitar fugas.",
      "Troque juntas e abraçadeiras na montagem para evitar vazamentos.",
    ],
    curto: ["admisión y escape", "admissão e escape"],
  },
  {
    re: /\bPOLIA|\bPOLEA|\bTENSOR\b|\bESTICADOR/,
    funcao: [
      [
        "Guía y tensa la correa que mueve los accesorios del motor o del equipo.",
        "Guia e tensiona a correia que move os acessórios do motor ou do equipamento.",
      ],
    ],
    desgaste: [
      "Ruido, vibración o desgaste irregular de la correa indican revisión de la polea.",
      "Ruído, vibração ou desgaste irregular da correia indicam revisão da polia.",
    ],
    dica: [
      "Revisá la alineación con las otras poleas al montarla.",
      "Confira o alinhamento com as outras polias na montagem.",
    ],
    curto: ["polea", "polia"],
  },
  {
    re: /\bPNEU|\bCAMARA\b|\bNEUMATICO|\bARO \d/,
    funcao: [
      [
        "Neumático o cámara para equipos agrícolas: tracción y soporte del peso en el campo.",
        "Pneu ou câmara para equipamentos agrícolas: tração e sustentação do peso no campo.",
      ],
    ],
    desgaste: [
      "Grietas en los flancos, cortes o tacos gastados reducen la tracción y la seguridad.",
      "Rachaduras nas laterais, cortes ou garras gastas reduzem a tração e a segurança.",
    ],
    dica: [
      "Confirmá la medida grabada en el flanco del neumático actual.",
      "Confira a medida gravada na lateral do pneu atual.",
    ],
    curto: ["neumático", "pneu"],
  },
  {
    re: /\bALAVANCA|\bPALANCA|\bHASTE|\bCABO\b|\bPEDAL|\bVARAO|\bVARILLA|\bTIRANTE/,
    funcao: [
      [
        "Pieza de comando que transmite el movimiento del operador al mecanismo.",
        "Peça de comando que transmite o movimento do operador ao mecanismo.",
      ],
    ],
    desgaste: [
      "Juego, dureza o comandos que no vuelven indican desgaste en las articulaciones.",
      "Folga, comando duro ou que não retorna indicam desgaste nas articulações.",
    ],
    dica: [
      "Lubricá las articulaciones y revisá pernos y bujes del comando.",
      "Lubrifique as articulações e confira pinos e buchas do comando.",
    ],
    curto: ["comando", "comando"],
  },
  {
    re: /\bSUPORTE|\bSOPORTE|\bCUBO\b|\bPLACA\b|\bCHAPA\b|\bPROTECAO|\bTAMPA\b|\bCARCACA|\bCAPO\b|\bPARALAMA|\bEMBLEMA|\bESTEIRA|\bBRACO|\bFLANGE|\bREFORCO|\bDEFLETOR|\bGRELHA|\bTRINCO|\bBASE\b|\bTANQUE|\bCANAL\b|\bCONJ(UNTO)? (SD|SOLD)/,
    funcao: [
      [
        "Pieza estructural que sostiene, protege o fija componentes del equipo.",
        "Peça estrutural que sustenta, protege ou fixa componentes do equipamento.",
      ],
      [
        "Componente de estructura y carrocería del equipo.",
        "Componente de estrutura e carroceria do equipamento.",
      ],
    ],
    desgaste: [
      "Fisuras, deformaciones u orificios ovalados indican que hay que reemplazarla.",
      "Trincas, deformações ou furos ovalizados indicam que é preciso substituir.",
    ],
    dica: [
      "Compará la posición de los agujeros con la pieza original antes de montar.",
      "Compare a posição dos furos com a peça original antes de montar.",
    ],
    curto: ["estructura", "estrutura"],
  },
];

// Categoria do cadastro, quando o nome não diz o tipo
const CATEGORIA: Record<string, { funcao: Par; curto: Par }> = {
  "Engrenagens e Transmissão": {
    funcao: [
      "Forma parte del conjunto de transmisión, que lleva la fuerza del motor a las ruedas y a la toma de fuerza.",
      "Faz parte do conjunto de transmissão, que leva a força do motor às rodas e à TDP.",
    ],
    curto: ["transmisión", "transmissão"],
  },
  "Hidráulica e Pneumática": {
    funcao: [
      "Componente del sistema hidráulico, responsable del levante, la dirección y los comandos.",
      "Componente do sistema hidráulico, responsável pelo levante, direção e comandos.",
    ],
    curto: ["hidráulica", "hidráulica"],
  },
  Filtros: {
    funcao: [
      "Protege el motor y los sistemas del equipo reteniendo impurezas.",
      "Protege o motor e os sistemas do equipamento retendo impurezas.",
    ],
    curto: ["filtro", "filtro"],
  },
  Vedações: {
    funcao: [
      "Evita pérdidas de aceite y fluidos e impide la entrada de polvo y agua.",
      "Evita vazamento de óleo e fluidos e impede a entrada de poeira e água.",
    ],
    curto: ["sellado", "vedação"],
  },
  "Rolamentos e Mancais": {
    funcao: [
      "Sostiene ejes y piezas giratorias, reduciendo la fricción y el desgaste.",
      "Sustenta eixos e peças giratórias, reduzindo o atrito e o desgaste.",
    ],
    curto: ["rodamiento", "rolamento"],
  },
  "Elementos de Fixação": {
    funcao: [
      "Elemento de fijación usado en el montaje y mantenimiento de conjuntos mecánicos.",
      "Elemento de fixação usado na montagem e manutenção de conjuntos mecânicos.",
    ],
    curto: ["fijación", "fixação"],
  },
  "Freios e Embreagens": {
    funcao: [
      "Componente de freno o embrague, esencial para la seguridad y el control del equipo.",
      "Componente de freio ou embreagem, essencial para a segurança e o controle do equipamento.",
    ],
    curto: ["freno y embrague", "freio e embreagem"],
  },
  "Estrutura e Suspensão": {
    funcao: [
      "Pieza estructural o de soporte del equipo.",
      "Peça estrutural ou de suporte do equipamento.",
    ],
    curto: ["estructura", "estrutura"],
  },
  "Elétrica e Sensores": {
    funcao: [
      "Componente del sistema eléctrico del equipo.",
      "Componente do sistema elétrico do equipamento.",
    ],
    curto: ["eléctrica", "elétrica"],
  },
};

const t = (idioma: Idioma, par: Par) => (idioma === "pt" ? par[1] : par[0]);

export function tipoDaPeca(p: PecaTexto) {
  const n = sem(p.nome);
  return TIPOS.find((x) => x.re.test(n)) ?? null;
}

// Descrição do cadastro escrita pela equipe (não o modelo da importação): vale mais que o gerado
function descricaoPropria(p: PecaTexto) {
  const d = p.descricao?.trim();
  if (!d || /Antes de comprar, confira o c[oó]digo/i.test(d)) return null;
  return d;
}

const codigoDe = (p: PecaTexto) => (p.codigo_fabricante || p.sku).toUpperCase();
const marcaDe = (p: PecaTexto) =>
  p.marca_confirmada === false || !p.marca || p.marca === "Agrícola" ? null : p.marca;

// O mesmo código escrito como as pessoas digitam: "80293400-100" → "80293400100", "80293400 100"
function variacoesCodigo(codigo: string) {
  const v = new Set<string>();
  if (/[-./\s]/.test(codigo)) {
    v.add(codigo.replace(/[-./\s]/g, ""));
    v.add(codigo.replace(/[-./]/g, " "));
  }
  v.delete(codigo);
  return [...v].filter((x) => x.length >= 4);
}

// ---------------------------------------------------------------- Descrição da página
export function descricaoPeca(p: PecaTexto, idioma: Idioma): string {
  const pt = idioma === "pt";
  const nome = nomeLegivel(nomePeca(p, idioma));
  const codigo = codigoDe(p);
  const marca = marcaDe(p);
  const tipo = tipoDaPeca(p);
  const cat = p.categoria ? CATEGORIA[p.categoria] : null;
  const propria = pt ? descricaoPropria(p) : null;
  const partes: string[] = [];

  // 1. Identificação (varia). Marca e fabricante não se repetem se já estão no nome.
  const nomeSem = sem(nome);
  const fab =
    p.fabricante?.trim() && !nomeSem.includes(sem(p.fabricante.trim()))
      ? p.fabricante.trim()
      : null;
  const marcaTxt = marca && !nomeSem.includes(sem(marca)) ? marca : null;
  const intro: Par[] = [
    [
      `${nome}, código ${codigo}${marcaTxt ? `, para equipos ${marcaTxt}` : ""}.${fab ? ` Fabricante: ${fab}.` : ""}`,
      `${nome}, código ${codigo}${marcaTxt ? `, para equipamentos ${marcaTxt}` : ""}.${fab ? ` Fabricante: ${fab}.` : ""}`,
    ],
    [
      `Repuesto ${codigo}: ${nome.charAt(0).toLowerCase()}${nome.slice(1)}${marcaTxt ? ` para tractores y máquinas ${marcaTxt}` : ""}.${fab ? ` Fabricado por ${fab}.` : ""}`,
      `Peça ${codigo}: ${nome.charAt(0).toLowerCase()}${nome.slice(1)}${marcaTxt ? ` para tratores e máquinas ${marcaTxt}` : ""}.${fab ? ` Fabricada por ${fab}.` : ""}`,
    ],
    [
      `${nome}${marcaTxt ? ` ${marcaTxt}` : ""} con código ${codigo}${fab ? `, marca ${fab}` : ""}.`,
      `${nome}${marcaTxt ? ` ${marcaTxt}` : ""} com código ${codigo}${fab ? `, marca ${fab}` : ""}.`,
    ],
  ];
  partes.push(propria ?? t(idioma, escolher(intro, p.sku, "intro")));

  // 2. Para que serve, sinais de desgaste e dica (pelo tipo; senão, pela categoria)
  if (tipo) {
    partes.push(
      `${t(idioma, escolher(tipo.funcao, p.sku, "funcao"))} ${t(idioma, tipo.desgaste)}`,
      t(idioma, tipo.dica),
    );
  } else if (cat) {
    partes.push(t(idioma, cat.funcao));
  }

  // 3. Código em outras grafias (como se busca)
  const vari = variacoesCodigo(codigo);
  if (vari.length)
    partes.push(
      pt
        ? `Também encontrado como ${vari.join(" ou ")}.`
        : `También se busca como ${vari.join(" o ")}.`,
    );

  // 4. Estoque e envio (varia)
  const estoque = (p.estoque ?? 0) > 0;
  const envio: Par[] = [
    [
      "Te confirmamos precio y disponibilidad por WhatsApp.",
      "Enviamos para RS, SC e PR por Correios ou transportadora, com nota fiscal e rastreio.",
    ],
    [
      "Cotizá por WhatsApp con el código de la pieza.",
      "Envio para RS, SC e PR por Correios ou transportadora, com código de rastreio.",
    ],
    [
      "Respondemos por WhatsApp con precio y disponibilidad.",
      "Despachamos para qualquer cidade do RS, SC e PR.",
    ],
  ];
  partes.push(
    `${estoque ? (pt ? "Peça disponível em estoque. " : "Repuesto disponible en stock. ") : ""}${t(idioma, escolher(envio, p.sku, "envio"))}`,
  );

  // 5. Compatibilidade (varia)
  const compat: Par[] = [
    [
      "¿Dudas sobre la compatibilidad? Mandanos el modelo y el número de serie de tu equipo por WhatsApp y lo confirmamos.",
      "Dúvida sobre a compatibilidade? Mande o modelo e o número de série do equipamento pelo WhatsApp e confirmamos.",
    ],
    [
      "Antes de comprar, compará el código con la pieza que vas a reemplazar; si no lo encontrás, te ayudamos por WhatsApp.",
      "Antes de comprar, compare o código com a peça que será substituída; se não encontrar, ajudamos pelo WhatsApp.",
    ],
    [
      "Confirmamos la aplicación con el modelo y el número de serie de tu tractor antes de enviar.",
      "Confirmamos a aplicação pelo modelo e número de série do seu trator antes de enviar.",
    ],
    [
      "Si no estás seguro de que sea la pieza correcta, escribinos con una foto de la pieza vieja.",
      "Se não tem certeza de que é a peça certa, mande uma foto da peça antiga pelo WhatsApp.",
    ],
  ];
  partes.push(t(idioma, escolher(compat, p.sku, "compat")));

  return partes.join("\n\n");
}

// ---------------------------------------------------------------- Título e meta descrição
// Português (/pt): "Retentor New Holland 420462 | AGRO PARTS" (até ~60 caracteres; o sufixo sai se
// não couber). Espanhol (a versão que vai para o Google, Uruguai): o código na frente, porque a maior parte
// das buscas que já trazem o site são pelo código da peça, e o Google destaca o que bate com a
// busca. "30250100 · Filtro hidráulico tractor Valtra | Uruguay" (até ~60 caracteres).
function tituloPecaCodigo(p: PecaTexto, idioma: Idioma): string {
  const codigo = codigoDe(p);
  const marca = marcaDe(p);
  let nome = semCodigo(nomeLegivel(nomePeca(p, idioma)), codigo);
  if (!nome.includes(" ")) nome += idioma === "pt" ? " para trator" : " para tractor";
  const marcaTxt = marca && !sem(nome).includes(sem(marca)) ? ` ${marca}` : "";
  const inicio = `${codigo} · `;
  // Português (Sul do Brasil): a região no fim, como o "Uruguay" do espanhol
  const fim = idioma === "pt" ? " | RS, SC e PR" : " | Uruguay";
  const cabe = 60 - inicio.length - marcaTxt.length;
  if (nome.length <= cabe - fim.length) return `${inicio}${nome}${marcaTxt}${fim}`;
  if (nome.length <= cabe) return `${inicio}${nome}${marcaTxt}`;
  const curto = nome.slice(0, Math.max(18, cabe)).replace(/\s+\S*$/, "");
  return `${inicio}${curto}${marcaTxt}`;
}

// Tira o código do nome ("Filtro Valtra 30250100 Tecfil" → "Filtro Valtra Tecfil")
function semCodigo(nome: string, codigo: string): string {
  // Também tira palavra repetida ("Pulverizador Jacto 000026 Jacto" → "Pulverizador Jacto")
  const vistas = new Set<string>();
  const limpo = nome
    .split(/\s+/)
    .filter((w) => {
      const k = sem(w);
      if (k === sem(codigo)) return false;
      // Só palavras de verdade (marcas, nomes); "de", "y", números curtos podem repetir
      if (k.length > 3 && vistas.has(k)) return false;
      vistas.add(k);
      return true;
    })
    .join(" ")
    .trim();
  return limpo || nome;
}

export function tituloPeca(p: PecaTexto, idioma: Idioma): string {
  return tituloPecaCodigo(p, idioma);
}

// Formato antigo do título (nome primeiro e "| AGRO PARTS"), guardado para comparação
export function tituloPecaNomePrimeiro(p: PecaTexto, idioma: Idioma): string {
  let nome = nomeLegivel(nomePeca(p, idioma));
  const marca = marcaDe(p);
  const codigo = codigoDe(p);
  // Nome de uma palavra ("Engranaje", "Perno"): ganha o contexto da máquina
  if (!nome.includes(" ")) nome += idioma === "pt" ? " para trator" : " para tractor";
  // Marca e código só entram se o nome ainda não os tem
  const resto = `${marca && !sem(nome).includes(sem(marca)) ? ` ${marca}` : ""}${sem(nome).includes(sem(codigo)) ? "" : ` ${codigo}`}`;
  const base = `${nome}${resto}`;
  if (base.length + 13 <= 62) return `${base} | AGRO PARTS`;
  if (base.length <= 62) return base;
  // Longo demais: encurta o nome e mantém marca + código (o que se busca)
  const comCodigo = resto.includes(codigo) ? resto : `${resto} ${codigo}`;
  const max = Math.max(20, 60 - comCodigo.length);
  const curto = nome.slice(0, max).replace(/\s+\S*$/, "");
  return sem(curto).includes(sem(codigo)) ? `${curto}${resto}` : `${curto}${comCodigo}`;
}

// Espanhol: preço em $U e códigos equivalentes no resultado do Google (o que faz clicar)
export type ExtraMeta = {
  precoUyu?: number | null;
  precoBrl?: number | null;
  equivalentes?: string[];
};
function metaDescricaoPecaCodigo(p: PecaTexto, idioma: Idioma, extra: ExtraMeta): string {
  const pt = idioma === "pt";
  const codigo = codigoDe(p);
  const marca = marcaDe(p);
  const nome = semCodigo(nomeLegivel(nomePeca(p, idioma)), codigo);
  const marcaTxt = marca && !sem(nome).includes(sem(marca)) ? ` ${marca}` : "";
  const equiv = [
    ...new Set(
      (extra.equivalentes ?? []).map((c) =>
        String(c ?? "")
          .trim()
          .toUpperCase(),
      ),
    ),
  ]
    .filter((c) => c && c !== codigo)
    .slice(0, 3);
  const preco = pt
    ? extra.precoBrl && extra.precoBrl > 0
      ? `R$ ${extra.precoBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : ""
    : extra.precoUyu && extra.precoUyu > 0
      ? `$U ${Math.round(extra.precoUyu).toLocaleString("es-UY")}`
      : "";
  const estoque = (p.estoque ?? 0) > 0 ? (pt ? "em estoque" : "en stock") : "";
  const situacao = [preco, estoque].filter(Boolean).join(", ");
  const final = pt
    ? "Envio para RS, SC e PR com nota fiscal. Orçamento pelo WhatsApp."
    : "Código original. Cotizá por WhatsApp.";
  const partes = (comEquiv: boolean) =>
    `${nome}${marcaTxt}, código ${codigo}${comEquiv && equiv.length ? ` (${pt ? "equivale a" : "equivale a"} ${equiv.join(", ")})` : ""}.${situacao ? ` ${situacao[0].toUpperCase()}${situacao.slice(1)}.` : ""} ${final}`;
  const completa = partes(true);
  if (completa.length <= 160) return completa;
  const semEquiv = partes(false);
  return semEquiv.length <= 160 ? semEquiv : `${semEquiv.slice(0, 157).replace(/\s+\S*$/, "")}…`;
}

export function metaDescricaoPeca(p: PecaTexto, idioma: Idioma, extra: ExtraMeta = {}): string {
  return metaDescricaoPecaCodigo(p, idioma, extra);
}

// Formato antigo da descrição (sem preço), guardado para comparação
export function metaDescricaoPecaAntiga(p: PecaTexto, idioma: Idioma): string {
  const pt = idioma === "pt";
  const nome = nomeLegivel(nomePeca(p, idioma));
  const codigo = codigoDe(p);
  const marca = marcaDe(p);
  const tipo = tipoDaPeca(p);
  const cat = p.categoria ? CATEGORIA[p.categoria] : null;
  const funcao = tipo ? t(idioma, tipo.funcao[0]) : cat ? t(idioma, cat.funcao) : "";
  const estoque = (p.estoque ?? 0) > 0;
  const fim: Par[] = [
    [
      "Código original. Cotizá por WhatsApp.",
      "Envio para todo o Sul do Brasil. Orçamento pelo WhatsApp.",
    ],
    ["Consultá precio y envío por WhatsApp.", "Consulte preço e frete pelo WhatsApp."],
    ["Respuesta rápida por WhatsApp.", "Resposta rápida pelo WhatsApp e envio com rastreio."],
  ];
  const marcaTxt = marca && !sem(nome).includes(sem(marca)) ? ` ${marca}` : "";
  const codTxt = sem(nome).includes(sem(codigo)) ? "" : `, código ${codigo}`;
  const inicio = `${nome}${marcaTxt}${codTxt}${estoque ? (pt ? ", em estoque" : ", en stock") : ""}.`;
  const final = t(idioma, escolher(fim, p.sku, "meta"));
  const completa = `${inicio} ${funcao} ${final}`.replace(/\s+/g, " ").trim();
  if (completa.length <= 160) return completa;
  const semFuncao = `${inicio} ${final}`;
  return semFuncao.length <= 160 ? semFuncao : `${inicio.slice(0, 157).replace(/\s+\S*$/, "")}…`;
}
