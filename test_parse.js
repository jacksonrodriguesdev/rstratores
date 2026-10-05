const fs = require("fs");
const cheerio = require("cheerio");
const html = fs.readFileSync("temp_acamargo.html", "utf8");
const $ = cheerio.load(html);

console.log("OG IMAGE:", $('meta[property="og:image"]').attr("content"));
console.log("VTEX ZOOM:", $("a.image-zoom").attr("href"));
console.log(
  "IMG:",
  $("img")
    .map((i, el) => $(el).attr("src"))
    .get()
    .filter((s) => s && (s.includes("arquivos") || s.includes("img") || s.includes("jpg"))),
);
