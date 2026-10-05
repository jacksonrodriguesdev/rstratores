export type SessionPayload = {
  id: number;
  nome: string;
  email: string;
  role: string;
};

// Simple client-side auth for admin access.
// NOTE: This is not a real security boundary — it just gates the admin UI.
// Data protection lives in Supabase RLS policies.

const KEY = "rs-trator-auth";

// Multiple admin credentials (client-side gate only — real security lives in RLS).
const ADMINS: Array<{ email: string; password: string }> = [
  { email: "jacksonrodriguesdev@gmail.com", password: "Firma@123" },
  { email: "jacksvp20132014@gmail.com", password: "Firma@123" },
];

export function login(email: string, password: string): boolean {
  const e = email.trim().toLowerCase();
  const ok = ADMINS.some((a) => a.email.toLowerCase() === e && a.password === password);
  if (ok) {
    if (typeof window !== "undefined") localStorage.setItem(KEY, "1");
    return true;
  }
  return false;
}

export function logout() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}
