// Tradução do catálogo para espanhol (Uruguai), feita na hora de exibir.
// O banco guarda os nomes em português (vêm dos fornecedores); aqui um glossário técnico
// traduz palavra por palavra. Palavras fora do glossário (códigos, marcas, medidas) ficam iguais.
// A mesma tabela, ao contrário, deixa o cliente buscar em espanhol ("rodamiento" acha "ROLAMENTO").

// Chaves sem acento e em maiúsculas.
const GLOSSARIO: Record<string, string> = {
  // conectivos
  DE: "DE", DO: "DEL", DA: "DE LA", DOS: "DE LOS", DAS: "DE LAS", NO: "EN EL", NA: "EN LA",
  NOS: "EN LOS", NAS: "EN LAS", COM: "CON", SEM: "SIN", E: "Y", OU: "O", EM: "EN", AO: "AL",
  DAGUA: "DE AGUA", PARA: "PARA",
  // peças
  EIXO: "EJE", EIXOS: "EJES", ENGRENAGEM: "ENGRANAJE", ENGRENAGENS: "ENGRANAJES", ENGR: "ENGR",
  ANEL: "ANILLO", ANEIS: "ANILLOS", ROLAMENTO: "RODAMIENTO", ROLAMENTOS: "RODAMIENTOS",
  RETENTOR: "RETÉN", RETENTORES: "RETENES", RET: "RET", BUCHA: "BUJE", BUCHAS: "BUJES",
  ARRUELA: "ARANDELA", ARRUELAS: "ARANDELAS", REPARO: "REPARACIÓN", REPAROS: "REPARACIONES",
  PARAFUSO: "TORNILLO", PARAFUSOS: "TORNILLOS", POLIA: "POLEA", POLIAS: "POLEAS", PINO: "PERNO",
  PINOS: "PERNOS", SUPORTE: "SOPORTE", SUPORTES: "SOPORTES", TAMPA: "TAPA", TAMPAS: "TAPAS",
  OLEO: "ACEITE", EMBREAGEM: "EMBRAGUE", EMB: "EMBR", VALVULA: "VÁLVULA", VALVULAS: "VÁLVULAS",
  MANGUEIRA: "MANGUERA", MANGUEIRAS: "MANGUERAS", MANG: "MANG", CABO: "CABLE", CABOS: "CABLES",
  MOLA: "RESORTE", MOLAS: "RESORTES", CAIXA: "CAJA", CAIXAS: "CAJAS", FREIO: "FRENO",
  FREIOS: "FRENOS", MANCAL: "COJINETE", MANCAIS: "COJINETES", VEDACAO: "SELLO", VEDACOES: "SELLOS",
  VEDADOR: "SELLO", PORCA: "TUERCA", PORCAS: "TUERCAS", COMANDO: "MANDO",
  COMBUSTIVEL: "COMBUSTIBLE", COMB: "COMB", BRACO: "BRAZO", BRACOS: "BRAZOS", GARFO: "HORQUILLA",
  GARFOS: "HORQUILLAS", HIDRAULICO: "HIDRÁULICO", HIDRAULICA: "HIDRÁULICA",
  HIDRAULICOS: "HIDRÁULICOS", CONICOS: "CÓNICOS", CONICO: "CÓNICO", CONICA: "CÓNICA",
  GUIA: "GUÍA", GUIAS: "GUÍAS", PRESSAO: "PRESIÓN", FLANGE: "BRIDA", FLANGES: "BRIDAS",
  PALHA: "PAJA", PALHAS: "PAJAS", ALAVANCA: "PALANCA", ALAVANCAS: "PALANCAS", ROLETE: "RODILLO",
  ROLETES: "RODILLOS", ROLO: "RODILLO", ROLOS: "RODILLOS", FIXO: "FIJO", FIXA: "FIJA",
  PINHAO: "PIÑÓN", PINHOES: "PIÑONES", ACO: "ACERO", CALCO: "SUPLEMENTO", CALCOS: "SUPLEMENTOS",
  DIR: "DER", DIRECAO: "DIRECCIÓN", CARCACA: "CARCASA", RODA: "RUEDA", RODAS: "RUEDAS",
  PISTAO: "PISTÓN", PISTOES: "PISTONES", LUVA: "MANGUITO", LUVAS: "MANGUITOS", HASTE: "VÁSTAGO",
  HASTES: "VÁSTAGOS", COROA: "CORONA", DUPLA: "DOBLE", DUPLO: "DOBLE",
  ACIONAMENTO: "ACCIONAMIENTO", ACION: "ACCION", FIM: "FIN", CABECOTE: "TAPA DE CILINDROS",
  JOGO: "JUEGO", DIANTEIRO: "DELANTERO", DIANTEIRA: "DELANTERA", DIANT: "DEL", ENCOSTO: "RESPALDO",
  TRAVA: "TRABA", TRAVAS: "TRABAS", ESQ: "IZQ", ESPACADOR: "ESPACIADOR", ESPACADORA: "ESPACIADORA",
  ARTICULACAO: "ARTICULACIÓN", PRISIONEIRO: "ESPÁRRAGO", PRISIONEIROS: "ESPÁRRAGOS",
  ESQUERDO: "IZQUIERDO", ESQUERDA: "IZQUIERDA", DIREITO: "DERECHO", DIREITA: "DERECHA",
  COLETOR: "COLECTOR", ESTEIRA: "CINTA", ARVORE: "ÁRBOL", PENEIRA: "ZARANDA", PENEIRAS: "ZARANDAS",
  LUBRIFICANTE: "LUBRICANTE", LUBRIF: "LUBRIC", NAVALHA: "CUCHILLA", NAVALHAS: "CUCHILLAS",
  INJETOR: "INYECTOR", INJETORES: "INYECTORES", INJETORA: "INYECTORA", INJ: "INY",
  BATEDOR: "BATIDOR", TRANSMISSAO: "TRANSMISIÓN", BORRACHA: "GOMA", TRACAO: "TRACCIÓN",
  TRASEIRO: "TRASERO", TRASEIRA: "TRASERA", BLOCO: "BLOQUE", TOMADA: "TOMA", CONEXAO: "CONEXIÓN",
  CONEXOES: "CONEXIONES", FACA: "CUCHILLA", FACAS: "CUCHILLAS", FLEXIVEL: "FLEXIBLE", BICO: "PICO",
  BICOS: "PICOS", ENGATE: "ENGANCHE", GRAOS: "GRANOS", GRAO: "GRANO", PROTETOR: "PROTECTOR",
  CARTER: "CÁRTER", BRONZINA: "COJINETE", BRONZINAS: "COJINETES", TRATOR: "TRACTOR",
  TRATORES: "TRACTORES", CORRENTE: "CADENA", CORRENTES: "CADENAS", FURO: "AGUJERO",
  FUROS: "AGUJEROS", DECALQUE: "CALCOMANÍA", DEFLETOR: "DEFLECTOR", RETRILHA: "RETRILLA",
  AMORTECEDOR: "AMORTIGUADOR", ADMISSAO: "ADMISIÓN", ORING: "O-RING", MANGA: "MANGUETA",
  SATELITE: "SATÉLITE", SATELITES: "SATÉLITES", INJECAO: "INYECCIÓN", PLANETARIA: "PLANETARIA",
  ACOPLAMENTO: "ACOPLAMIENTO", DENTES: "DIENTES", DENTE: "DIENTE", FIXADOR: "FIJADOR",
  GERAL: "GENERAL", CURTO: "CORTO", CURTA: "CORTA", LONGO: "LARGO", LONGA: "LARGA",
  SEXTAVADO: "HEXAGONAL", SEXTAVADA: "HEXAGONAL", SEXT: "HEX", CONCAVO: "CÓNCAVO", CABINE: "CABINA",
  BUJAO: "TAPÓN", FERRO: "HIERRO", TABULEIRO: "BANDEJA", ELASTICO: "ELÁSTICO",
  SILENCIOSO: "SILENCIADOR", SAIDA: "SALIDA", CRUZETA: "CRUCETA", SELETOR: "SELECTOR",
  TDP: "TDF", SEGURANCA: "SEGURIDAD", PIVO: "PIVOTE", FORCA: "FUERZA", AGULHA: "AGUJA",
  AGULHAS: "AGUJAS", CABECA: "CABEZA", SIMPLES: "SIMPLE", MESTRE: "MAESTRO", AGRICOLA: "AGRÍCOLA",
  AGRICOLAS: "AGRÍCOLAS", PONTA: "PUNTA", PONTAS: "PUNTAS", CILINDRICOS: "CILÍNDRICOS",
  CILINDRICO: "CILÍNDRICO", VARETA: "VARILLA", HELICE: "HÉLICE", CORPO: "CUERPO",
  RESFRIADOR: "ENFRIADOR", INTERMEDIARIA: "INTERMEDIA", INTERMEDIARIO: "INTERMEDIO",
  RETA: "RECTA", RETO: "RECTO", TRAVESSA: "TRAVESAÑO", TRAVESSAS: "TRAVESAÑOS", PONTO: "PUNTO",
  RESPIRO: "RESPIRADERO", BAIXA: "BAJA", BAIXO: "BAJO", REDUCAO: "REDUCCIÓN", ESTRIAS: "ESTRÍAS",
  CREMALHEIRA: "CREMALLERA", LAMINA: "LÁMINA", LAMINAS: "LÁMINAS", RETRATIL: "RETRÁCTIL",
  COMPRESSOR: "COMPRESOR", ACASALADO: "APAREADO", PROTECAO: "PROTECCIÓN", CARDAN: "CARDÁN",
  ROTULA: "RÓTULA", ESTRUTURA: "ESTRUCTURA", EXTENSAO: "EXTENSIÓN", REGULAGEM: "REGULACIÓN",
  BRONZE: "BRONCE", FAROL: "FARO", FAROIS: "FAROS", VELOCIDADE: "VELOCIDAD", SUCCAO: "SUCCIÓN",
  COXIM: "TACO", COXINS: "TACOS", APOIO: "APOYO", FIXACAO: "FIJACIÓN", PONTEIRA: "PUNTERA",
  ESTICADOR: "TENSOR", MEIA: "MEDIA", PARTIDA: "ARRANQUE", COLAR: "COLLAR", REDUZIDA: "REDUCIDA",
  HIDROSTATICA: "HIDROSTÁTICA", HIDROSTATICO: "HIDROSTÁTICO", LAMPADA: "LÁMPARA",
  CONTROLE: "CONTROL", TERCEIRO: "TERCER", TRATOMETRO: "HORÓMETRO", VIRABREQUIM: "CIGÜEÑAL",
  MAIOR: "MAYOR", ABRACADEIRA: "ABRAZADERA", ABRACADEIRAS: "ABRAZADERAS",
  DESCARREGADOR: "DESCARGADOR", BALANCEIRO: "BALANCÍN", APERTADOR: "APRETADOR",
  ASSENTO: "ASIENTO", POSICAO: "POSICIÓN", ELETRICO: "ELÉCTRICO", ELETRICA: "ELÉCTRICA",
  ELETRICOS: "ELÉCTRICOS", PRATO: "PLATO", FELTRO: "FIELTRO", GRADE: "RASTRA",
  SEMENTE: "SEMILLA", SEMENTES: "SEMILLAS", PLANTADEIRA: "SEMBRADORA", PLANTADORA: "SEMBRADORA",
  COLHEITADEIRA: "COSECHADORA", COLHEDORA: "COSECHADORA", SAPATA: "ZAPATA", SAPATAS: "ZAPATAS",
  BATERIA: "BATERÍA", CHAVE: "LLAVE", CHAVES: "LLAVES", BOTAO: "BOTÓN", PAINEL: "PANEL",
  RELE: "RELÉ", FUSIVEL: "FUSIBLE", LANTERNA: "LINTERNA", ESPELHO: "ESPEJO", VIDRO: "VIDRIO",
  BANCO: "ASIENTO", GRAXEIRA: "ALEMITE", GRAXA: "GRASA", PNEU: "NEUMÁTICO", PNEUS: "NEUMÁTICOS",
  CAMARA: "CÁMARA", LASTRO: "LASTRE", TUCHO: "BOTADOR", TUCHOS: "BOTADORES", EMBOLO: "ÉMBOLO",
  RESERVATORIO: "DEPÓSITO", COPO: "VASO", BOIA: "FLOTADOR", TORNEIRA: "CANILLA", FUSO: "HUSILLO",
  ELO: "ESLABÓN", CATRACA: "TRINQUETE", TRILHO: "RIEL", COIFA: "FUELLE", COIFAS: "FUELLES",
  CAPO: "CAPOT", PARALAMA: "GUARDABARROS", PARACHOQUE: "PARAGOLPES", ESCADA: "ESCALERA",
  DEGRAU: "ESCALÓN", ALCA: "MANIJA", PUXADOR: "MANIJA", MACANETA: "MANIJA", FECHADURA: "CERRADURA",
  DOBRADICA: "BISAGRA", GUARNICAO: "BURLETE", PALHETA: "PALETA", LIMPADOR: "LIMPIADOR",
  PRESILHA: "PRESILLA", GRAMPO: "GRAPA", GRAMPOS: "GRAPAS", CUPILHA: "PASADOR", REBITE: "REMACHE",
  REBITES: "REMACHES", MOTRIZ: "MOTRIZ", PECA: "PIEZA", PECAS: "PIEZAS",
  ENTRADA: "ENTRADA", LADO: "LADO", AGUA: "AGUA", CORREIA: "CORREA", CORREIAS: "CORREAS",
  RODIZIO: "RUEDITA", SEGMENTO: "SEGMENTO", ROSCA: "ROSCA", ROSCADO: "ROSCADO", ROSCADA: "ROSCADA",
  ESTRIADO: "ESTRIADO", ESTRIADA: "ESTRIADA", PLACA: "PLACA", CHAPA: "CHAPA", TUBO: "TUBO",
  TUBOS: "TUBOS", BOMBA: "BOMBA", BOMBAS: "BOMBAS", FILTRO: "FILTRO", FILTROS: "FILTROS",
  CUBO: "CUBO", DISCO: "DISCO", DISCOS: "DISCOS", JUNTA: "JUNTA", JUNTAS: "JUNTAS",
  CILINDRO: "CILINDRO", CILINDROS: "CILINDROS", KIT: "KIT", MOTOR: "MOTOR", BARRA: "BARRA",
  ESFERAS: "ESFERAS", ESFERA: "ESFERA", CONJUNTO: "CONJUNTO", SUBCONJUNTO: "SUBCONJUNTO",
  DESGASTE: "DESGASTE", VOLANTE: "VOLANTE", ESCAPE: "ESCAPE", SENSOR: "SENSOR",
  INTERRUPTOR: "INTERRUPTOR", RADIADOR: "RADIADOR", ROTOR: "ROTOR", TERMINAL: "TERMINAL",
  ARTICULADO: "ARTICULADO", CARREIRA: "HILERA", CARREIRAS: "HILERAS", ANTIADERENTE: "ANTIADHERENTE",
  CAPA: "CAPA", CONE: "CONO", ELEMENTO: "ELEMENTO", ALIMENTADOR: "ALIMENTADOR",
  ALIMENTADORA: "ALIMENTADORA", MOLINETE: "MOLINETE", PICADOR: "PICADOR", PLATAFORMA: "PLATAFORMA",
  SEPARADOR: "SEPARADOR", VENTILADOR: "VENTILADOR", ELEVADOR: "ELEVADOR", TANQUE: "TANQUE",
  NIVEL: "NIVEL", COMPLETO: "COMPLETO", COMPLETA: "COMPLETA", SUPERIOR: "SUPERIOR",
  INFERIOR: "INFERIOR", LATERAL: "LATERAL", CENTRAL: "CENTRAL", EXTERNO: "EXTERNO",
  EXTERNA: "EXTERNA", INTERNO: "INTERNO", INTERNA: "INTERNA", TEMPERATURA: "TEMPERATURA",
  DIFERENCIAL: "DIFERENCIAL", ALTERNADOR: "ALTERNADOR", TERMOSTATO: "TERMOSTATO",
  ADAPTADOR: "ADAPTADOR", INDICADOR: "INDICADOR", ESTABILIZADOR: "ESTABILIZADOR",
  SINCRONIZADOR: "SINCRONIZADOR", SINCRONIZADO: "SINCRONIZADO", DESLIZADOR: "DESLIZADOR",
  DESLIZANTE: "DESLIZANTE", RASPADOR: "RASPADOR", OSCILANTE: "OSCILANTE", SOLENOIDE: "SOLENOIDE",
  PEDAL: "PEDAL", ACELERADOR: "ACELERADOR", TURBO: "TURBO", BIELA: "BIELA", CAMISA: "CAMISA",
  CAMISAS: "CAMISAS", TENSOR: "TENSOR", TIRANTE: "TIRANTE", MANIVELA: "MANIVELA",
  MANIVELAS: "MANIVELAS", VARIADOR: "VARIADOR", CHAVETA: "CHAVETA", DIVISOR: "DIVISOR",
  CONTRAPESO: "CONTRAPESO", MARCHA: "MARCHA", PILOTO: "PILOTO", REDONDO: "REDONDO",
  ROTATIVA: "ROTATIVA", SOLDADO: "SOLDADO", MENOR: "MENOR", MONTADO: "MONTADO", MONTADA: "MONTADA",
  AUXILIAR: "AUXILIAR", BLINDADO: "BLINDADO", DISTANCIADOR: "DISTANCIADOR", CARACOL: "CARACOL",
  DENTADA: "DENTADA", DENTADO: "DENTADO", CURVA: "CURVA", TELA: "TELA", FINAL: "FINAL",
  CONTRA: "CONTRA", LISA: "LISA", LISO: "LISO", INOX: "INOX", RETORNO: "RETORNO", DESCARGA: "DESCARGA",
  AXIAL: "AXIAL", FRONTAL: "FRONTAL", CANAL: "CANAL", LONA: "LONA", SACA: "SACA", CORTE: "CORTE",
  AJUSTE: "AJUSTE", DEDO: "DEDO", DEDOS: "DEDOS", SEMI: "SEMI", ALTA: "ALTA", ALTO: "ALTO",
  CAMBIO: "CAMBIO", PLATO: "PLATO", PRINCIPAL: "PRINCIPAL", SISTEMA: "SISTEMA", ENTRADAS: "ENTRADAS",
  PORTA: "PORTA", NYLON: "NYLON", APOIOS: "APOYOS", PAR: "PAR", SERIE: "SERIE", GAS: "GAS",
  EXTERNOS: "EXTERNOS", INTERNOS: "INTERNOS", ELEMENTOS: "ELEMENTOS", MEDIDA: "MEDIDA",
  REFORCADO: "REFORZADO", REFORCADA: "REFORZADA", ORIGINAL: "ORIGINAL", PARALELO: "ALTERNATIVO",
  NOVO: "NUEVO", NOVA: "NUEVA", USADO: "USADO", ALUMINIO: "ALUMINIO", PLASTICO: "PLÁSTICO",
  METALICO: "METÁLICO", METALICA: "METÁLICA", VERMELHO: "ROJO", AMARELO: "AMARILLO", PRETO: "NEGRO",
  BRANCO: "BLANCO", AZUL: "AZUL", VERDE: "VERDE",
  LIGACAO: "CONEXIÓN", LUBRIFICACAO: "LUBRICACIÓN", TEMPERADO: "TEMPLADO", DISTRIBUICAO: "DISTRIBUCIÓN",
  ALOJAMENTO: "ALOJAMIENTO", ARRASTADOR: "ARRASTRADOR", BLINDAGEM: "BLINDAJE", FRICCAO: "FRICCIÓN",
  ESCAPAMENTO: "ESCAPE", ACIONADOR: "ACCIONADOR", FLANGEADO: "BRIDADO", FECHAMENTO: "CIERRE",
  ABASTECIMENTO: "ABASTECIMIENTO", RAPIDO: "RÁPIDO", ISOLADOR: "AISLADOR", INTEIRA: "ENTERA",
  INTEIRO: "ENTERO", ESPALHADOR: "ESPARCIDOR", GRANELEIRO: "TOLVA", RIGIDO: "RÍGIDO", ATUADOR: "ACTUADOR",
  ALIMENTACAO: "ALIMENTACIÓN", BRACADEIRA: "ABRAZADERA", REPOSICAO: "REPOSICIÓN", QUADRADO: "CUADRADO",
  REVESTIMENTO: "REVESTIMIENTO", ELEVACAO: "ELEVACIÓN", ATIVADO: "ACTIVADO", MUDANCA: "CAMBIO",
  PROLONGAMENTO: "PROLONGACIÓN", RETENCAO: "RETENCIÓN", INCLINACAO: "INCLINACIÓN", VIBRACOES: "VIBRACIONES",
  IGNICAO: "ENCENDIDO", REBITADO: "REMACHADO", ABAULADO: "ABOMBADO", ROTACAO: "ROTACIÓN",
  ARREFECIMENTO: "REFRIGERACIÓN", TUBULACAO: "TUBERÍA", CANTONEIRA: "ANGULAR", ESTACIONAMENTO: "ESTACIONAMIENTO",
  SECAO: "SECCIÓN", RETIFICADO: "RECTIFICADO", MONTAGEM: "MONTAJE", CARVAO: "CARBÓN", ARROZEIRA: "ARROCERA",
  AFOGADOR: "CEBADOR", BANDEJAO: "BANDEJA", BANDEIJAO: "BANDEJA", JUNCAO: "UNIÓN", PRESSIONADOR: "PRESIONADOR",
  TRAZEIRA: "TRASERA", TRAZEIRO: "TRASERO", REFORCO: "REFUERZO", TORCAO: "TORSIÓN", COMPRESSAO: "COMPRESIÓN",
  DESLIZAMENTO: "DESLIZAMIENTO", APALPADOR: "PALPADOR", BORRIFADOR: "ROCIADOR", LEVANTAMENTO: "LEVANTE",
  FLUTUACAO: "FLOTACIÓN", SEPARACAO: "SEPARACIÓN", EMPUNHADEIRA: "EMPUÑADURA", EXTENCAO: "EXTENSIÓN",
  TRAVAMENTO: "TRABA", SANFONADO: "CORRUGADO", REMANOFATURADO: "REMANUFACTURADO", MAO: "MANO",
  PARAFUSADO: "ATORNILLADO", AR: "AIRE", POEIRA: "POLVO", ENCHIMENTO: "LLENADO", CACAMBA: "BALDE",
  TAQUIMETRO: "TACÓMETRO", PRIMEIRA: "PRIMERA", PRIMEIRO: "PRIMER", SEGUNDA: "SEGUNDA", TERCEIRA: "TERCERA",
  QUARTA: "CUARTA", QUINTA: "QUINTA", SEXTA: "SEXTA", POTENCIA: "POTENCIA", SAPATILHA: "ZAPATILLA",
  ESCOVA: "CEPILLO", ESCOVAS: "CEPILLOS", CORDAO: "CORDÓN", ARAME: "ALAMBRE", GARRA: "GARRA", GARRAS: "GARRAS", ESTACIONADO: "ESTACIONAMIENTO", VEDANTE: "SELLADOR", ENGRAXADEIRA: "ALEMITE",
};

