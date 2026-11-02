export type SessionPayload = {
  id: number;
  nome: string;
  email: string;
  role: string;
  // Versão da sessão (users.sessao_versao) no momento do login
  v?: number;
};
