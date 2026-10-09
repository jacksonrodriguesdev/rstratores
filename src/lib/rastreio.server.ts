// Rastreio de visitantes: localização pelo IP, origem da visita, aparelho e navegador.
//
// - Localização: base offline DB-IP City Lite (https://db-ip.com, licença CC BY 4.0). O
//   servidor baixa o arquivo (~130 MB) na primeira visita e atualiza todo mês. O IP do
//   visitante não sai do servidor e não é gravado: guardamos só um hash (para contar
//   visitantes sem identificar ninguém).
// - Pasta da base: GEOIP_DIR, ou "geoip-agroparts" ao lado da pasta de uploads (persistente).
import fs from "fs";
import path from "path";
import zlib from "zlib";
import crypto from "crypto";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { pastaUploads } from "./uploads.server";

// ---------- GeoIP ----------
type Geo = { country: string | null; country_code: string | null; region: string | null; city: string | null; latitude: number | null; longitude: number | null };

const pastaGeo = () => path.resolve(process.env.GEOIP_DIR || path.join(pastaUploads(), "..", "geoip-agroparts"));
const arquivoGeo = () => path.join(pastaGeo(), "dbip-city-lite.mmdb");

let leitor: any = null;
let baixando: Promise<void> | null = null;
let carregadoEm = 0;

async function baixarBase() {
  fs.mkdirSync(pastaGeo(), { recursive: true });
  const hoje = new Date();
  const meses = [0, 1].map((k) => {
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - k, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  for (const m of meses) {
    const res = await fetch(`https://download.db-ip.com/free/dbip-city-lite-${m}.mmdb.gz`);
    if (!res.ok || !res.body) continue;
    const tmp = arquivoGeo() + ".baixando";
    await pipeline(Readable.fromWeb(res.body as any), zlib.createGunzip(), fs.createWriteStream(tmp));
    fs.renameSync(tmp, arquivoGeo());
    console.log(`[rastreio] base de localização atualizada (${m})`);
    return;
  }
  throw new Error("não foi possível baixar a base de localização");
}

async function abrirLeitor() {
  const arq = arquivoGeo();
  const velho = !fs.existsSync(arq) || Date.now() - fs.statSync(arq).mtimeMs > 35 * 24 * 3600 * 1000;
  if (velho && !baixando) {
    // Em segundo plano: a visita é gravada mesmo sem localização enquanto a base baixa
    baixando = baixarBase()
      .then(() => { leitor = null; })
      .catch((e) => console.error("[rastreio]", e.message))
      .finally(() => { baixando = null; });
  }
  if (!fs.existsSync(arq)) return null;
  if (!leitor || Date.now() - carregadoEm > 24 * 3600 * 1000) {
    const maxmind = await import("maxmind");
    leitor = await maxmind.open(arq);
    carregadoEm = Date.now();
  }
  return leitor;
}

const nome = (n: any) => n?.names?.["pt-BR"] || n?.names?.es || n?.names?.en || null;

export async function localizar(ip: string | null): Promise<Geo> {
  const vazio: Geo = { country: null, country_code: null, region: null, city: null, latitude: null, longitude: null };
  if (!ip) return vazio;
  try {
    const l = await abrirLeitor();
    const r = l?.get(ip);
    if (!r) return vazio;
    return {
      // Nome do país em inglês: casa com o mapa do painel; o painel traduz pelo código
      country: r.country?.names?.en ?? null,
      country_code: r.country?.iso_code ?? null,
      region: nome(r.subdivisions?.[0])?.replace(/ Department$/, "") ?? null,
      city: nome(r.city),
      latitude: r.location?.latitude ?? null,
      longitude: r.location?.longitude ?? null,
    };
  } catch {
    return vazio;
  }
}

// ---------- IP ----------
export function ipDaRequisicao(request: Request): string | null {
  const h = request.headers;
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("true-client-ip") ||
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    null;
  if (!ip || /^(127\.|10\.|192\.168\.|::1$|fc|fd)/i.test(ip)) return null;
  return ip.replace(/^::ffff:/, "");
}

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip + "|" + (process.env.JWT_SECRET || "agroparts")).digest("hex").slice(0, 32);
}