// Abreviações e palavras que só existem em português; usadas também na busca ao contrário.
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

// Nome da peça em espanhol. Mantém maiúsculas/minúsculas no estilo do original.
export function nomeEs(nome: string | null | undefined): string {
  if (!nome) return "";
  const maiusculo = nome === nome.toUpperCase();
  // Só palavras inteiras: letras grudadas em números fazem parte de códigos ("Z34 10E", "6205ZZ")
  const traduzido = nome.replace(/(?<![A-Za-zÀ-ÿ0-9])[A-Za-zÀ-ÿ]+(?![A-Za-zÀ-ÿ0-9])/g, (palavra) => {
    const chave = semAcento(palavra).toUpperCase();
    const es = GLOSSARIO[chave];
    if (!es) return palavra;
    if (maiusculo) return es;
    // "Rolamento de esferas" → "Rodamiento de esferas"
    const minus = es.toLowerCase();
    return palavra[0] === palavra[0].toUpperCase() ? minus[0].toUpperCase() + minus.slice(1) : minus;
  });
  return (
    traduzido
      .replace(/\bDE EL\b/g, "DEL")
      .replace(/\bde el\b/g, "del")
      // CABEÇOTE (masculino) vira "TAPA DE CILINDROS" (feminino)
      .replace(/\bDEL TAPA\b/g, "DE LA TAPA")
      .replace(/\bdel tapa\b/g, "de la tapa")
  );
}

