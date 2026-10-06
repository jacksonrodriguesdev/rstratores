import { useEffect, useState } from "react";

// Peças vistas pelo cliente neste navegador (só no aparelho dele, sem conta).
const CHAVE = "rs_vistos";
const MAX = 12;

export function lerVistos(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) ?? "[]");
    return Array.isArray(v) ? v.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function registrarVisto(sku: string) {
  try {
    const lista = [sku, ...lerVistos().filter((s) => s !== sku)].slice(0, MAX);
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    /* navegador sem localStorage (modo privado): ignora */
  }
}

// Lê só depois de montar (no servidor não há localStorage)
export function useVistos(): string[] {
  const [vistos, setVistos] = useState<string[]>([]);
  useEffect(() => setVistos(lerVistos()), []);
  return vistos;
}
