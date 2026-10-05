const fs = require("fs");
const cheerio = require("cheerio");

const html = fs.readFileSync("temp_dalmoro.html", "utf8");
const $ = cheerio.load(html);

const nome = $('meta[property="og:title"]').attr("content") || $("h1").first().text().trim();
const image = $('meta[property="og:image"]').attr("content");
const price =
  $('meta[property="product:price:amount"]').attr("content") ||
  $("span.price").text().trim() ||
  $('meta[itemprop="price"]').attr("content");
const sku =
  $('meta[property="product:retailer_item_id"]').attr("content") ||
  $('meta[itemprop="sku"]').attr("content") ||
  $("[data-product-sku]").attr("data-product-sku") ||
  "";
const descricao = $('meta[property="og:description"]').attr("content") || "";

console.log({ nome, image, price, sku, descricao: descricao.substring(0, 50) });
