# Login com Supabase (avaliações e sugestões)

Só as rotas de avaliação e de sugestão exigem login. Simuladores e exercícios continuam abertos, e a biblioteca do Supabase só é baixada quando uma página protegida é aberta.

| Rota | Quem acessa |
|---|---|
| `#/entrar` | todos (botão "Entrar com Google") |
| `#/avaliacoes` | qualquer usuário logado (o aluno vê as turmas em que o e-mail dele está) |
| `#/admin/turmas` | professor e admin (cria turmas e inclui alunos pelo e-mail) |
| `#/admin/avaliacoes` | professor e admin (cria, gera e libera provas) |
| `#/avaliacoes/:id` | aluno da turma da prova (faz a prova) |
| `#/admin/avaliacoes/:id/resultados` | professor e admin (notas, prova de cada aluno, CSV, liberar notas e correção) |
| `#/avaliacoes/:id/correcao` | aluno que enviou a prova, quando a correção está liberada (vê a própria prova corrigida) |
| `#/sugestao` | qualquer usuário logado (envia sugestão, erro ou dúvida) |
| `#/admin/usuarios` | só a administradora |
| `#/admin/sugestoes` | só a administradora |

**Papéis:** quem entra pelo Google vira **aluno**; a conta `madianitab@gmail.com` vira **admin**; a admin promove alunos a **professor** em `#/admin/usuarios`.

## Configuração (uma vez)

1. **Projeto:** em [supabase.com](https://supabase.com), crie um projeto (região São Paulo).
2. **Banco:** em *SQL Editor*, cole o conteúdo de `supabase/schema.sql` e clique em *Run*. Para usar outro e-mail de admin, troque-o na função `email_admin()` antes de rodar. O script é idempotente: rode de novo sempre que ele mudar (ex.: a tabela `sugestoes`).
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
7. **Turmas:** depois de rodar o `schema.sql` atualizado, abra *Turmas* no menu da conta, crie uma turma e cole os e-mails. Entre com uma conta da lista (deve aparecer o nome da turma) e com uma fora dela (deve aparecer "Você não está em nenhuma turma").

8. **Função das provas (uma vez):**
   - No Supabase, em *Account → Access Tokens*, gere um token do tipo **Project**, só para o projeto `oslive`, com **Edge Functions: Read-write** e **Project Settings: Read** (todo o resto em *None*). Dê uma validade (ex.: 1 ano).
   - No GitHub, em *Settings → Secrets and variables → Actions*, crie os secrets `SUPABASE_ACCESS_TOKEN` (o token) e `SUPABASE_PROJECT_REF` (o ID do projeto, o trecho antes de `.supabase.co`).
   - O workflow *Publicar função das avaliações no Supabase* roda a cada merge que muda as questões ou os geradores; também dá para rodar à mão em *Actions → Run workflow*. Quando o token vencer, gere outro e atualize o secret.

## Segurança

As regras ficam no banco (RLS), não no navegador:

- cada usuário lê só o próprio perfil; professor e admin leem todos;
- ninguém altera a tabela `perfis` diretamente;
- só a admin muda papéis, pela função `definir_papel` (aluno ↔ professor; a admin não pode ser rebaixada);
- provas: as tabelas `avaliacoes`, `tentativas` e `senha_falhas` não têm acesso direto. A professora usa `salvar_avaliacao`, `listar_avaliacoes` e `excluir_avaliacao`; o aluno, `minhas_avaliacoes`. Começar, salvar e enviar passam pela função `avaliacao`, que chama funções que só o `service_role` executa (`iniciar_tentativa`, `salvar_respostas`, `tentativa_para_correcao`, `finalizar_tentativa`). O banco confere turma, horário, senha (guardada com bcrypt; 5 erros bloqueiam por 10 minutos), uma tentativa por aluno e o prazo (1 minuto de tolerância). A semente de cada aluno nunca sai do servidor. Depois que alguém começa, as questões, o valor e a turma não mudam. O IP de início e de envio fica registrado;
- resultados: `resultados_avaliacao` (todos os alunos da turma, com nota, horários e IPs), `tentativa_detalhe` (inclui a semente, para o navegador da professora gerar as mesmas questões e mostrar a correção), `encerrar_por_tempo` (só depois do prazo + 1 minuto, nota entre 0 e o valor da prova) e `liberar_nova_tentativa` (apaga a tentativa; bloqueada com a correção liberada). Todas conferem se quem chama gerencia a turma;
- notas e correção para o aluno: `liberar_resultados` liga ou desliga `notas_liberadas` e `correcao_liberada` da prova, só depois do fechamento + 1 minuto e só para quem gerencia a turma. `minhas_avaliacoes` mostra a nota só com as notas liberadas; `minha_correcao` devolve ao aluno a própria prova (semente, respostas e campos certos) só com a correção liberada, e a nota e os pontos por questão só com as notas liberadas. Enquanto algo estiver liberado, a prova não pode ser reaberta (fechamento no futuro), e com a correção liberada não há nova tentativa nem início de prova;
- turmas: ninguém altera `turmas` e `turma_alunos` diretamente; só pelas funções `criar_turma`, `renomear_turma`, `excluir_turma`, `matricular` e `desmatricular`, que conferem o papel. O professor gerencia só as turmas dele; a admin, todas. O aluno lê só as turmas e a matrícula do próprio e-mail.

## Plano gratuito

Projetos sem uso por 7 dias são pausados. Os dados não se perdem: reative em *Dashboard → Restore project*. Durante a pausa, o login falha, mas o resto do OSLive funciona.

Se o servidor de login não responder em 8 segundos, a página `#/entrar` mostra o aviso "O servidor de login não respondeu…" junto com o botão **Entrar com Google** (ela não fica mais parada em "Verificando acesso…"). Depois de reativar o projeto, basta clicar de novo.