const CATEGORIAS_ES: Record<string, { nome: string; curto: string; frase: string }> = {
  "Engrenagens e Transmissão": {
    nome: "Engranajes y Transmisión",
    curto: "Transmisión",
    frase: "Forma parte del conjunto de transmisión, que lleva la fuerza del motor a las ruedas y a la toma de fuerza.",
  },
  "Hidráulica e Pneumática": {
    nome: "Hidráulica y Neumática",
    curto: "Hidráulica",
    frase: "Componente de los sistemas hidráulicos y de conducción de fluidos del equipo.",
  },
  Filtros: {
    nome: "Filtros",
    curto: "Filtros",
    frase: "Cambiar los filtros en los intervalos indicados por el fabricante protege el motor y los sistemas hidráulicos.",
  },
  "Vedações": {
    nome: "Sellos y Juntas",
    curto: "Sellos",
    frase: "Los sellos evitan pérdidas de aceite y fluidos e impiden la entrada de polvo y agua en los conjuntos mecánicos.",
  },
  "Rolamentos e Mancais": {
    nome: "Rodamientos y Cojinetes",
    curto: "Rodamientos",
    frase: "Los rodamientos y cojinetes sostienen ejes y piezas giratorias, reduciendo la fricción y el desgaste.",
  },
  "Elementos de Fixação": {
    nome: "Tornillería y Fijación",
    curto: "Fijación",
    frase: "Elemento de fijación usado en el montaje y mantenimiento de conjuntos mecánicos.",
  },
  "Freios e Embreagens": {
    nome: "Frenos y Embragues",
    curto: "Frenos",
    frase: "Componente de los sistemas de freno o embrague, esenciales para la seguridad y el control del equipo.",
  },
  "Estrutura e Suspensão": {
    nome: "Estructura y Suspensión",
    curto: "Estructura",
    frase: "Pieza estructural o de soporte del equipo.",
  },
  "Elétrica e Sensores": {
    nome: "Eléctrica y Sensores",
    curto: "Eléctrica",
    frase: "Componente del sistema eléctrico del equipo.",
  },
  "Outros Componentes": { nome: "Otros Componentes", curto: "Otros", frase: "" },
};

