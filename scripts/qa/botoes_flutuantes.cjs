// Uso: node scripts/qa/botoes_flutuantes.cjs [http://localhost:8080 | https://rsautopecas.com]
// Monitor: no celular, todo botão/link dentro de elementos fixos (flutuantes) precisa receber
// o toque no próprio centro (não pode estar coberto pela barra inferior nem por outro fixo).
// Testa também o fim da página (o rodapé não pode ficar escondido atrás da barra).
const { chromium } = require(process.cwd() + "/node_modules/playwright");
const BASE = process.argv[2] || "http://localhost:8080";
const PAGINAS = ["/", "/loja", "/loja?q=filtro", "/produto/022886NOR", "/produto/036656", "/pedido-rapido", "/ayuda", "/login", "/cadastro"];
(async () => {
  const b = await chromium.launch();
  let problemas = 0;
  for (const [nome, safe] of [["android", 0], ["iphone(34px)", 34]]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    if (safe) await ctx.addInitScript((s) => {
      // Chromium não tem área segura: simula a do iPhone
      const st = document.createElement("style");
      st.textContent = `.pb-safe{padding-bottom:${s}px!important}:root{--barra-inferior:calc(4rem + ${s}px)!important}`;
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(st));
    }, safe);
    const p = await ctx.newPage();
    for (const u of PAGINAS) {
      await p.goto(BASE + u, { waitUntil: "networkidle", timeout: 120000 }); await p.waitForTimeout(1200);
      for (const pos of ["topo", "meio", "fim"]) {
        await p.evaluate((pos) => scrollTo(0, pos === "topo" ? 0 : pos === "meio" ? document.body.scrollHeight / 2 : document.body.scrollHeight), pos);
        await p.waitForTimeout(700);
        const r = await p.evaluate(() => {
          const fixos = [...document.querySelectorAll("body *")].filter((e) => { const s = getComputedStyle(e); return s.position === "fixed" && s.display !== "none" && s.visibility !== "hidden" && e.getBoundingClientRect().height > 0; });
          const ruins = [];
          for (const f of fixos) for (const el of f.querySelectorAll("a, button")) {
            const q = el.getBoundingClientRect(); if (q.width < 8 || q.height < 8 || q.bottom < 0 || q.top > innerHeight) continue;
            // Ignora o que está escondido (opacidade 0) ou recortado por um pai com overflow
            let oculto = false; for (let a = el; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.opacity === "0" || cs.visibility === "hidden") { oculto = true; break; } if (a !== el && cs.overflow !== "visible") { const r2 = a.getBoundingClientRect(); if (q.top + q.height / 2 < r2.top || q.top + q.height / 2 > r2.bottom || q.left + q.width / 2 < r2.left || q.left + q.width / 2 > r2.right) { oculto = true; break; } } }
            if (oculto) continue;
            const pts = [[q.left + q.width / 2, q.top + q.height / 2], [q.left + q.width / 2, q.top + 4], [q.left + q.width / 2, q.bottom - 4]];
            for (const [x, y] of pts) { const hit = document.elementFromPoint(x, y); if (hit && hit !== el && !el.contains(hit)) { ruins.push(`"${(el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 30)}" coberto por <${hit.tagName.toLowerCase()} ${String(hit.className).slice(0, 40)}>`); break; } }
          }
          // fim da página: o último texto do rodapé precisa estar visível acima da barra
          const nav = document.querySelector('nav[aria-label="Navegación principal"]')?.getBoundingClientRect();
          const rod = [...document.querySelectorAll("footer p, footer a")].pop()?.getBoundingClientRect();
          if (nav && rod && scrollY + innerHeight >= document.body.scrollHeight - 2 && rod.bottom > nav.top + 1) ruins.push(`fim do rodapé escondido atrás da barra (${Math.round(rod.bottom - nav.top)}px)`);
          return [...new Set(ruins)];
        });
        if (r.length) { problemas += r.length; console.log(`${nome} ${u} [${pos}]:`, r.join(" | ")); }
      }
    }
    await ctx.close();
  }
  console.log(problemas ? `${problemas} problema(s)` : "Nenhum botão flutuante coberto em nenhuma página.");
  await b.close();
})();
