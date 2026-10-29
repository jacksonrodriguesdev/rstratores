import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRouter } from "@tanstack/react-router";
import {
  X,
  Loader2,
  Mail,
  KeyRound,
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  BadgePercent,
  Bell,
  ShoppingCart,
  Ticket,
  MessageCircle,
  Smartphone,
} from "lucide-react";
import { getSessionFn } from "@/lib/user-auth";
import { getPopupFn, meuCupomFn, completarPerfilFn } from "@/lib/acesso";
import { visitanteAtual } from "@/lib/visitante";
import { DEPARTAMENTOS_UY, mascararCelularUY } from "@/lib/validacao-conta";
import { registrarEvento } from "@/lib/eventos";
import {
  EVENTO_PEDIR_CADASTRO,
  abrirWhatsapp,
  pedirPrecoWhatsapp,
  type PedidoCadastro,
} from "@/lib/pedir-cadastro";
import { PHONE, whatsappContactUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/idioma";

// Pop-up de cadastro ("Registrate gratis y accedé a todas nuestras herramientas"): aparece N
// segundos depois de abrir o site para quem não está logado — em toda visita, até se cadastrar —
// e também num momento de interesse (carrinho, busca sem resultado, catálogo, pedir preço pelo
// WhatsApp: pedirCadastro()). Pedir preço pelo WhatsApp exige conta: o WhatsApp só abre depois.
// Duas formas: só o WhatsApp (celular, sem conta: ganha o cupom e o WhatsApp de preço abre na hora;
// src/lib/contato-whatsapp.server.ts) ou o e-mail (código de 6 dígitos → conta criada na hora com o
// cupom único). Nome, departamento e celular ficam opcionais na tela final da conta.
const FECHADO = "popup_acceso_fechado"; // fechou nesta visita (sessionStorage: volta na próxima)
const FEITO = "popup_acceso_ok"; // já entrou/cadastrou por aqui
const CARRINHO_SESSAO = "popup_acceso_carrinho"; // já abriu pelo carrinho nesta sessão
const CONTATO_WA = "popup_contato_wa"; // deixou o WhatsApp: o pedido de preço abre direto
const PECAS_SESSAO = "popup_pecas_vistas"; // peças abertas nesta visita (modo "interesse")
const OCULTAR = [
  /^\/admin/,
  /^\/login/,
  /^\/cadastro/,
  /^\/cuenta/,
  /^\/baja/,
  /^\/catalogos\/ver/,
  /^\/pagar\//, // a página do link de pagamento já pede o login
];

const ler = (k: string, store: "local" | "sessao" = "local") => {
  try {
    return (store === "local" ? localStorage : sessionStorage).getItem(k);
  } catch {
    return null;
  }
};
const gravar = (k: string, v: string, store: "local" | "sessao" = "local") => {
  try {
    (store === "local" ? localStorage : sessionStorage).setItem(k, v);
  } catch {
    /* modo privado */
  }
};

type Etapa = "inicio" | "codigo" | "senha" | "ok";
type Canal = "whatsapp" | "email";
type Resultado = {
  nome: string;
  cupom: string | null;
  usado?: boolean;
  novo?: boolean;
  whatsapp?: boolean; // deixou só o celular (sem conta)
};

// Código da peça na mensagem do WhatsApp ("Código: X"), para saber o que a pessoa queria
const pecaDoLink = (url?: string) => {
  try {
    const txt = new URL(url ?? "").searchParams.get("text") ?? "";
    return [...txt.matchAll(/C[óo]d(?:igo)?:\s*([^\s\n]+)/g)].map((m) => m[1]).join(",") || null;
  } catch {
    return null;
  }
};
// Cupom no fim da mensagem do WhatsApp: a equipe já vê o desconto na conversa
const comCupom = (url: string, cupom: string | null | undefined, rotulo: string) => {
  if (!cupom) return url;
  try {
    const u = new URL(url);
    const atual = u.searchParams.get("text") ?? "";
    u.searchParams.delete("text");
    // encodeURIComponent (espaço = %20), igual aos outros links do site
    const texto = encodeURIComponent(`${atual}\n\n${rotulo}: ${cupom}`.trim());
    return `${u.toString()}${u.search ? "&" : "?"}text=${texto}`;
  } catch {
    return url;
  }
};
const aceitaWhatsapp = (m?: string) => m !== "catalogo" && m !== "cotizacao";
// Máscara do celular brasileiro: (53) 99999-9999
const mascararCelularBR = (e: string) => {
  let d = (e || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d;
  const resto = d.slice(2);
  const corte = resto.length > 8 ? 5 : 4;
  return `(${d.slice(0, 2)}) ${resto.slice(0, corte)}${resto.length > corte ? `-${resto.slice(corte)}` : ""}`;
};
const inputCls =
  "h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15";

export function PopupAcesso() {
  const location = useLocation();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: sessao, isFetched } = useQuery({
    queryKey: ["auth_session"],
    queryFn: () => getSessionFn(),
  });
  const { data: cfg } = useQuery({
    queryKey: ["popup_acesso"],
    queryFn: () => getPopupFn(),
    staleTime: 10 * 60_000,
  });
  const { t, idioma, href } = useT();
  const [aberto, setAberto] = useState(false);
  const [pedido, setPedido] = useState<PedidoCadastro | null>(null);
  const [etapa, setEtapa] = useState<Etapa>("inicio");
  const [canal, setCanal] = useState<Canal>("whatsapp");
  const [celular, setCelular] = useState("");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [dados, setDados] = useState({ nome: "", departamento: "", telefone: "" });
  const [perfilSalvo, setPerfilSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [reenviar, setReenviar] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [copiado, setCopiado] = useState(false);
  const primeiroCampo = useRef<HTMLInputElement>(null);
  const caminho = useRef(location.pathname);
  caminho.current = location.pathname;
  // Leitura atual dentro do ouvinte do evento (registrado uma vez)
  const estado = useRef({ sessao, cfg, aberto });
  estado.current = { sessao, cfg, aberto };

  // Ficam antes do "return null": o ouvinte do pedirCadastro usa os da primeira renderização
  const post = async (url: string, body: unknown) => {
    // x-idioma: o servidor responde (e manda o e-mail do código) no idioma da página
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-idioma": idioma },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok)
      throw new Error(
        j.error || t("Algo salió mal. Probá de nuevo.", "Algo deu errado. Tente de novo."),
      );
    return j;
  };

  async function enviarCodigo(para: string) {
    setErro(null);
    setOcupado(true);
    try {
      await post("/api/auth/codigo", { email: para });
      registrarEvento("popup", "codigo");
      setCodigo("");
      setReenviar(240); // 4 minutos até liberar outro código
      setEtapa("codigo");
    } catch (err: any) {
      setErro(err?.message ?? t("Algo salió mal.", "Algo deu errado."));
    } finally {
      setOcupado(false);
    }
  }

  const permitido = (p: string) => !OCULTAR.some((r) => r.test(p));

  // Voltou do Google pelo pop-up (?bienvenida=1): mostra o cupom
  useEffect(() => {
    if (!sessao || typeof window === "undefined") return;
    const u = new URL(window.location.href);
    if (u.searchParams.get("bienvenida") !== "1") return;
    u.searchParams.delete("bienvenida");
    window.history.replaceState(null, "", u.pathname + u.search + u.hash);
    meuCupomFn().then((r) => {
      if (!r) return;
      gravar(FEITO, "1");
      setResultado({ nome: r.nome, cupom: r.cupom, usado: r.usado });
      setEtapa("ok");
      setAberto(true);
      registrarEvento("popup", "login");
    });
  }, [sessao]);

  // Prévia pelo admin (?popup=preview): abre logo, mesmo logado ou já fechado
  useEffect(() => {
    if (!cfg || typeof window === "undefined") return;
    if (new URL(window.location.href).searchParams.get("popup") !== "preview") return;
    const t = setTimeout(() => setAberto(true), 800);
    return () => clearTimeout(t);
  }, [cfg]);

  // Modo "interesse": abre quando a pessoa mostra interesse, nunca de cara.
  // Gatilhos: abriu a 2ª peça nesta visita; ficou 40 s numa peça; no computador, o mouse saiu
  // pelo topo da janela (ia fechar a aba ou trocar de site) depois de 10 s no site.
  const pecasNaVisita = useRef(0);
  useEffect(() => {
    if (!/^(\/pt)?\/produto\//.test(location.pathname)) return;
    const n = Number(ler(PECAS_SESSAO, "sessao") || 0) + 1;
    gravar(PECAS_SESSAO, String(n), "sessao");
    pecasNaVisita.current = n;
  }, [location.pathname]);
  useEffect(() => {
    if (!cfg?.ativo || cfg.modo !== "interesse" || !isFetched || sessao) return;
    if (ler(FEITO) || ler(FECHADO, "sessao")) return;
    const abrir = (gatilho: string) => {
      const s = estado.current;
      if (s.aberto || s.sessao || ler(FEITO) || ler(FECHADO, "sessao")) return;
      if (!permitido(caminho.current)) return;
      setPedido(null);
      setEtapa("inicio");
      setCanal("whatsapp");
      setAberto(true);
      registrarEvento("popup", `visto:${gatilho}`);
    };
    const naPeca = () => /^(\/pt)?\/produto\//.test(caminho.current);
    // 2ª peça: espera 4 s na página (a pessoa vê a peça antes do pop-up)
    const t2 =
      naPeca() && pecasNaVisita.current >= 2 ? setTimeout(() => abrir("2a_peca"), 4000) : null;
    const t40 = naPeca() ? setTimeout(() => abrir("40s_peca"), 40_000) : null;
    const chegou = performance.now();
    const saida = (e: MouseEvent) => {
      if (e.clientY > 0 || e.relatedTarget) return;
      if (performance.now() - chegou < 10_000) return;
      abrir("saida");
    };
    const computador = window.matchMedia?.("(pointer: fine)").matches;
    if (computador) document.addEventListener("mouseout", saida);
    return () => {
      if (t2) clearTimeout(t2);
      if (t40) clearTimeout(t40);
      document.removeEventListener("mouseout", saida);
    };
  }, [cfg, isFetched, sessao, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Modo "tempo": abre N segundos depois de chegar, só para quem não está logado
  useEffect(() => {
    if (!cfg?.ativo || cfg.modo === "interesse" || !isFetched || sessao) return;
    if (ler(FEITO)) return;
    // Fechou nesta visita: só volta na próxima
    if (ler(FECHADO, "sessao")) return;
    // Conta desde a chegada na página (as consultas acima levam um tempo para responder) e só
    // abre depois que a pessoa interagiu (rolou, tocou, digitou): assim o pop-up não vira a
    // "maior imagem" da página na medição de velocidade do Google (LCP)
    const falta = Math.max(500, cfg.segundos * 1000 - performance.now());
    let tempoPassou = false;
    let interagiu = false;
    const abrir = () => {
      if (!tempoPassou || !interagiu) return;
      if (!permitido(caminho.current) || estado.current.aberto) return;
      setAberto(true);
      registrarEvento("popup", "visto");
    };
    const EVENTOS = ["scroll", "pointerdown", "keydown", "touchstart"] as const;
    const aoInteragir = () => {
      interagiu = true;
      for (const e of EVENTOS) window.removeEventListener(e, aoInteragir);
      abrir();
    };
    for (const e of EVENTOS) window.addEventListener(e, aoInteragir, { passive: true });
    const t = setTimeout(() => {
      tempoPassou = true;
      abrir();
    }, falta);
    return () => {
      clearTimeout(t);
      for (const e of EVENTOS) window.removeEventListener(e, aoInteragir);
    };
  }, [cfg, isFetched, sessao]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cotação exige conta: todo link do WhatsApp para o nosso número (pedir preço, cotizar, "busco
  // una pieza") passa pelo cadastro. Ficam livres só os de atendimento geral, marcados com
  // data-livre (rodapé, dúvidas de envio, ofertas). Os botões de preço da peça (data-cadastro)
  // já fazem isso sozinhos. Logado, o WhatsApp abre na hora.
  useEffect(() => {
    const clique = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || !a.href.includes(`phone=${PHONE}`)) return;
      if (a.dataset.livre || a.dataset.cadastro || caminho.current.startsWith("/admin")) return;
      e.preventDefault();
      e.stopPropagation();
      pedirPrecoWhatsapp(a.href);
    };
    document.addEventListener("click", clique, true);
    return () => document.removeEventListener("click", clique, true);
  }, []);

  // Momento de interesse: carrinho, busca sem resultado, catálogo
  useEffect(() => {
    const ouvir = (ev: Event) => {
      const p = (ev as CustomEvent<PedidoCadastro>).detail;
      if (!p) return;
      const { sessao: s, cfg: c, aberto: jaAberto } = estado.current;
      if (s) {
        // Já tem conta: vai direto para onde queria
        if (p.motivo === "whatsapp" && p.destino) abrirWhatsapp(p.destino, p.aoAbrir);
        else if (p.destino) window.location.href = p.destino;
        return;
      }
      // Pop-up desligado no admin, ou o aparelho já deixou o WhatsApp: abre direto
      if (p.motivo === "whatsapp" && p.destino && (!c?.ativo || ler(CONTATO_WA))) {
        // Quem deixou o WhatsApp: o cupom vai no fim da mensagem
        const cupom = ler(CONTATO_WA);
        abrirWhatsapp(
          cupom && cupom !== "1"
            ? comCupom(p.destino, cupom, t("Mi cupón", "Meu cupom"))
            : p.destino,
          p.aoAbrir,
        );
        return;
      }
      // Formulário de cotação com o pop-up desligado: cadastro pela página
      if (p.motivo === "cotizacao" && !c?.ativo) {
        window.location.href = `/cadastro?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (!c?.ativo) {
        // Pop-up desligado no admin: o catálogo continua pedindo conta pela página de cadastro
        if (p.motivo === "catalogo")
          window.location.href = `/cadastro?redirect=${encodeURIComponent(p.destino ?? "/catalogos")}`;
        return;
      }
      if (jaAberto) return;
      if (p.motivo === "carrinho") {
        // Só uma vez por sessão e nunca para quem já se cadastrou por aqui
        if (ler(FEITO) || ler(CARRINHO_SESSAO, "sessao")) return;
        gravar(CARRINHO_SESSAO, "1", "sessao");
      }
      setPedido(p);
      setErro(null);
      setEtapa("inicio");
      // Catálogo e formulário de cotação precisam de conta (e-mail); o resto aceita o WhatsApp
      setCanal(p.email || !aceitaWhatsapp(p.motivo) ? "email" : "whatsapp");
      if (p.email) setEmail(p.email);
      setAberto(true);
      registrarEvento("popup", `visto:${p.motivo}`);
      // E-mail já digitado na página: pede o código na hora
      if (p.email) void enviarCodigo(p.email);
    };
    window.addEventListener(EVENTO_PEDIR_CADASTRO, ouvir);
    return () => window.removeEventListener(EVENTO_PEDIR_CADASTRO, ouvir);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!aberto) return;
    setTimeout(() => primeiroCampo.current?.focus(), 80);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto, etapa]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reenviar <= 0) return;
    const t = setTimeout(() => setReenviar((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [reenviar]);

  if (!aberto || !cfg) return null;

  const desconto = cfg.desconto;
  const motivo = pedido?.motivo;
  const termo = pedido?.termo?.trim().slice(0, 60);
  const comDesconto = (x: string) => x.replace(/\{\{\s*descuento\s*\}\}/gi, String(desconto));
  // Textos curtos: o pop-up só convida a entrar (ou criar conta) para consultar preços e cotar
  const titulo =
    canal === "whatsapp" && motivo === "whatsapp"
      ? t("Recibí el precio por WhatsApp", "Receba o preço pelo WhatsApp")
      : canal === "whatsapp" && !motivo
        ? t(`${desconto}% OFF en tu primera compra`, `${desconto}% OFF na primeira compra`)
        : motivo === "whatsapp" || motivo === "cotizacao"
          ? t("Registrate para cotizar", "Cadastre-se para fazer seu orçamento")
          : motivo === "carrinho"
            ? t("Registrate para cotizar tu pedido", "Cadastre-se para orçar seu pedido")
            : motivo === "busca"
              ? termo
                ? t(`¿No encontraste "${termo}"?`, `Não encontrou "${termo}"?`)
                : t("¿No encontraste la pieza?", "Não encontrou a peça?")
              : motivo === "catalogo"
                ? t("Ingresá para abrir el catálogo", "Entre para abrir o catálogo")
                : // O texto do admin (Pop-up de cadastro) é o do site em espanhol
                  idioma === "pt"
                  ? "Entre para ver preços e fazer orçamentos"
                  : comDesconto(cfg.titulo);
  const porWhatsapp = canal === "whatsapp" && aceitaWhatsapp(motivo);
  const subtitulo = porWhatsapp
    ? motivo === "busca"
      ? t(
          "Dejá tu WhatsApp y te avisamos apenas llegue.",
          "Deixe seu WhatsApp e avisamos assim que chegar.",
        )
      : motivo === "whatsapp"
        ? t(
            `Dejá tu WhatsApp y abrimos el chat con la pieza. Además: ${desconto}% OFF en tu primera compra.`,
            `Deixe seu WhatsApp e abrimos a conversa com a peça. E mais: ${desconto}% OFF na primeira compra.`,
          )
        : t(
            "Dejá tu WhatsApp: te pasamos precios y confirmamos si la pieza sirve para tu tractor. Sin crear cuenta.",
            "Deixe seu WhatsApp: passamos preços e confirmamos se a peça serve no seu trator. Sem criar conta.",
          )
    : motivo === "busca"
      ? t(
          "Dejá tu e-mail y te avisamos apenas llegue.",
          "Deixe seu e-mail e avisamos assim que chegar.",
        )
      : !motivo
        ? idioma === "pt"
          ? "Cadastre-se grátis com seu e-mail em segundos."
          : comDesconto(cfg.subtitulo)
        : t(
            "Es gratis y lleva segundos: solo tu e-mail.",
            "É grátis e leva segundos: só o seu e-mail.",
          );

  function fechar() {
    if (etapa !== "ok") {
      // Fechar um pedido feito pela pessoa (busca, catálogo) não bloqueia o pop-up do tempo
      if (!pedido) gravar(FECHADO, String(Date.now()), "sessao");
      registrarEvento("popup", pedido ? `fechado:${pedido.motivo}` : "fechado");
    }
    setAberto(false);
    setPedido(null);
  }

  const terminar = async (r: Resultado, acao: "cadastro" | "login", eventId?: string) => {
    gravar(FEITO, "1");
    registrarEvento("popup", acao, eventId);
    setResultado(r);
    setEtapa("ok");
    await qc.invalidateQueries({ queryKey: ["auth_session"] });
    router.invalidate();
  };

  const acao = (fn: () => Promise<void>) => async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      await fn();
    } catch (err: any) {
      setErro(err?.message ?? t("Algo salió mal.", "Algo deu errado."));
    } finally {
      setOcupado(false);
    }
  };

  const pedirCodigo = (e?: React.FormEvent) => {
    e?.preventDefault();
    void enviarCodigo(email);
  };

  const verificar = acao(async () => {
    const j = await post("/api/auth/codigo/verificar", { email, codigo });
    if (j.novo) {
      // Conta nova: cria na hora, só com o e-mail confirmado
      const c = await post("/api/auth/rapido", { token: j.token });
      // Mesmo event_id do servidor (cadastro_<id>): o Meta conta o cadastro uma vez
      await terminar(
        { nome: c.nome ?? "", cupom: c.cupom, novo: true },
        "cadastro",
        c.id ? `cadastro_${c.id}` : undefined,
      );
    } else await terminar({ nome: j.nome, cupom: j.cupom, usado: j.cupomUsado }, "login");
  });

  const salvarPerfil = acao(async () => {
    const r = await completarPerfilFn({ data: dados });
    setPerfilSalvo(true);
    if (r.nome) setResultado((x) => (x ? { ...x, nome: r.nome! } : x));
  });

  const entrarComSenha = acao(async () => {
    await post("/api/auth/login", { email, senha });
    const r = await meuCupomFn();
    await terminar({ nome: r?.nome ?? "", cupom: r?.cupom ?? null, usado: r?.usado }, "login");
  });

  // Só o celular: sem conta, ganha o cupom e o WhatsApp de preço passa a abrir direto
  const enviarWhatsapp = acao(async () => {
    const interesse =
      motivo === "whatsapp"
        ? pecaDoLink(pedido?.destino)
        : motivo === "busca"
          ? (termo ?? null)
          : // Numa peça: o código dela; em outra página: o endereço
            decodeURIComponent(
              location.pathname.match(/^(?:\/pt)?\/produto\/([^/]+)/)?.[1] ?? "",
            ) || location.pathname;
    const j = await post("/api/public/contato-whatsapp", {
      telefone: celular,
      motivo: motivo ?? cfg.modo,
      pagina: location.pathname,
      interesse,
      visitorId: visitanteAtual().visitorId,
      site: (document.getElementById("popup-site") as HTMLInputElement | null)?.value,
    });
    // Guarda o cupom (ainda não usado) para ir nas próximas mensagens do WhatsApp
    gravar(CONTATO_WA, j.cupom && !j.usado ? j.cupom : "1");
    gravar(FEITO, "1");
    registrarEvento("popup", "whatsapp");
    setResultado({ nome: j.nome ?? "", cupom: j.cupom, usado: j.usado, whatsapp: true });
    setEtapa("ok");
  });

  const googleUrl = () => {
    // O destino do WhatsApp é externo: volta para a página atual
    const destinoInterno = pedido?.destino?.startsWith("/") ? pedido.destino : null;
    const u = new URL(destinoInterno ?? window.location.href, window.location.origin);
    u.searchParams.set("bienvenida", "1");
    return `/api/auth/google?redirect=${encodeURIComponent(u.pathname + u.search)}`;
  };

  const copiar = () => {
    if (!resultado?.cupom) return;
    navigator.clipboard?.writeText(resultado.cupom).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  const continuar = () => {
    setAberto(false);
    if (pedido?.motivo === "whatsapp" && pedido.destino)
      abrirWhatsapp(
        resultado?.usado
          ? pedido.destino
          : comCupom(pedido.destino, resultado?.cupom, t("Mi cupón", "Meu cupom")),
        pedido.aoAbrir,
      );
    else if (pedido?.destino) window.location.href = pedido.destino;
    setPedido(null);
  };

  const primeiroNome = (resultado?.nome ?? "").trim().split(/\s+/)[0] ?? "";
  const IconeMotivo =
    motivo === "whatsapp" || motivo === "cotizacao"
      ? MessageCircle
      : motivo === "carrinho"
        ? ShoppingCart
        : motivo === "busca"
          ? Bell
          : motivo === "catalogo"
            ? BookOpen
            : null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-acesso-titulo"
    >
      <div
        className="absolute inset-0 animate-in fade-in bg-black/60 backdrop-blur-[2px]"
        onClick={fechar}
      />
      <div className="relative flex max-h-[94vh] w-full animate-in slide-in-from-bottom-8 flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl duration-300 sm:max-w-[420px] sm:rounded-3xl sm:zoom-in-95">
        <button
          onClick={fechar}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex-1 overflow-y-auto p-6 sm:p-7">
          <img src="/logo.png" alt="AGRO PARTS" className="mb-3 h-11 w-auto" />
          {etapa === "ok" && resultado ? (
            <div className="flex h-full flex-col justify-center text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-8 w-8" />
              </span>
              <h2 id="popup-acesso-titulo" className="mt-4 text-2xl font-black text-zinc-900">
                {t("¡Listo", "Pronto")}
                {primeiroNome ? `, ${primeiroNome}` : ""}!
              </h2>
              <p className="mt-1 text-zinc-600">
                {resultado.whatsapp && motivo !== "busca" && motivo !== "whatsapp" ? (
                  t(
                    "Guardamos tu WhatsApp. Cuando pidas un precio, abrimos el chat directo.",
                    "Salvamos seu WhatsApp. Quando pedir um preço, abrimos a conversa direto.",
                  )
                ) : motivo === "busca" ? (
                  <>
                    {resultado.whatsapp
                      ? t(
                          "Te avisamos por WhatsApp apenas llegue",
                          "Avisamos pelo WhatsApp assim que chegar",
                        )
                      : t(
                          "Te avisamos por e-mail apenas llegue",
                          "Avisamos por e-mail assim que chegar",
                        )}
                    {termo ? (
                      <>
                        {" "}
                        <b className="text-zinc-900">"{termo}"</b>
                      </>
                    ) : (
                      t(" la pieza", " a peça")
                    )}
                    .
                  </>
                ) : motivo === "carrinho" ? (
                  t("Tu pedido queda guardado en tu cuenta.", "Seu pedido fica salvo na sua conta.")
                ) : motivo === "cotizacao" ? (
                  t("Ya podés enviar tu cotización.", "Agora você já pode enviar seu orçamento.")
                ) : motivo === "whatsapp" ? (
                  t(
                    "Ya podés pedir tu precio por WhatsApp.",
                    "Agora você já pode pedir seu preço pelo WhatsApp.",
                  )
                ) : (
                  t(
                    "Ya tenés acceso a todas nuestras herramientas.",
                    "Agora você tem acesso a todas as nossas ferramentas.",
                  )
                )}
              </p>
              {resultado.cupom && !resultado.usado && (
                <div className="mt-5 rounded-2xl border-2 border-dashed border-[#e0a800] bg-[#fffbeb] p-5">
                  <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-zinc-700">
                    <BadgePercent className="h-4 w-4 text-[#b8860b]" />{" "}
                    {t(
                      `Tu cupón de ${desconto}% en la primera compra`,
                      `Seu cupom de ${desconto}% na primeira compra`,
                    )}
                  </p>
                  <button
                    onClick={copiar}
                    className="mx-auto mt-2 flex items-center gap-2 font-mono text-3xl font-black tracking-[0.2em] text-primary"
                    title="Copiar"
                  >
                    {resultado.cupom}{" "}
                    {copiado ? (
                      <Check className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Copy className="h-5 w-5 text-zinc-400" />
                    )}
                  </button>
                  <p className="mt-2 text-xs text-zinc-500">
                    {resultado.whatsapp
                      ? t(
                          "Va solo en tu mensaje de WhatsApp. Guardalo por las dudas.",
                          "Ele vai sozinho na sua mensagem do WhatsApp. Guarde por via das dúvidas.",
                        )
                      : t(
                          "Mencioná el código al pedir por WhatsApp. También lo encontrás en Mi cuenta.",
                          "Informe o código ao pedir pelo WhatsApp. Ele também fica em Minha conta.",
                        )}
                  </p>
                </div>
              )}

              {/* Conta nova criada só com o e-mail: o resto é opcional */}
              {resultado.novo && !perfilSalvo && (
                <form
                  onSubmit={salvarPerfil}
                  className="mt-5 space-y-2 rounded-2xl bg-zinc-50 p-4 text-left"
                >
                  <p className="text-sm font-bold text-zinc-800">
                    {t("Completá tus datos", "Complete seus dados")}{" "}
                    <span className="font-normal text-zinc-500">
                      {t("(opcional)", "(opcional)")}
                    </span>
                  </p>
                  <input
                    autoComplete="name"
                    placeholder={t("Nombre", "Nome")}
                    value={dados.nome}
                    onChange={(e) => setDados({ ...dados, nome: e.target.value })}
                    className={cn(inputCls, "h-11")}
                  />
                  {/* Departamento e celular uruguaios: só na versão em espanhol */}
                  {idioma === "es" && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        value={dados.departamento}
                        onChange={(e) => setDados({ ...dados, departamento: e.target.value })}
                        className={cn(
                          inputCls,
                          "h-11 appearance-none",
                          !dados.departamento && "text-zinc-400",
                        )}
                      >
                        <option value="">Departamento</option>
                        {DEPARTAMENTOS_UY.map((d) => (
                          <option key={d} value={d} className="text-zinc-900">
                            {d}
                          </option>
                        ))}
                      </select>
                      <input
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="Celular (ofertas por WhatsApp)"
                        value={dados.telefone}
                        onChange={(e) =>
                          setDados({ ...dados, telefone: mascararCelularUY(e.target.value) })
                        }
                        className={cn(inputCls, "h-11")}
                      />
                    </div>
                  )}
                  <button
                    disabled={
                      ocupado || (!dados.nome.trim() && !dados.departamento && !dados.telefone)
                    }
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 text-sm font-bold text-primary hover:bg-primary/5 disabled:opacity-50"
                  >
                    {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}{" "}
                    {t("Guardar", "Salvar")}
                  </button>
                </form>
              )}
              {perfilSalvo && (
                <p className="mt-3 text-sm font-semibold text-emerald-700">
                  {t("Datos guardados. ¡Gracias!", "Dados salvos. Obrigado!")}
                </p>
              )}
              {erro && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {erro}
                </p>
              )}

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {motivo === "whatsapp" ? (
                  <button
                    onClick={continuar}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] font-bold text-white hover:bg-[#1EBE57] sm:col-span-2"
                  >
                    <MessageCircle className="h-5 w-5" />{" "}
                    {t("Pedir precio por WhatsApp", "Pedir preço pelo WhatsApp")}
                  </button>
                ) : motivo === "catalogo" ? (
                  <button
                    onClick={continuar}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white hover:bg-primary/90 sm:col-span-2"
                  >
                    <BookOpen className="h-5 w-5" /> {t("Abrir el catálogo", "Abrir o catálogo")}
                  </button>
                ) : resultado.whatsapp ? (
                  <>
                    {/* Sem conta: o catálogo pediria o e-mail; o próximo passo é a conversa */}
                    <button
                      onClick={() => {
                        setAberto(false);
                        abrirWhatsapp(
                          comCupom(
                            whatsappContactUrl(
                              t(
                                "¡Hola! Busco un repuesto para mi tractor.",
                                "Olá! Procuro uma peça para o meu trator.",
                              ),
                            ),
                            resultado.usado ? null : resultado.cupom,
                            t("Mi cupón", "Meu cupom"),
                          ),
                        );
                      }}
                      className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] font-bold text-white hover:bg-[#1EBE57]"
                    >
                      <MessageCircle className="h-5 w-5" />{" "}
                      {t("Hablar por WhatsApp", "Falar no WhatsApp")}
                    </button>
                    <button
                      onClick={continuar}
                      className="h-12 rounded-xl border font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      {t("Seguir navegando", "Continuar navegando")}
                    </button>
                  </>
                ) : (
                  <>
                    <a
                      href={href("/catalogos")}
                      className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white hover:bg-primary/90"
                    >
                      <BookOpen className="h-5 w-5" /> {t("Ver catálogos", "Ver catálogos")}
                    </a>
                    <button
                      onClick={continuar}
                      className="h-12 rounded-xl border font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      {t("Seguir navegando", "Continuar navegando")}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              {etapa !== "inicio" && (
                <button
                  onClick={() => {
                    setErro(null);
                    setEtapa("inicio");
                  }}
                  className="mb-3 flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-zinc-800"
                >
                  <ArrowLeft className="h-4 w-4" /> {t("Volver", "Voltar")}
                </button>
              )}
              {etapa === "inicio" && IconeMotivo && (
                <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <IconeMotivo className="h-5 w-5" />
                </span>
              )}
              <h2
                id="popup-acesso-titulo"
                className="pr-8 text-2xl font-black leading-tight text-zinc-900 sm:text-[28px]"
              >
                {etapa === "codigo"
                  ? t("Revisá tu e-mail", "Confira seu e-mail")
                  : etapa === "senha"
                    ? t("Entrá con tu contraseña", "Entre com sua senha")
                    : titulo}
              </h2>
              <p className="mt-2 text-[15px] text-zinc-600">
                {etapa === "codigo" ? (
                  <>
                    {t(
                      "Te enviamos un código de 6 dígitos a",
                      "Enviamos um código de 6 dígitos para",
                    )}{" "}
                    <b className="text-zinc-900">{email}</b>.{" "}
                    {t(
                      "Vale por 10 minutos; puede tardar un minuto en llegar.",
                      "Vale por 10 minutos; pode levar um minuto para chegar.",
                    )}
                  </>
                ) : etapa === "senha" ? (
                  t("Si ya tenés cuenta con contraseña.", "Se você já tem conta com senha.")
                ) : (
                  subtitulo
                )}
              </p>

              {etapa === "inicio" && (
                <>
                  {aceitaWhatsapp(motivo) && (
                    <div
                      role="tablist"
                      className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 text-sm font-bold"
                    >
                      {(
                        [
                          ["whatsapp", "WhatsApp", MessageCircle],
                          ["email", "E-mail", Mail],
                        ] as const
                      ).map(([c, rotulo, Icone]) => (
                        <button
                          key={c}
                          type="button"
                          role="tab"
                          aria-selected={canal === c}
                          onClick={() => {
                            setErro(null);
                            setCanal(c);
                            registrarEvento("popup", `aba:${c}`);
                          }}
                          className={cn(
                            "flex h-10 items-center justify-center gap-1.5 rounded-lg transition",
                            canal === c
                              ? "bg-white text-zinc-900 shadow-sm"
                              : "text-zinc-500 hover:text-zinc-800",
                          )}
                        >
                          <Icone
                            className={cn(
                              "h-4 w-4",
                              c === "whatsapp" && canal === c && "text-[#1EBE57]",
                            )}
                          />{" "}
                          {rotulo}
                        </button>
                      ))}
                    </div>
                  )}
                  {porWhatsapp ? (
                    <>
                      <form onSubmit={enviarWhatsapp} className="mt-4 space-y-3">
                        {/* Campo escondido: só robô preenche */}
                        <input
                          id="popup-site"
                          name="site"
                          tabIndex={-1}
                          autoComplete="off"
                          className="hidden"
                          aria-hidden="true"
                        />
                        <label className="relative block">
                          <Smartphone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                          <input
                            ref={primeiroCampo}
                            required
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            aria-label={t("Tu celular con WhatsApp", "Seu celular com WhatsApp")}
                            placeholder={idioma === "pt" ? "(53) 99999-9999" : "09X XXX XXX"}
                            value={celular}
                            onChange={(e) =>
                              setCelular(
                                idioma === "pt"
                                  ? mascararCelularBR(e.target.value)
                                  : mascararCelularUY(e.target.value),
                              )
                            }
                            className={cn(inputCls, "pl-12 text-lg tracking-wide")}
                          />
                        </label>
                        <button
                          disabled={ocupado || celular.replace(/\D/g, "").length < 8}
                          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-base font-bold text-white shadow-lg shadow-[#25D366]/30 hover:bg-[#1EBE57] disabled:opacity-60"
                        >
                          {ocupado ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <MessageCircle className="h-5 w-5" />
                          )}{" "}
                          {motivo === "whatsapp"
                            ? t("Seguir al WhatsApp", "Ir para o WhatsApp")
                            : motivo === "busca"
                              ? t("Avisarme por WhatsApp", "Me avise pelo WhatsApp")
                              : t("Quiero mi cupón", "Quero meu cupom")}
                        </button>
                      </form>
                      <p className="mt-2 text-center text-[11px] leading-relaxed text-zinc-400">
                        {t("Al continuar aceptás la", "Ao continuar, você aceita a")}{" "}
                        <a
                          href={href("/ayuda") + "#privacidad"}
                          target="_blank"
                          className="underline"
                        >
                          {t("política de privacidad", "política de privacidade")}
                        </a>{" "}
                        {t(
                          "y que te escribamos por WhatsApp. Sin spam: nos pedís que paremos y paramos.",
                          "e que falemos com você pelo WhatsApp. Sem spam: é só pedir para parar.",
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      <form
                        onSubmit={
                          cfg.codigo
                            ? pedirCodigo
                            : (e) => {
                                e.preventDefault();
                                setEtapa("senha");
                              }
                        }
                        className="mt-4 space-y-3"
                      >
                        <input
                          ref={primeiroCampo}
                          type="email"
                          required
                          autoComplete="email"
                          inputMode="email"
                          placeholder={t("tu@email.com", "seu@email.com")}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={inputCls}
                        />
                        <button
                          disabled={ocupado}
                          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-60"
                        >
                          {ocupado ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Mail className="h-5 w-5" />
                          )}{" "}
                          {t("Continuar", "Continuar")}
                        </button>
                      </form>
                      <p className="mt-2 text-center text-[11px] leading-relaxed text-zinc-400">
                        {t("Al continuar aceptás la", "Ao continuar, você aceita a")}{" "}
                        <a
                          href={href("/ayuda") + "#privacidad"}
                          target="_blank"
                          className="underline"
                        >
                          {t("política de privacidad", "política de privacidade")}
                        </a>{" "}
                        {t(
                          "y recibir ofertas por e-mail. Te das de baja cuando quieras.",
                          "e receber ofertas por e-mail. Você pode cancelar quando quiser.",
                        )}
                      </p>
                      {cfg.google && (
                        <>
                          <div className="my-3 flex items-center gap-3 text-xs font-semibold uppercase text-zinc-400">
                            <span className="h-px flex-1 bg-zinc-200" /> {t("o", "ou")}{" "}
                            <span className="h-px flex-1 bg-zinc-200" />
                          </div>
                          <a
                            href={googleUrl()}
                            className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
                          >
                            <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
                              <path
                                fill="#FFC107"
                                d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
                              />
                              <path
                                fill="#FF3D00"
                                d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                              />
                              <path
                                fill="#4CAF50"
                                d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
                              />
                              <path
                                fill="#1976D2"
                                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
                              />
                            </svg>
                            {t("Continuar con Google", "Continuar com Google")}
                          </a>
                        </>
                      )}
                      {cfg.codigo && (
                        <button
                          onClick={() => {
                            setErro(null);
                            setEtapa("senha");
                          }}
                          className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                        >
                          <KeyRound className="h-4 w-4" />{" "}
                          {t("Ya tengo cuenta con contraseña", "Já tenho conta com senha")}
                        </button>
                      )}
                    </>
                  )}
                </>
              )}

              {etapa === "codigo" && (
                <form onSubmit={verificar} className="mt-5 space-y-3">
                  <input
                    ref={primeiroCampo}
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={7}
                    placeholder="000000"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className={cn(
                      inputCls,
                      "text-center font-mono text-2xl font-bold tracking-[0.5em]",
                    )}
                  />
                  <button
                    disabled={ocupado || codigo.length !== 6}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white hover:bg-primary/90 disabled:opacity-60"
                  >
                    {ocupado && <Loader2 className="h-5 w-5 animate-spin" />}{" "}
                    {t("Entrar", "Entrar")}
                  </button>
                  <p className="text-center text-sm text-zinc-500">
                    {t("¿No llegó? Revisá spam o", "Não chegou? Confira o spam ou")}{" "}
                    {reenviar > 0 ? (
                      <span>
                        {t("podés pedir otro en", "peça outro em")} {Math.floor(reenviar / 60)}:
                        {String(reenviar % 60).padStart(2, "0")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => pedirCodigo()}
                        className="font-semibold text-primary hover:underline"
                      >
                        {t("reenviar código", "reenviar código")}
                      </button>
                    )}
                  </p>
                </form>
              )}

              {etapa === "senha" && (
                <form onSubmit={entrarComSenha} className="mt-5 space-y-3">
                  <input
                    ref={!email ? primeiroCampo : undefined}
                    type="email"
                    required
                    autoComplete="email"
                    placeholder={t("tu@email.com", "seu@email.com")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                  />
                  <input
                    ref={email ? primeiroCampo : undefined}
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder={t("Contraseña", "Senha")}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className={inputCls}
                  />
                  <button
                    disabled={ocupado}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-white hover:bg-primary/90 disabled:opacity-60"
                  >
                    {ocupado && <Loader2 className="h-5 w-5 animate-spin" />} Entrar
                  </button>
                  <p className="text-center text-sm text-zinc-500">
                    {t("¿No tenés cuenta?", "Não tem conta?")}{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setErro(null);
                        setEtapa("inicio");
                      }}
                      className="font-semibold text-primary hover:underline"
                    >
                      {t("Creala con tu e-mail", "Crie com seu e-mail")}
                    </button>
                  </p>
                </form>
              )}

              {erro && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {erro}
                </p>
              )}
              {etapa === "inicio" && (
                <button
                  onClick={fechar}
                  className="mt-4 w-full text-center text-xs text-zinc-400 hover:text-zinc-600"
                >
                  {t("Ahora no, gracias", "Agora não, obrigado")}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
