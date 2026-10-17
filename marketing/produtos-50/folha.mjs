// Folha de contato das candidatas (para escolher as fotos boas)
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("playwright");
const c = JSON.parse(fs.readFileSync("marketing/produtos-50/candidatas.json", "utf8"));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await p.setContent(`<body style="margin:0;font:11px sans-serif;display:grid;grid-template-columns:repeat(14,1fr);gap:4px;padding:6px">${c
  .map((x, i) => `<div style="border:1px solid #ccc"><img src="${x.img}" style="width:100%;aspect-ratio:1;object-fit:contain;display:block"><b>${i}</b> ${x.es.slice(0, 22)}</div>`)
  .join("")}</body>`, { waitUntil: "networkidle" });
await p.screenshot({ path: process.argv[2], fullPage: true });
await b.close();
