# OSLive

> Para alterar o projeto, leia também o [Guia de desenvolvimento](GUIA_DESENVOLVIMENTO.md): padrões, design system, convenções conceituais e fluxo de entrega.

Simulador didático de Sistemas Operacionais.

| Assunto | Modo | Rota | Pasta |
|---|---|---|---|
| Processos | Estados do Processo | `#/processos/estados` | `src/app/features/processos/estados` |
| Processos | Árvore de Processos | `#/processos/arvore` | `src/app/features/processos/arvore` |
| Escalonamento de Processos | Simulador | `#/escalonamento/simulador` | `src/app/features/escalonamento/simulador` |
| Escalonamento de Processos | Exercícios | `#/escalonamento/exercicios` | `src/app/features/escalonamento/exercicios` |
| Partições | Partições Fixas | `#/particoes/fixas` | `src/app/features/particoes/fixas` |
| Partições | Exercícios de Partições Fixas | `#/particoes/exercicios-fixas` | `src/app/features/particoes/exercicios-fixas` |
| Partições | Partições Variáveis | `#/particoes/variaveis` | `src/app/features/particoes/variaveis` |
| Partições | Exercícios de Partições Variáveis (alocação, tabela de lacunas, compactação) | `#/particoes/exercicios-variaveis` | `src/app/features/particoes/exercicios-variaveis` |
| Paginação | Simulador de Paginação Simples | `#/paginacao/simulador-simples` | `src/app/features/paginacao/simulador-simples` |
| Paginação | Exercícios de Paginação Simples | `#/paginacao/exercicios-simples` | `src/app/features/paginacao/exercicios-simples` |
| Paginação | Simulador de Paginação por Demanda | `#/paginacao/simulador-demanda` | `src/app/features/paginacao/simulador-demanda` |
| Paginação | Exercícios de Paginação por Demanda (inclui Segunda Chance e Segunda Chance Melhorada em sequência) | `#/paginacao/exercicios` | `src/app/features/paginacao/exercicios` |
| Segmentação | Simulador | `#/segmentacao/simulador` | `src/app/features/segmentacao/simulador` |
| Segmentação | Exercícios | `#/segmentacao/exercicios` | `src/app/features/segmentacao/exercicios` |
| Avaliações | Área do aluno (login) | `#/avaliacoes` | `src/app/features/avaliacoes` |
| Avaliações | Turmas e matrícula por e-mail (professor e admin) | `#/admin/turmas` | `src/app/pages/admin-turmas` |
| Sugestões | Enviar sugestão (login) — botão flutuante em todas as páginas | `#/sugestao` | `src/app/pages/sugestao` |
| Administração | Usuários (só admin) | `#/admin/usuarios` | `src/app/pages/admin-usuarios` |
| Administração | Sugestões recebidas (só admin) | `#/admin/sugestoes` | `src/app/pages/admin-sugestoes` |

Em cada assunto, `models/` e `services/` ficam na raiz da pasta e são compartilhados entre simulador e exercícios.

Aplicação Angular 18. Simuladores e exercícios rodam sem backend; as avaliações e o envio de sugestões usam login com Google via Supabase (botão **Entrar** na barra superior) (veja [docs/login-supabase.md](docs/login-supabase.md)).

## Executar localmente

Requer Node.js 18.19+ (recomendado 20).

```bash
npm install
npm start
# acesse http://localhost:4200
```

## Build

```bash
npm run build
# saída em dist/oslive-ex-paginacao-por-demanda
```

## Publicação

O deploy no GitHub Pages é automático a cada push na branch `main`
(workflow em `.github/workflows/deploy.yml`).
Em *Settings → Pages*, a opção *Source* deve estar em **GitHub Actions**.
