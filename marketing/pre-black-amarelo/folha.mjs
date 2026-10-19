// Folha de contato das candidatas sobre o amarelo (a foto branca "some" com multiply)
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const c = JSON.parse(fs.readFileSync("marketing/pre-black-amarelo/candidatas.json", "utf8"));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await p.setContent(`<body style="margin:0;font:11px sans-serif;display:grid;grid-template-columns:repeat(16,1fr);gap:4px;padding:6px;background:#111">${c
  .map((x, i) => `<div style="background:#f5c518"><img src="${x.img}" style="width:100%;aspect-ratio:1;object-fit:contain;display:block;mix-blend-mode:multiply"><div style="background:#fff;padding:2px"><b>${i}</b> ${x.es.slice(0, 20)}</div></div>`)
  .join("")}</body>`, { waitUntil: "networkidle" });
await p.screenshot({ path: process.argv[2], fullPage: true });
await b.close();
