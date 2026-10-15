// Cache simples em memória (por processo) para dados públicos que mudam pouco: as páginas de
// entrada (/repuestos/..., /repuestos-agricolas/...) não precisam recalcular contagens e listas a
// cada visita. Pedidos iguais ao mesmo tempo esperam o mesmo cálculo. Some sozinho após `ms`.
const guardado = new Map<string, { ate: number; valor: Promise<unknown> }>();

export function emCache<T>(chave: string, ms: number, calcular: () => Promise<T>): Promise<T> {
  const agora = Date.now();
  const atual = guardado.get(chave);
  if (atual && atual.ate > agora) return atual.valor as Promise<T>;
  const valor = calcular().catch((e) => {
    guardado.delete(chave); // erro não fica guardado
    throw e;
  });
  guardado.set(chave, { ate: agora + ms, valor });
  // Não deixa o mapa crescer sem limite
  if (guardado.size > 500) {
    for (const [k, v] of guardado) if (v.ate <= agora) guardado.delete(k);
  }
  return valor;
}