// Nome da categoria em espanhol (o valor do banco continua em português nos filtros e URLs).
export function categoriaEs(nome: string | null | undefined): string {
  if (!nome) return "";
  return CATEGORIAS_ES[nome]?.nome ?? nomeEs(nome);
}

export function categoriaCurtaEs(nome: string | null | undefined): string {
  if (!nome) return "";
  return CATEGORIAS_ES[nome]?.curto ?? nomeEs(nome);
}

// Descrição em espanhol, montada a partir dos dados da peça (as descrições do banco
// seguem um modelo fixo em português, então é mais fiel gerar de novo do que traduzir).
export function descricaoEs(p: {
  nome: string;
  sku: string;
  codigo_fabricante?: string | null;
  fabricante?: string | null;
  marca?: string | null;
  categoria?: string | null;
}): string {
  const nome = nomeEs(p.nome);
  const frase = nome.charAt(0) + nome.slice(1).toLowerCase();
  const codigo = p.codigo_fabricante || p.sku;
  const partes = [
    `${frase}, código ${codigo}.${p.fabricante ? ` Fabricante: ${p.fabricante}.` : ""}`,
    `Repuesto para tractores y máquinas ${p.marca && p.marca !== "Agrícola" ? p.marca : "agrícolas"}.`,
  ];
  const cat = p.categoria ? CATEGORIAS_ES[p.categoria]?.frase : "";
  if (cat) partes.push(cat);
  partes.push(
    "Antes de comprar, verificá el código de la pieza que vas a reemplazar. Si tenés dudas sobre la compatibilidad, mandanos el modelo y el número de serie de tu equipo por WhatsApp y nuestro equipo lo confirma.",
  );
  return partes.join("\n\n");
}

