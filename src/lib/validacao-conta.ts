// Regras de cadastro usadas no navegador (avisos na hora) e no servidor (validação final).

export const DEPARTAMENTOS_UY = [
  "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja", "Maldonado",
  "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres",
];

// Celular uruguaio: 09X XXX XXX (local) ou +598 9X XXX XXX. Devolve "+5989XXXXXXX" ou null.
export function normalizarCelularUY(entrada: string): string | null {
  let d = (entrada || "").replace(/\D/g, "");
  if (d.startsWith("598")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return /^9\d{7}$/.test(d) ? `+598${d}` : null;
}

// Máscara enquanto digita: "9X XXX XXX"
export function mascararCelularUY(entrada: string): string {
  let d = (entrada || "").replace(/\D/g, "");
  if (d.startsWith("598")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  d = d.slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8)].filter(Boolean).join(" ");
}

export const formatarCelularUY = (e164: string | null | undefined) => {
  const n = normalizarCelularUY(e164 || "");
  return n ? `+598 ${n.slice(4, 6)} ${n.slice(6, 9)} ${n.slice(9)}` : e164 || "";
};

export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((e || "").trim());

// Força da senha (0 a 4) e a primeira regra que falta
export function avaliarSenha(s: string) {
  const regras = [
    { ok: s.length >= 8, texto: "Al menos 8 caracteres" },
    { ok: /[a-zA-Z]/.test(s) && /\d/.test(s), texto: "Letras y números" },
    { ok: /[A-Z]/.test(s) && /[a-z]/.test(s), texto: "Mayúsculas y minúsculas" },
    { ok: /[^a-zA-Z0-9]/.test(s) || s.length >= 12, texto: "Un símbolo o 12+ caracteres" },
  ];
  return { nivel: regras.filter((r) => r.ok).length, regras, valida: regras[0].ok && regras[1].ok };
}
