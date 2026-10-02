# Login com Supabase (avaliações)

Só as rotas de avaliação exigem login. Simuladores e exercícios continuam abertos, e a biblioteca do Supabase só é baixada quando uma página protegida é aberta.

| Rota | Quem acessa |
|---|---|
| `#/entrar` | todos (botão "Entrar com Google") |
| `#/avaliacoes` | qualquer usuário logado |
| `#/admin/usuarios` | só a administradora |

**Papéis:** quem entra pelo Google vira **aluno**; a conta `madianitab@gmail.com` vira **admin**; a admin promove alunos a **professor** em `#/admin/usuarios`.

## Configuração (uma vez)

1. **Projeto:** em [supabase.com](https://supabase.com), crie um projeto (região São Paulo).
2. **Banco:** em *SQL Editor*, cole o conteúdo de `supabase/schema.sql` e clique em *Run*. Para usar outro e-mail de admin, troque-o na função `email_admin()` antes de rodar.
3. **Google:**
   - No [Google Cloud Console](https://console.cloud.google.com/), em *APIs e serviços → Credenciais*, crie um *ID do cliente OAuth* do tipo *Aplicativo da Web*.
   - Em *URIs de redirecionamento autorizados*, coloque `https://<id-do-projeto>.supabase.co/auth/v1/callback` (o endereço aparece no Supabase, no passo seguinte).
   - No Supabase, em *Authentication → Sign In / Providers → Google*, ative e cole o *Client ID* e o *Client Secret*.
4. **Endereços permitidos:** em *Authentication → URL Configuration*:
   - *Site URL:* `https://madianitab.github.io/oslive/`
   - *Redirect URLs:* `https://madianitab.github.io/oslive/**` e `http://localhost:4200/**`
5. **Chaves no código:** em *Project Settings → API*, copie a *Project URL* e a chave *publishable* (ou *anon*) para `src/app/core/auth/supabase.config.ts`. Faça commit e push.
   - Essas duas podem ficar no repositório público.
   - **Nunca** coloque a chave *secret* / *service_role* no código.
6. **Teste:** abra `#/avaliacoes`, entre com sua conta (deve aparecer o papel **admin**) e depois com outra conta (deve aparecer **aluno**). Promova a segunda em *Gerenciar usuários*.

## Segurança

As regras ficam no banco (RLS), não no navegador:

- cada usuário lê só o próprio perfil; professor e admin leem todos;
- ninguém altera a tabela `perfis` diretamente;
- só a admin muda papéis, pela função `definir_papel` (aluno ↔ professor; a admin não pode ser rebaixada).

## Plano gratuito

Projetos sem uso por 7 dias são pausados. Os dados não se perdem: reative em *Dashboard → Restore project*. Durante a pausa, o login falha, mas o resto do OSLive funciona.
