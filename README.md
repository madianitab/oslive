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
| Partições | Partições Variáveis | `#/particoes/variaveis` | `src/app/features/particoes/variaveis` |
| Paginação | Simulador de Paginação Simples | `#/paginacao/simulador-simples` | `src/app/features/paginacao/simulador-simples` |
| Paginação | Exercícios de Paginação Simples | `#/paginacao/exercicios-simples` | `src/app/features/paginacao/exercicios-simples` |
| Paginação | Simulador de Paginação por Demanda | `#/paginacao/simulador-demanda` | `src/app/features/paginacao/simulador-demanda` |
| Paginação | Exercícios de Paginação por Demanda | `#/paginacao/exercicios` | `src/app/features/paginacao/exercicios` |
| Segmentação | Simulador | `#/segmentacao/simulador` | `src/app/features/segmentacao/simulador` |
| Segmentação | Exercícios | `#/segmentacao/exercicios` | `src/app/features/segmentacao/exercicios` |

Em cada assunto, `models/` e `services/` ficam na raiz da pasta e são compartilhados entre simulador e exercícios.

Aplicação Angular 18, sem backend.

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
