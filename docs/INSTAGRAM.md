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

---

# Facebook: página e anúncios (mesma tela, «Conectar Facebook»)

Com o Facebook conectado, o painel:

- **publica também na página** (opção em cada publicação; foto, várias fotos num post, vídeo).
  Atenção: posts feitos pela API do Instagram **não** vão sozinhos para o Facebook (o
  compartilhamento automático só vale para o que é postado pelo app), por isso a opção existe;
- mostra os **números da página** (seguidores, alcance, engajamento, novos seguidores e posts
  recentes) ao lado dos do Instagram (alcance, visitas ao perfil, interações e posts recentes,
  inclusive os feitos pelo app);
- liga a **Central de Anúncios** à conta de anúncios escolhida, sem colar token: gasto,
  campanhas, pausar/ativar e orçamento ficam em Admin → Central de Anúncios.

## Configurar (uma vez)

1. App **agropartsapp** (o principal, não o «IG»): **Login do Facebook para Empresas →
   Configurações** → «URIs de redirecionamento do OAuth válidos»:
   `https://agropartsuy.com/api/admin/facebook/callback`
2. **Configurações do app → Básico**: **ID do app** e **Chave secreta do app** no hPanel como
   `META_APP_ID` e `META_APP_SECRET` (a chave só no hPanel). Reinicie o app.
3. Se o Login para Empresas pedir uma «configuração», crie uma com as permissões
   `pages_show_list, pages_read_engagement, pages_manage_posts, read_insights, ads_read,
   ads_management, business_management` e coloque o ID dela em `META_LOGIN_CONFIG_ID`.
4. Admin → Instagram e Facebook → **Conectar Facebook** → escolha a **página** e a **conta de
   anúncios**.

Tokens criptografados (`fb_*` em configuracoes). O da página não vence; o usado nos anúncios vale
60 dias (o painel avisa para reconectar). Um token colado em Integrações (`mkt_meta_ads_token`)
continua tendo prioridade.

Teste: `scripts/ci/testar-facebook.ts` (API da Meta falsa, no CI).