// Busca em espanhol: cada palavra vira o termo em português que está no banco.
// "rodamiento conico" → "ROLAMENTO CONICOS". Palavras sem tradução seguem iguais.
let reverso: Record<string, string> | null = null;
function glossarioReverso() {
  if (reverso) return reverso;
  reverso = {};
  for (const [pt, es] of Object.entries(GLOSSARIO)) {
    if (es.includes(" ") || pt.length < 3) continue;
    const chave = semAcento(es).toUpperCase();
    // Mantém a primeira do glossário quando duas palavras em português dão a mesma em espanhol
    if (!(chave in reverso)) reverso[chave] = pt;
  }
  // Termos usados no Uruguai que não saem do glossário direto
  Object.assign(reverso, {
    RULEMAN: "ROLAMENTO", RULEMANES: "ROLAMENTO", RETEN: "RETENTOR", RETENES: "RETENTOR",
    ORING: "ORING", "O-RING": "ORING", BULON: "PARAFUSO", BULONES: "PARAFUSO", TUERCA: "PORCA",
    CORREA: "CORREIA", EMBRAGUE: "EMBREAGEM", BUJE: "BUCHA", RESORTE: "MOLA", MANGUERA: "MANGUEIRA",
    ENGRANAJE: "ENGRENAGEM", PINON: "PINHAO", ACEITE: "OLEO", JUNTA: "JUNTA", ZARANDA: "PENEIRA",
    CIGUENAL: "VIRABREQUIM", ARANDELA: "ARRUELA", CUCHILLA: "NAVALHA", BOTADOR: "TUCHO",
    HOROMETRO: "TRATOMETRO", COSECHADORA: "COLHEITADEIRA", SEMBRADORA: "PLANTADEIRA",
  });
  return reverso;
}

