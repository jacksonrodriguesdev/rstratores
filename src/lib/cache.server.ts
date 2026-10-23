// Cache simples em memória (por processo) para dados públicos que mudam pouco: as páginas de
// entrada (/repuestos/..., /repuestos-agricolas/...) não precisam recalcular contagens e listas a
// cada visita. Pedidos iguais ao mesmo tempo esperam o mesmo cálculo.
// Venceu? A visita recebe na hora o valor antigo e o novo é calculado por trás (ninguém, nem o
// robô do Google, espera o recálculo). Sem uso por muito tempo (VIDA_MAX), o valor é descartado.
const VIDA_MAX = 24 * 3600_000;
type Item = { ate: number; usado: number; valor: Promise<unknown>; recalculando?: boolean };
const guardado = new Map<string, Item>();

export function emCache<T>(chave: string, ms: number, calcular: () => Promise<T>): Promise<T> {
  const agora = Date.now();
  const atual = guardado.get(chave);
  if (atual && agora - atual.usado < VIDA_MAX) {
    atual.usado = agora;
    if (atual.ate <= agora && !atual.recalculando) {
      atual.recalculando = true;
      calcular()
        .then((v) =>
          guardado.set(chave, { ate: Date.now() + ms, usado: agora, valor: Promise.resolve(v) }),
        )
        .catch(() => {
          atual.recalculando = false; // tenta de novo na próxima visita; mantém o valor antigo
        });
    }
    return atual.valor as Promise<T>;
  }
  const valor = calcular().catch((e) => {
    guardado.delete(chave); // erro não fica guardado
    throw e;
  });
  guardado.set(chave, { ate: agora + ms, usado: agora, valor });
  // Não deixa o mapa crescer sem limite
  if (guardado.size > 500) {
    for (const [k, v] of guardado) if (agora - v.usado > VIDA_MAX) guardado.delete(k);
  }
  return valor;
}
