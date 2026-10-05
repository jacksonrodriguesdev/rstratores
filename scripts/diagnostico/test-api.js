async function main() {
  const data = {
    rows: [
      {
        sku: "7239",
        nome: "ALAVANCA REDUZIDA - FORD 6600",
        preco_brl: 259.99,
        categoria: "Ford",
        marca: "Produto Nacional",
        estoque: 10,
        peso: 1.0,
        url: "https://realtrator.com.br",
        imagem_principal: "https://4362.cdn.simplo7.net/img.jpg",
      },
    ],
  };

  const res = await fetch("http://127.0.0.1:8080/api/admin/products/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  console.log(res.status);
  console.log(await res.text());
}
main();
