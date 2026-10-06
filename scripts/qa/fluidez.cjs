// Uso: node scripts/qa/fluidez.cjs [url completa da página]  (meça a build de produção: npm run build && npm start)
// Perfil de fluidez: rola a página em passos pequenos (como um dedo) com CPU 4x mais lenta
// e mede tarefas longas, quadros lentos e deslocamentos de layout.
const { chromium } = require(process.cwd() + "/node_modules/playwright");
const URL = process.argv[2] || "http://localhost:8080/";
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await p.addInitScript(() => {
    window.__long = []; window.__cls = []; window.__frames = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && window.__cls.push({ v: e.value, src: (e.sources || []).map((s) => s.node?.className?.toString?.().slice(0, 50) || s.node?.nodeName).join(" ; ") }))).observe({ type: "layout-shift", buffered: true });
  });
  await p.goto(URL, { waitUntil: "networkidle", timeout: 120000 });
  await p.waitForTimeout(2000);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p.evaluate(() => { window.__long = []; window.__frames = []; let t = performance.now(); const f = (n) => { window.__frames.push(n - t); t = n; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await cdp.send("Performance.enable");
  const m0 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  // rolagem: 60 passos de 120px, ~16ms entre eventos de roda
  for (let i = 0; i < 70; i++) { await p.mouse.wheel(0, 120); await p.waitForTimeout(40); }
  await p.waitForTimeout(1500);
  for (let i = 0; i < 30; i++) { await p.mouse.wheel(0, -200); await p.waitForTimeout(40); }
  await p.waitForTimeout(1500);
  const m1 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const r = await p.evaluate(() => ({ long: window.__long, frames: window.__frames, cls: window.__cls }));
  const lentos = r.frames.filter((d) => d > 50);
  const d = (k) => Math.round((m1[k] - m0[k]) * (k.endsWith("Duration") ? 1000 : 1));
  console.log("Tarefas longas (>50ms):", r.long.length, "| maiores:", r.long.sort((a, b) => b - a).slice(0, 8).join(","));
  console.log("Quadros:", r.frames.length, "| lentos >50ms:", lentos.length, "| piores:", lentos.sort((a, b) => b - a).slice(0, 8).map(Math.round).join(","));
  console.log("Recalc estilo:", d("RecalcStyleCount"), "x", d("RecalcStyleDuration") + "ms | Layout:", d("LayoutCount"), "x", d("LayoutDuration") + "ms | Script:", d("ScriptDuration") + "ms | Tarefas:", d("TaskDuration") + "ms");
  console.log("CLS total:", r.cls.reduce((s, x) => s + x.v, 0).toFixed(3), "| maiores:", r.cls.sort((a, b) => b.v - a.v).slice(0, 5).map((x) => x.v.toFixed(3) + " " + x.src).join(" | "));
  await b.close();
})();
