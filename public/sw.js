// Service worker do app AGRO PARTS (PWA). Registrado por src/lib/app-pwa.ts.
// - Guarda os arquivos fixos do site (JS/CSS com hash, fontes, ícones) para abrir mais rápido.
// - Páginas sempre vêm da internet (preço e estoque mudam); sem conexão, mostra /offline.html.
// - Admin, API e funções do servidor nunca passam pelo cache.
// - Notificações push: mostra o aviso e abre a página ao tocar (src/lib/push.server.ts envia).
// Mudou este arquivo? Suba a VERSAO para os aparelhos trocarem o cache antigo.
const VERSAO = "v1";
const FIXOS = `agro-fixos-${VERSAO}`;
const PRE = [
  "/offline.html",
  "/logo-96.webp",
  "/icon-192.png",
  "/badge-96.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(FIXOS)
      .then((c) => c.addAll(PRE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("agro-") && k !== FIXOS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const NUNCA = /^\/(admin|api|_serverFn|_server|uploads\/.*\.pdf)/;
const IMUTAVEL = /^\/(assets|fonts)\//;

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || NUNCA.test(url.pathname)) return;

  // Páginas: internet primeiro; sem conexão, a página de offline
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => caches.match("/offline.html").then((r) => r || Response.error())),
    );
    return;
  }

  // Arquivos com hash no nome (nunca mudam) e fontes: do cache, e guarda na primeira vez
  if (IMUTAVEL.test(url.pathname)) {
    e.respondWith(
      caches.open(FIXOS).then((c) =>
        c.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((r) => {
              if (r.ok) c.put(req, r.clone());
              return r;
            }),
        ),
      ),
    );
  }
});

// ---------- Notificações ----------
self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { titulo: "AGRO PARTS", texto: e.data ? e.data.text() : "" };
  }
  const titulo = d.titulo || "AGRO PARTS";
  e.waitUntil(
    self.registration.showNotification(titulo, {
      body: d.texto || "",
      icon: "/icon-192.png",
      badge: "/badge-96.png",
      image: d.imagem || undefined,
      tag: d.tag || undefined,
      renotify: !!d.tag,
      data: { url: d.url || "/", envio: d.envio || null },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const { url = "/", envio = null } = e.notification.data || {};
  const destino = new URL(url, self.location.origin);
  // Origem da visita nas estatísticas do site
  destino.searchParams.set("utm_source", "push");
  destino.searchParams.set("utm_medium", "notificacao");
  if (envio) destino.searchParams.set("utm_campaign", `push-${envio}`);
  e.waitUntil(
    Promise.all([
      envio
        ? fetch("/api/public/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ acao: "clique", envio }),
          }).catch(() => null)
        : null,
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((abas) => {
        const aba = abas.find((a) => new URL(a.url).origin === self.location.origin);
        if (aba && "navigate" in aba) return aba.navigate(destino.href).then((a) => (a || aba).focus());
        return self.clients.openWindow(destino.href);
      }),
    ]),
  );
});