// ---------- Aparelho ----------
export function lerAparelho(ua: string) {
  const device = /iPad|Tablet|(Android(?!.*Mobile))/i.test(ua) ? "tablet" : /Mobi|iPhone|Android/i.test(ua) ? "celular" : "computador";
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iPod/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS X/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Outro";
  const browser = /Instagram/i.test(ua)
    ? "Instagram (app)"
    : /FBAN|FBAV|FB_IAB/i.test(ua)
      ? "Facebook (app)"
      : /WhatsApp/i.test(ua)
        ? "WhatsApp"
        : /Edg\//i.test(ua)
          ? "Edge"
          : /SamsungBrowser/i.test(ua)
            ? "Samsung"
            : /OPR\/|Opera/i.test(ua)
              ? "Opera"
              : /Firefox|FxiOS/i.test(ua)
                ? "Firefox"
                : /Chrome|CriOS/i.test(ua)
                  ? "Chrome"
                  : /Safari/i.test(ua)
                    ? "Safari"
                    : "Outro";
  return { device, os, browser };
}

export const ehRobo = (ua: string) =>
  /bot|crawler|spider|preview|lighthouse|headless|facebookexternalhit|whatsapp\/|slurp|bingpreview|curl|wget|python|axios|node-fetch/i.test(ua);

// ---------- Origem ----------
export type Atribuicao = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  gclid?: boolean;
  fbclid?: boolean;
  referrer?: string;
};

const FONTES: Array<[RegExp, string]> = [
  [/^(ig|instagram)/i, "instagram"],
  [/^(fb|facebook|meta)/i, "facebook"],
  [/^(google|adwords|gads)/i, "google"],
  [/^(wa|whatsapp)/i, "whatsapp"],
  [/^(bing|microsoft)/i, "bing"],
  [/^(tiktok)/i, "tiktok"],
  [/^(email|mail|newsletter)/i, "email"],
];

export function classificarOrigem(a: Atribuicao, siteHost: string) {
  const host = (() => {
    try {
      return a.referrer ? new URL(a.referrer).hostname.replace(/^www\./, "") : "";
    } catch {
      return "";
    }
  })();
  const interno = !!host && (host === siteHost || host.endsWith("." + siteHost) || host === "localhost");

  if (a.utm_source) {
    const fonte = FONTES.find(([re]) => re.test(a.utm_source!))?.[1] ?? a.utm_source.toLowerCase().slice(0, 40);
    const m = (a.utm_medium || "").toLowerCase();
    const meio = /cpc|ppc|paid|ads|pago/.test(m) ? "pago" : /email/.test(m) ? "email" : m ? m.slice(0, 40) : "campanha";
    return { fonte, meio, referrer_host: interno ? null : host || null };
  }
  if (a.gclid) return { fonte: "google", meio: "pago", referrer_host: host || null };
  if (a.fbclid) return { fonte: /instagram/.test(host) ? "instagram" : "facebook", meio: "pago", referrer_host: host || null };
  if (!host || interno) return { fonte: "direto", meio: "direto", referrer_host: null };
  if (/google\./.test(host)) return { fonte: "google", meio: "orgânico", referrer_host: host };
  if (/bing\.|duckduckgo|yahoo|ecosia/.test(host)) return { fonte: host.split(".")[0], meio: "orgânico", referrer_host: host };
  if (/instagram\./.test(host)) return { fonte: "instagram", meio: "social", referrer_host: host };
  if (/facebook\.|fb\.com|fb\.me/.test(host)) return { fonte: "facebook", meio: "social", referrer_host: host };
  if (/whatsapp|wa\.me/.test(host)) return { fonte: "whatsapp", meio: "social", referrer_host: host };
  if (/t\.co|twitter|x\.com|tiktok|youtube|linkedin/.test(host)) return { fonte: host.split(".")[0], meio: "social", referrer_host: host };
  return { fonte: host, meio: "referência", referrer_host: host };
}