export function buscaParaPortugues(q: string): string {
  const rev = glossarioReverso();
  return q
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => rev[semAcento(w).toUpperCase()] ?? w)
    .join(" ");
}

// Títulos dos blocos da página inicial (editáveis no admin). Os que vieram em português
// aparecem em espanhol; um título já escrito em espanhol passa sem mudança.
const TITULOS_ES: Record<string, string> = {
  Categorias: "Categorías",
  "Lançamentos": "Novedades",
  Destaques: "Destacados",
  Produtos: "Productos",
  "Faixa promocional": "Promociones",
  "Mais vendidos": "Más vendidos",
  "Mais buscados": "Más buscados",
  Ofertas: "Ofertas",
  "Promoções": "Promociones",
  Novidades: "Novedades",
  Montadoras: "Marcas de tractor",
  "Compre por montadora": "Comprá por marca de tractor",
  "Avaliações": "Opiniones",
  Depoimentos: "Opiniones",
};

export function tituloEs(titulo: string | null | undefined): string | null {
  if (!titulo) return titulo ?? null;
  const t = titulo.trim();
  return TITULOS_ES[t] ?? CATEGORIAS_ES[t]?.nome ?? t;
}

// Expressões de várias palavras usadas no Uruguai que no catálogo são uma palavra só.
const FRASES_BUSCA: Array<[RegExp, string]> = [
  [/\bTAPA DE CILINDROS?\b/g, "CABECOTE"],
  [/\bTOMA DE FUERZA\b/g, "TDP"],
  [/\bCAJA DE CAMBIOS?\b/g, "CAIXA CAMBIO"],
  [/\bMOTOR DE ARRANQUE\b/g, "MOTOR PARTIDA"],
  [/\bBOMBA DE AGUA\b/g, "BOMBA AGUA"],
  [/\bBOMBA INYECTORA\b/g, "BOMBA INJETORA"],
  [/\bARBOL DE LEVAS\b/g, "COMANDO"],
  [/\bROSCA SIN FIN\b/g, "ROSCA SEM FIM"],
];
// Conectivos não ajudam a achar a peça ("junta de la tapa" = "junta tapa")
const CONECTIVOS = new Set(["DE", "DEL", "LA", "EL", "LOS", "LAS", "PARA", "CON", "Y", "E", "DO", "DA", "DOS", "DAS", "EN", "NO", "NA"]);

// Prepara a busca: troca expressões, tira conectivos (se sobrar alguma palavra) e acentos.
export function prepararBusca(q: string): string[] {
  let s = q.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  for (const [re, pt] of FRASES_BUSCA) s = s.replace(re, pt);
  const termos = s.split(/\s+/).filter(Boolean);
  const uteis = termos.filter((t) => !CONECTIVOS.has(t));
  return uteis.length ? uteis : termos;
}

// Frase de apresentação da categoria (topo da loja filtrada; ajuda no Google)
export function categoriaFraseEs(nome: string | null | undefined): string {
  return (nome && CATEGORIAS_ES[nome]?.frase) || "";
}
