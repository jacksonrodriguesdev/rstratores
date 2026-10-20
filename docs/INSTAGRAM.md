# Instagram pelo painel (Admin → Instagram)

Publica **post, carrossel (2–10), story e Reels** no Instagram da loja, na hora ou **agendado**
(o agendador do site confere a cada 10 min), com **primeiro comentário** (bom para hashtags) e
**números** de cada post (curtidas, comentários, alcance, salvos, compartilhamentos; a cada 6 h ou
pelo botão «Atualizar números»). Usa a API oficial da Meta («Instagram API com login do Instagram»).

## Configurar (uma vez)

1. **Conta profissional**: app do Instagram → Configurações → Tipo de conta → mudar para
   **Empresa** (conta pessoal não funciona na API).
2. **developers.facebook.com** → entre com sua conta → **Criar app** → caso de uso
   **«Gerenciar mensagens e conteúdo no Instagram»**.
3. No app: **Instagram → Configuração da API com login do Instagram** → «Configurar login comercial
   do Instagram» → URL de redirecionamento:
   `https://agropartsuy.com/api/admin/instagram/callback`
4. Na mesma tela, «Gerar tokens de acesso» → **adicione a conta @rsagroparts** (testador do
   Instagram) e aceite o convite no app do Instagram (Configurações → Apps e sites). Assim o app
   funciona para a sua conta sem passar pela análise da Meta.
5. Copie o **ID do app do Instagram** e a **Chave secreta do app do Instagram** para o hPanel da
   Hostinger: `INSTAGRAM_APP_ID` e `INSTAGRAM_APP_SECRET`. A chave secreta fica **só no hPanel**.
6. Reinicie o app na Hostinger → Admin → Instagram → **Conectar Instagram** (você entra com o
   Instagram na tela da Meta; o site nunca vê a senha).

A autorização vale 60 dias e é **renovada sozinha**; fica criptografada (AES-256-GCM, chave
derivada do `JWT_SECRET`) na tabela `configuracoes` (`ig_*`).

## Regras da Meta

- Imagem: **JPG** (o painel converte PNG/WEBP sozinho). Feed: de 4:5 (em pé) a 1,91:1. Os cards
  1080×1350 servem. Story/Reels: em pé (9:16). Vídeo: MP4/MOV até 100 MB (limite do painel).
- Legenda até 2.200 caracteres e 30 hashtags.
- Pela API não dá para pôr **música**, **adesivo de link**, enquete ou marcar produtos: isso só
  pelo app.
- Há um limite de publicações pela API a cada 24 h (o painel mostra o uso).

## Como funciona

A Meta baixa a mídia de `https://agropartsuy.com/uploads/instagram/...` (enviada pelo painel), cria
o contêiner, espera o vídeo processar e publica. Erro → a publicação fica em «Com erro» com o
motivo e o botão «Tentar de novo».

Teste: `scripts/ci/testar-instagram.ts` (API da Meta falsa, no CI).
