# Redesign da Experiência — Paginação por Demanda (piloto) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a simulação de Paginação por Demanda numa experiência "Assistir + Praticar": o aluno assiste o SO executar a paginação passo a passo (com narração ancorada e diário), depois refaz o mesmo cenário como exercício.

**Architecture:** Instrumentar o motor existente para emitir uma **trilha de passos** (`PassoPaginacao[]`) sem alterar a lógica dos algoritmos. A trilha alimenta um player (Assistir) e o modo exercício (Praticar). UI reaproveita a casca `os-sim-shell` e adiciona componentes `os-sim-*` genéricos (candidatos a DS).

**Tech Stack:** Angular (standalone components, signals), TypeScript, Karma/Jasmine (`ng test`). Componentes DS em `src/app/ui` com prefixo `os-`.

## Global Constraints

- Componentes reutilizáveis novos vão em `src/app/ui` como `os-*` (convenção do projeto).
- Não commitar sem permissão explícita do usuário; não adicionar trailer `Co-Authored-By`.
- Reaproveitar o motor: NÃO reescrever a lógica de escolha de vítima dos models (`FCFS`, `SegundaChance`, `HistoricoBitReferencia`). Apenas instrumentar/ler.
- `TAM = 8` (quadros da memória física), `STR_MEMORIA_VAZIA = ' '`, `TIMESTAMP_INICIAL = 100` — valores de `src/app/core/constantes.ts`.
- Runner de teste: `ng test --watch=false --browsers=ChromeHeadless` (um spec por vez: `--include`).
- Piloto: apenas o fluxo de substituição/página-vítima com **FCFS**. Segunda-chance e histórico-de-bits ficam para depois (a trilha deve ser projetada genérica, mas só FCFS é exigido neste plano).

---

## File Structure

- `src/app/features/paginacao/models/passo-paginacao.ts` — **novo.** Interface `PassoPaginacao` (o modelo de um passo da trilha).
- `src/app/features/paginacao/services/trilha-paginacao.service.ts` — **novo.** Constrói a trilha a partir de processos + algoritmo, instrumentando `FCFS`.
- `src/app/features/paginacao/services/narrativa-paginacao.ts` — **novo.** Função pura que gera o texto PT-BR de um passo.
- `src/app/ui/sim-player/sim-player.component.ts` — **novo.** Barra de controles (play/pausa/passo±/velocidade/scrubber). Genérico.
- `src/app/ui/sim-log/sim-log.component.ts` — **novo.** Painel "Diário" rolável com destaque do passo atual. Genérico.
- `src/app/ui/sim-callout/sim-callout.component.ts` — **novo.** Balão de narração ancorado com seta. Genérico.
- `src/app/ui/index.ts` — **modificar.** Exportar os três componentes novos.
- `src/app/features/paginacao/components/palco-paginacao/palco-paginacao.component.ts` — **novo.** Palco dirigido pela trilha (memória física + disco + balão).
- `src/app/features/paginacao/components/home-paginacao/home-paginacao-por-demanda-exercicios.component.ts` + `.html` — **modificar.** Container: detém cenário, trilha, índice, modo; orquestra Assistir/Praticar.

---

## Task 1: Modelo `PassoPaginacao`

**Files:**
- Create: `src/app/features/paginacao/models/passo-paginacao.ts`

**Interfaces:**
- Produces: `interface PassoPaginacao` e `type TipoPasso = 'hit' | 'fault'`, importável pelos demais.

- [ ] **Step 1: Criar a interface**

```typescript
// src/app/features/paginacao/models/passo-paginacao.ts
import { Pagina } from './pagina';
import { MemoriaFisica } from './memoria-fisica';

export type TipoPasso = 'hit' | 'fault';

export interface PassoPaginacao {
  /** posição na trilha, 0..M-1 */
  indice: number;
  /** página que o processo referenciou neste passo */
  paginaReferenciada: Pagina;
  /** hit = já estava na RAM; fault = precisou carregar do disco */
  tipo: TipoPasso;
  /** quadro onde a página entrou (fault) ou onde já estava (hit) */
  quadroDestino: number;
  /** página removida, quando houve substituição (RAM cheia) */
  vitima?: Pagina;
  /** quadro de onde a vítima saiu */
  quadroVitima?: number;
  /** snapshot IMUTÁVEL da memória física APÓS aplicar este passo */
  memoriaFisica: MemoriaFisica[];
  /** texto legível em PT-BR descrevendo o passo */
  narrativa: string;
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: sem erros.

- [ ] **Step 3: Commit** (só após permissão do usuário — ver Global Constraints; agrupar commits ao fim de cada task quando autorizado)

```bash
git add src/app/features/paginacao/models/passo-paginacao.ts
git commit -m "feat(paginacao): modelo PassoPaginacao para trilha de passos"
```

---

## Task 2: Geração de narrativa (função pura)

**Files:**
- Create: `src/app/features/paginacao/services/narrativa-paginacao.ts`
- Test: `src/app/features/paginacao/services/narrativa-paginacao.spec.ts`

**Interfaces:**
- Consumes: `PassoPaginacao` (Task 1).
- Produces: `export function narrarPasso(passo: Omit<PassoPaginacao,'narrativa'|'indice'|'memoriaFisica'>): string`. Recebe os dados de decisão de um passo e devolve o texto. (Separada para ser testável isoladamente e reutilizada pelo builder.)

- [ ] **Step 1: Escrever o teste que falha**

```typescript
// src/app/features/paginacao/services/narrativa-paginacao.spec.ts
import { narrarPasso } from './narrativa-paginacao';
import { Pagina } from '../models/pagina';

describe('narrarPasso', () => {
  it('descreve um hit', () => {
    const pag = new Pagina('B', '#000', 2);
    const txt = narrarPasso({ paginaReferenciada: pag, tipo: 'hit', quadroDestino: 1 });
    expect(txt).toContain('B2');
    expect(txt.toLowerCase()).toContain('já está');
  });

  it('descreve um fault sem vítima (havia quadro livre)', () => {
    const pag = new Pagina('A', '#000', 0);
    const txt = narrarPasso({ paginaReferenciada: pag, tipo: 'fault', quadroDestino: 3 });
    expect(txt.toLowerCase()).toContain('falta de página');
    expect(txt).toContain('A0');
    expect(txt).toContain('quadro 3');
  });

  it('descreve um fault com substituição (vítima)', () => {
    const pag = new Pagina('C', '#000', 1);
    const vit = new Pagina('A', '#000', 0);
    const txt = narrarPasso({ paginaReferenciada: pag, tipo: 'fault', quadroDestino: 2, vitima: vit, quadroVitima: 2 });
    expect(txt.toLowerCase()).toContain('falta de página');
    expect(txt).toContain('C1');
    expect(txt).toContain('A0');
    expect(txt.toLowerCase()).toContain('remove');
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/narrativa-paginacao.spec.ts'`
Expected: FAIL — `narrarPasso` não existe / módulo não encontrado.

- [ ] **Step 3: Implementar**

```typescript
// src/app/features/paginacao/services/narrativa-paginacao.ts
import { PassoPaginacao } from '../models/passo-paginacao';

type DadosNarrativa = Pick<PassoPaginacao, 'paginaReferenciada' | 'tipo' | 'quadroDestino'> &
  Partial<Pick<PassoPaginacao, 'vitima' | 'quadroVitima'>>;

export function narrarPasso(passo: DadosNarrativa): string {
  const pag = passo.paginaReferenciada.toString();
  if (passo.tipo === 'hit') {
    return `Acesso a ${pag}: a página já está na memória física (quadro ${passo.quadroDestino}). Nenhuma substituição.`;
  }
  if (passo.vitima) {
    return `Falta de página em ${pag}: memória cheia → remove ${passo.vitima.toString()} (mais antiga, FIFO) do quadro ${passo.quadroVitima} e carrega ${pag} no quadro ${passo.quadroDestino}.`;
  }
  return `Falta de página em ${pag}: carrega do disco para o quadro ${passo.quadroDestino} (havia quadro livre).`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/narrativa-paginacao.spec.ts'`
Expected: PASS (3 specs).

- [ ] **Step 5: Commit** (após permissão)

```bash
git add src/app/features/paginacao/services/narrativa-paginacao.*
git commit -m "feat(paginacao): geração de narrativa PT-BR por passo"
```

---

## Task 3: Construtor da trilha (instrumenta FCFS)

**Files:**
- Create: `src/app/features/paginacao/services/trilha-paginacao.service.ts`
- Test: `src/app/features/paginacao/services/trilha-paginacao.service.spec.ts`

**Interfaces:**
- Consumes: `PassoPaginacao` (Task 1), `narrarPasso` (Task 2), `FCFS`, `MemoriaFisica`, `Pagina`, `TAM`, `STR_MEMORIA_VAZIA`, `TIMESTAMP_INICIAL`.
- Produces: `class TrilhaPaginacaoService { construir(filaDePaginas: Pagina[]): PassoPaginacao[] }`. Recebe a **sequência de referências** (as páginas na ordem em que serão acessadas) e devolve a trilha completa. Não embaralha nem gera processos — isso fica no container, que passa a fila pronta.

**Nota de instrumentação:** `FCFS.addPaginaEmMemoriaFisica` já retorna o índice do quadro. Detecção sem alterar o model:
- **hit:** a página referenciada já está na RAM → `filaDePaginas[k].indiceMemoriaFisica !== -1` antes de inserir. Nesse caso NÃO chamar `add`, só registrar hit no quadro atual.
- **fault com quadro livre:** havia posição vazia (`fcfs.primeiraPosicaoDisponivel(mem) !== -1`) antes do `add`.
- **fault com substituição:** não havia posição livre → a vítima é `fcfs.lista[0]` **lida ANTES** de chamar `add` (o model faz `shift()` de `lista[0]`). Capturar `const vitima = fcfs.lista[0]` e `const quadroVitima = vitima.indiceMemoriaFisica` antes do `add`.

- [ ] **Step 1: Escrever o teste que falha**

```typescript
// src/app/features/paginacao/services/trilha-paginacao.service.spec.ts
import { TrilhaPaginacaoService } from './trilha-paginacao.service';
import { Pagina } from '../models/pagina';

/** helper: cria N páginas distintas do processo 'A' (A0, A1, ...) */
function paginasA(n: number): Pagina[] {
  return Array.from({ length: n }, (_, i) => new Pagina('A', '#111', i));
}

describe('TrilhaPaginacaoService', () => {
  let svc: TrilhaPaginacaoService;
  beforeEach(() => (svc = new TrilhaPaginacaoService()));

  it('gera um passo por referência', () => {
    const fila = paginasA(3);
    const trilha = svc.construir(fila);
    expect(trilha.length).toBe(3);
    expect(trilha.map(p => p.indice)).toEqual([0, 1, 2]);
  });

  it('primeiras 8 referências únicas são faults sem vítima (RAM 8 quadros)', () => {
    const fila = paginasA(8);
    const trilha = svc.construir(fila);
    expect(trilha.every(p => p.tipo === 'fault')).toBeTrue();
    expect(trilha.every(p => p.vitima === undefined)).toBeTrue();
  });

  it('a 9ª referência única causa substituição (FIFO remove a 1ª)', () => {
    const fila = paginasA(9);
    const trilha = svc.construir(fila);
    const p9 = trilha[8];
    expect(p9.tipo).toBe('fault');
    expect(p9.vitima).toBeDefined();
    expect(p9.vitima!.toString()).toBe('A0'); // primeira a entrar
  });

  it('reacessar página presente é hit', () => {
    const a0 = new Pagina('A', '#111', 0);
    const fila = [a0, a0]; // acessa A0 duas vezes
    const trilha = svc.construir(fila);
    expect(trilha[0].tipo).toBe('fault');
    expect(trilha[1].tipo).toBe('hit');
  });

  it('cada passo carrega snapshot imutável da memória física', () => {
    const fila = paginasA(2);
    const trilha = svc.construir(fila);
    // mutar o snapshot do passo 0 não afeta o passo 1
    trilha[0].memoriaFisica[0].nome = 'XX';
    expect(trilha[1].memoriaFisica[0].nome).not.toBe('XX');
  });

  it('preenche narrativa em todo passo', () => {
    const trilha = svc.construir(paginasA(9));
    expect(trilha.every(p => p.narrativa.length > 0)).toBeTrue();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/trilha-paginacao.service.spec.ts'`
Expected: FAIL — classe não existe.

- [ ] **Step 3: Implementar**

```typescript
// src/app/features/paginacao/services/trilha-paginacao.service.ts
import { Injectable } from '@angular/core';
import { Pagina } from '../models/pagina';
import { MemoriaFisica } from '../models/memoria-fisica';
import { FCFS } from '../models/fcfs';
import { PassoPaginacao } from '../models/passo-paginacao';
import { narrarPasso } from './narrativa-paginacao';
import { TAM, STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR, TIMESTAMP_INICIAL } from 'src/app/core/constantes';

@Injectable({ providedIn: 'root' })
export class TrilhaPaginacaoService {
  /** clona o array de MemoriaFisica para um snapshot imutável do passo */
  private snapshot(mem: MemoriaFisica[]): MemoriaFisica[] {
    return mem.map(m => new MemoriaFisica(m.endereco, m.nome, m.cor, m.horaCarga));
  }

  construir(filaDePaginas: Pagina[]): PassoPaginacao[] {
    const fcfs = new FCFS();
    const mem: MemoriaFisica[] = [];
    for (let i = 0; i < TAM; i++) {
      mem.push(new MemoriaFisica(i, STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR, 0));
    }

    const trilha: PassoPaginacao[] = [];
    let ts = TIMESTAMP_INICIAL;

    filaDePaginas.forEach((pagina, indice) => {
      let tipo: PassoPaginacao['tipo'];
      let quadroDestino: number;
      let vitima: Pagina | undefined;
      let quadroVitima: number | undefined;

      if (pagina.indiceMemoriaFisica !== -1) {
        // já está na RAM → hit, sem alterar memória
        tipo = 'hit';
        quadroDestino = pagina.indiceMemoriaFisica;
      } else {
        tipo = 'fault';
        const tinhaLivre = fcfs.primeiraPosicaoDisponivel(mem) !== -1;
        if (!tinhaLivre) {
          // captura a vítima ANTES do add (o model dá shift em lista[0])
          vitima = fcfs.lista[0];
          quadroVitima = vitima.indiceMemoriaFisica;
        }
        quadroDestino = fcfs.addPaginaEmMemoriaFisica(mem, pagina, ts);
        ts += 1;
      }

      const narrativa = narrarPasso({ paginaReferenciada: pagina, tipo, quadroDestino, vitima, quadroVitima });
      trilha.push({
        indice, paginaReferenciada: pagina, tipo, quadroDestino,
        vitima, quadroVitima, memoriaFisica: this.snapshot(mem), narrativa,
      });
    });

    return trilha;
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/trilha-paginacao.service.spec.ts'`
Expected: PASS (6 specs).

- [ ] **Step 5: Commit** (após permissão)

```bash
git add src/app/features/paginacao/services/trilha-paginacao.service.*
git commit -m "feat(paginacao): construtor da trilha de passos instrumentando FCFS"
```

---

## Task 4: `os-sim-player` (barra de controles)

**Files:**
- Create: `src/app/ui/sim-player/sim-player.component.ts`, `.css`
- Test: `src/app/ui/sim-player/sim-player.component.spec.ts`
- Modify: `src/app/ui/index.ts`

**Interfaces:**
- Produces: `OsSimPlayerComponent`, selector `os-sim-player`.
  - `@Input() total = 0;` `@Input() atual = 0;` `@Input() tocando = false;` `@Input() velocidade = 1;`
  - `@Output() play`, `@Output() pause`, `@Output() passo` (`EventEmitter<1 | -1>`), `@Output() seek` (`EventEmitter<number>`), `@Output() velocidadeChange` (`EventEmitter<number>`).
  - Genérico: não conhece paginação.

- [ ] **Step 1: Escrever o teste que falha**

```typescript
// src/app/ui/sim-player/sim-player.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { OsSimPlayerComponent } from './sim-player.component';

describe('OsSimPlayerComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [OsSimPlayerComponent] }));

  it('emite passo(+1) ao avançar', () => {
    const f = TestBed.createComponent(OsSimPlayerComponent);
    f.componentInstance.total = 5; f.componentInstance.atual = 1;
    let got = 0; f.componentInstance.passo.subscribe(d => (got = d));
    f.componentInstance.avancar();
    expect(got).toBe(1);
  });

  it('emite play quando pausado e pause quando tocando', () => {
    const f = TestBed.createComponent(OsSimPlayerComponent);
    const eventos: string[] = [];
    f.componentInstance.play.subscribe(() => eventos.push('play'));
    f.componentInstance.pause.subscribe(() => eventos.push('pause'));
    f.componentInstance.tocando = false; f.componentInstance.alternarPlay();
    f.componentInstance.tocando = true; f.componentInstance.alternarPlay();
    expect(eventos).toEqual(['play', 'pause']);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/sim-player.component.spec.ts'`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar**

```typescript
// src/app/ui/sim-player/sim-player.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'os-sim-player',
  standalone: true,
  imports: [NgIf],
  styleUrls: ['./sim-player.component.css'],
  template: `
    <div class="os-player">
      <button type="button" class="btn" (click)="passo.emit(-1)" [disabled]="atual <= 0" aria-label="Passo anterior">◀◀</button>
      <button type="button" class="btn primary" (click)="alternarPlay()" [attr.aria-label]="tocando ? 'Pausar' : 'Reproduzir'">{{ tocando ? '❚❚' : '▶' }}</button>
      <button type="button" class="btn" (click)="passo.emit(1)" [disabled]="atual >= total - 1" aria-label="Próximo passo">▶▶</button>
      <input class="scrub" type="range" min="0" [max]="total - 1" [value]="atual"
             (input)="seek.emit(+$any($event.target).value)" aria-label="Posição na simulação" />
      <span class="pos">{{ atual + 1 }} / {{ total }}</span>
      <select class="vel" [value]="velocidade" (change)="velocidadeChange.emit(+$any($event.target).value)" aria-label="Velocidade">
        <option [value]="0.5">0.5×</option><option [value]="1">1×</option><option [value]="2">2×</option>
      </select>
    </div>
  `,
})
export class OsSimPlayerComponent {
  @Input() total = 0;
  @Input() atual = 0;
  @Input() tocando = false;
  @Input() velocidade = 1;

  @Output() play = new EventEmitter<void>();
  @Output() pause = new EventEmitter<void>();
  @Output() passo = new EventEmitter<1 | -1>();
  @Output() seek = new EventEmitter<number>();
  @Output() velocidadeChange = new EventEmitter<number>();

  alternarPlay(): void {
    this.tocando ? this.pause.emit() : this.play.emit();
  }
  avancar(): void {
    this.passo.emit(1);
  }
}
```

```css
/* src/app/ui/sim-player/sim-player.component.css */
:host { display: block; }
.os-player { display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md); }
.btn { border: 1px solid var(--line); background: #fff; border-radius: 6px; padding: 6px 10px;
  font: 600 12px/1 var(--f-mono); cursor: pointer; color: var(--text); }
.btn.primary { background: var(--a); color: #fff; border-color: var(--a); }
.btn:disabled { opacity: .4; cursor: default; }
.scrub { flex: 1; accent-color: var(--a); }
.pos { font: 500 12px/1 var(--f-mono); color: var(--text-2); white-space: nowrap; }
.vel { font: 500 12px/1 var(--f-mono); border: 1px solid var(--line); border-radius: 6px; padding: 5px; }
```

- [ ] **Step 4: Exportar no index e rodar**

Adicionar em `src/app/ui/index.ts`:
```typescript
export * from './sim-player/sim-player.component';
```
Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/sim-player.component.spec.ts'`
Expected: PASS (2 specs).

- [ ] **Step 5: Commit** (após permissão)

```bash
git add src/app/ui/sim-player/ src/app/ui/index.ts
git commit -m "feat(ds): os-sim-player (controles play/pausa/passo/velocidade)"
```

---

## Task 5: `os-sim-log` (Diário) e `os-sim-callout` (balão)

**Files:**
- Create: `src/app/ui/sim-log/sim-log.component.ts`, `.css`; `src/app/ui/sim-callout/sim-callout.component.ts`, `.css`
- Test: `src/app/ui/sim-log/sim-log.component.spec.ts`
- Modify: `src/app/ui/index.ts`

**Interfaces:**
- Produces:
  - `OsSimLogComponent`, selector `os-sim-log`. `@Input() itens: { rotulo: string }[] = [];` `@Input() ativo = -1;` — renderiza lista, marca o índice `ativo` com classe `now`.
  - `OsSimCalloutComponent`, selector `os-sim-callout`. `@Input() texto = '';` `@Input() visivel = false;` — balão com seta; projeta conteúdo via `<ng-content>` também. Genérico (posicionamento é responsabilidade do pai via CSS/wrapper).

- [ ] **Step 1: Escrever o teste que falha (log)**

```typescript
// src/app/ui/sim-log/sim-log.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { OsSimLogComponent } from './sim-log.component';

describe('OsSimLogComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [OsSimLogComponent] }));

  it('marca a entrada ativa com a classe now', () => {
    const f = TestBed.createComponent(OsSimLogComponent);
    f.componentInstance.itens = [{ rotulo: 'p1' }, { rotulo: 'p2' }, { rotulo: 'p3' }];
    f.componentInstance.ativo = 1;
    f.detectChanges();
    const nows = f.nativeElement.querySelectorAll('.e.now');
    expect(nows.length).toBe(1);
    expect(nows[0].textContent).toContain('p2');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/sim-log.component.spec.ts'`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar os dois componentes**

```typescript
// src/app/ui/sim-log/sim-log.component.ts
import { Component, Input } from '@angular/core';
import { NgFor, NgClass } from '@angular/common';

@Component({
  selector: 'os-sim-log',
  standalone: true,
  imports: [NgFor, NgClass],
  styleUrls: ['./sim-log.component.css'],
  template: `
    <div class="os-log">
      <h4 class="os-log-h">Diário</h4>
      <div class="os-log-scroll">
        <div class="e" *ngFor="let it of itens; let i = index" [ngClass]="{ now: i === ativo }">{{ it.rotulo }}</div>
      </div>
    </div>
  `,
})
export class OsSimLogComponent {
  @Input() itens: { rotulo: string }[] = [];
  @Input() ativo = -1;
}
```

```css
/* src/app/ui/sim-log/sim-log.component.css */
:host { display: block; }
.os-log { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md); padding: 10px; height: 100%; display: flex; flex-direction: column; }
.os-log-h { font: 600 10px/1 var(--f-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--text-3); margin: 0 0 8px; }
.os-log-scroll { overflow-y: auto; flex: 1; }
.e { font: 400 11px/1.3 var(--f-mono); color: var(--text-2); padding: 5px 6px; border-radius: 5px; margin-bottom: 3px; }
.e.now { background: var(--a-050, #fff4ec); color: var(--a); border: 1px solid var(--a-200, #e9b58f); }
```

```typescript
// src/app/ui/sim-callout/sim-callout.component.ts
import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'os-sim-callout',
  standalone: true,
  imports: [NgIf],
  styleUrls: ['./sim-callout.component.css'],
  template: `
    <div class="os-callout" *ngIf="visivel">
      <span class="os-callout-arrow" aria-hidden="true"></span>
      <span class="os-callout-txt">{{ texto }}</span>
      <ng-content></ng-content>
    </div>
  `,
})
export class OsSimCalloutComponent {
  @Input() texto = '';
  @Input() visivel = false;
}
```

```css
/* src/app/ui/sim-callout/sim-callout.component.css */
:host { display: block; }
.os-callout { position: relative; display: inline-flex; align-items: center; gap: 8px;
  background: var(--a-050, #fff8f2); border: 1px solid var(--a-200, #e9b58f); border-radius: 8px;
  padding: 8px 11px; font: 400 12px/1.35 var(--f-serif); color: var(--a-700, #8a3d17); max-width: 420px; }
.os-callout-arrow { position: absolute; top: -7px; left: 22px; width: 12px; height: 12px;
  background: var(--a-050, #fff8f2); border-left: 1px solid var(--a-200, #e9b58f); border-top: 1px solid var(--a-200, #e9b58f); transform: rotate(45deg); }
```

- [ ] **Step 4: Exportar e rodar**

Adicionar em `src/app/ui/index.ts`:
```typescript
export * from './sim-log/sim-log.component';
export * from './sim-callout/sim-callout.component';
```
Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/sim-log.component.spec.ts'`
Expected: PASS (1 spec). Também: `npx tsc --noEmit -p tsconfig.app.json` sem erros.

- [ ] **Step 5: Commit** (após permissão)

```bash
git add src/app/ui/sim-log/ src/app/ui/sim-callout/ src/app/ui/index.ts
git commit -m "feat(ds): os-sim-log (diário) e os-sim-callout (balão de narração)"
```

---

## Task 6: Palco de paginação dirigido pela trilha (modo Assistir)

**Files:**
- Create: `src/app/features/paginacao/components/palco-paginacao/palco-paginacao.component.ts`, `.css`
- Test: `src/app/features/paginacao/components/palco-paginacao/palco-paginacao.component.spec.ts`

**Interfaces:**
- Consumes: `PassoPaginacao` (Task 1), `OsSimCalloutComponent` (Task 5), `MemoriaFisica`.
- Produces: `PalcoPaginacaoComponent`, selector `app-palco-paginacao`.
  - `@Input() passo?: PassoPaginacao;` — renderiza `passo.memoriaFisica` (8 quadros), destaca `passo.quadroDestino` (entrando) e `passo.quadroVitima` (saindo), e mostra o `os-sim-callout` com `passo.narrativa` quando `passo.tipo === 'fault'`.

- [ ] **Step 1: Escrever o teste que falha**

```typescript
// palco-paginacao.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { PalcoPaginacaoComponent } from './palco-paginacao.component';
import { MemoriaFisica } from '../../models/memoria-fisica';
import { Pagina } from '../../models/pagina';
import { PassoPaginacao } from '../../models/passo-paginacao';

function mem(nomes: string[]): MemoriaFisica[] {
  return nomes.map((n, i) => new MemoriaFisica(i, n, '#111', 0));
}

describe('PalcoPaginacaoComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PalcoPaginacaoComponent] }));

  it('renderiza 8 quadros da memória física', () => {
    const f = TestBed.createComponent(PalcoPaginacaoComponent);
    const passo: PassoPaginacao = {
      indice: 0, paginaReferenciada: new Pagina('A', '#111', 0), tipo: 'fault',
      quadroDestino: 0, memoriaFisica: mem(['A0',' ',' ',' ',' ',' ',' ',' ']), narrativa: 'x',
    };
    f.componentInstance.passo = passo; f.detectChanges();
    expect(f.nativeElement.querySelectorAll('.quadro').length).toBe(8);
  });

  it('mostra o balão em fault e esconde em hit', () => {
    const f = TestBed.createComponent(PalcoPaginacaoComponent);
    const base = { indice: 0, paginaReferenciada: new Pagina('A', '#111', 0), quadroDestino: 0,
      memoriaFisica: mem(['A0',' ',' ',' ',' ',' ',' ',' ']), narrativa: 'falta' };
    f.componentInstance.passo = { ...base, tipo: 'fault' } as PassoPaginacao; f.detectChanges();
    expect(f.nativeElement.querySelector('os-sim-callout .os-callout')).toBeTruthy();
    f.componentInstance.passo = { ...base, tipo: 'hit' } as PassoPaginacao; f.detectChanges();
    expect(f.nativeElement.querySelector('os-sim-callout .os-callout')).toBeFalsy();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/palco-paginacao.component.spec.ts'`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar**

```typescript
// palco-paginacao.component.ts
import { Component, Input } from '@angular/core';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { OsSimCalloutComponent } from 'src/app/ui/sim-callout/sim-callout.component';
import { PassoPaginacao } from '../../models/passo-paginacao';

@Component({
  selector: 'app-palco-paginacao',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, OsSimCalloutComponent],
  styleUrls: ['./palco-paginacao.component.css'],
  template: `
    <div class="palco" *ngIf="passo as p">
      <h4 class="palco-h">Memória física · {{ p.memoriaFisica.length }} quadros</h4>
      <div class="quadros">
        <div class="quadro" *ngFor="let q of p.memoriaFisica; let i = index"
             [ngClass]="{ entra: i === p.quadroDestino, sai: i === p.quadroVitima }"
             [style.borderColor]="q.nome.trim() ? q.cor : null">
          <span class="quadro-idx">{{ i }}</span>
          <span class="quadro-nome">{{ q.nome.trim() || '—' }}</span>
        </div>
      </div>
      <os-sim-callout class="palco-balao" [texto]="p.narrativa" [visivel]="p.tipo === 'fault'"></os-sim-callout>
    </div>
  `,
})
export class PalcoPaginacaoComponent {
  @Input() passo?: PassoPaginacao;
}
```

```css
/* palco-paginacao.component.css */
:host { display: block; }
.palco { background: var(--surface); border: 1px solid var(--a, #c0562b); border-radius: var(--r-lg); padding: 16px; }
.palco-h { font: 600 10px/1 var(--f-mono); letter-spacing: .1em; text-transform: uppercase; color: var(--a); margin: 0 0 12px; }
.quadros { display: flex; flex-wrap: wrap; gap: 8px; }
.quadro { width: 52px; height: 58px; border: 1px solid var(--line); border-radius: 6px; background: #fff;
  display: flex; flex-direction: column; align-items: center; justify-content: center; transition: box-shadow .25s, transform .25s; }
.quadro-idx { font: 500 9px/1 var(--f-mono); color: var(--text-3); }
.quadro-nome { font: 600 14px/1 var(--f-mono); color: var(--text); }
.quadro.entra { box-shadow: 0 0 0 2px var(--a); }
.quadro.sai { opacity: .45; }
.palco-balao { display: block; margin-top: 14px; }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/palco-paginacao.component.spec.ts'`
Expected: PASS (2 specs).

- [ ] **Step 5: Commit** (após permissão)

```bash
git add src/app/features/paginacao/components/palco-paginacao/
git commit -m "feat(paginacao): palco dirigido pela trilha (memória física + balão)"
```

---

## Task 7: Container — orquestração Assistir (cenário → trilha → player)

**Files:**
- Modify: `src/app/features/paginacao/components/home-paginacao/home-paginacao-por-demanda-exercicios.component.ts` e `.html`
- Test: `src/app/features/paginacao/components/home-paginacao/home-paginacao-por-demanda-exercicios.component.spec.ts`

**Interfaces:**
- Consumes: `TrilhaPaginacaoService.construir` (Task 3), `PalcoPaginacaoComponent` (Task 6), `OsSimPlayerComponent` (Task 4), `OsSimLogComponent` (Task 5), `OsSimShellComponent` (existente), `PassoPaginacao`.
- Produces (no componente container, para o teste): métodos `gerarCenario()`, `irPara(i: number)`, `avancar(d: 1|-1)`, `tocar()`, `pausar()`; signals/campos `trilha: PassoPaginacao[]`, `indice`, `tocando`.

**Nota:** a geração de processos aleatórios e a fila de páginas continua vindo da lógica existente (`Utils`/`PaginacaoService`). O container monta a **fila de referências** (as páginas na ordem de acesso) e passa para `construir`. Para o piloto, reusar a mesma geração que `inicializarExercicio` já faz para montar `filaDePaginas`, mas SEM aplicar (só a ordem de referências). Extrair essa geração para um método público reutilizável se necessário; caso contrário, replicar a chamada de `Utils.embaralhamentoFisherYates` sobre as páginas geradas.

- [ ] **Step 1: Escrever o teste que falha (lógica de navegação)**

```typescript
// home-paginacao-por-demanda-exercicios.component.spec.ts (novo ou substituindo o existente)
import { TestBed } from '@angular/core/testing';
import { HomePaginacaoPorDemandaExerciciosComponent } from './home-paginacao-por-demanda-exercicios.component';
import { TrilhaPaginacaoService } from '../../services/trilha-paginacao.service';
import { Pagina } from '../../models/pagina';

describe('HomePaginacao (Assistir)', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [HomePaginacaoPorDemandaExerciciosComponent],
  }));

  it('avancar(1) incrementa o índice, avancar(-1) decrementa, com limites', () => {
    const f = TestBed.createComponent(HomePaginacaoPorDemandaExerciciosComponent);
    const c = f.componentInstance;
    // injeta uma trilha determinística
    const svc = TestBed.inject(TrilhaPaginacaoService);
    c.trilha = svc.construir([new Pagina('A','#111',0), new Pagina('A','#111',1)]);
    c.indice = 0;
    c.avancar(1); expect(c.indice).toBe(1);
    c.avancar(1); expect(c.indice).toBe(1);   // clamp no fim
    c.avancar(-1); expect(c.indice).toBe(0);
    c.avancar(-1); expect(c.indice).toBe(0);  // clamp no início
  });

  it('irPara respeita limites', () => {
    const f = TestBed.createComponent(HomePaginacaoPorDemandaExerciciosComponent);
    const c = f.componentInstance;
    const svc = TestBed.inject(TrilhaPaginacaoService);
    c.trilha = svc.construir([new Pagina('A','#111',0), new Pagina('A','#111',1), new Pagina('A','#111',2)]);
    c.irPara(5); expect(c.indice).toBe(2);
    c.irPara(-3); expect(c.indice).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/home-paginacao-por-demanda-exercicios.component.spec.ts'`
Expected: FAIL — métodos/campos `trilha`, `indice`, `avancar`, `irPara` não existem (ou template antigo quebra a montagem).

- [ ] **Step 3: Implementar o container (TS)**

Reescrever a classe para o modo Assistir (mantendo o import de `OsSimShellComponent`). Campos e métodos mínimos:

```typescript
import { Component, inject, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';
import { OsSimShellComponent, /* etc */ } from 'src/app/ui/index';
import { OsSimPlayerComponent } from 'src/app/ui/sim-player/sim-player.component';
import { OsSimLogComponent } from 'src/app/ui/sim-log/sim-log.component';
import { PalcoPaginacaoComponent } from '../palco-paginacao/palco-paginacao.component';
import { TrilhaPaginacaoService } from '../../services/trilha-paginacao.service';
import { PassoPaginacao } from '../../models/passo-paginacao';
import { Pagina } from '../../models/pagina';
// + Utils / geração de processos existente

@Component({
  selector: 'app-home-paginacao-por-demanda-exercicios',
  standalone: true,
  imports: [NgIf, OsSimShellComponent, OsSimPlayerComponent, OsSimLogComponent, PalcoPaginacaoComponent],
  templateUrl: './home-paginacao-por-demanda-exercicios.component.html',
  styleUrls: ['./home-paginacao-por-demanda-exercicios.component.css'],
})
export class HomePaginacaoPorDemandaExerciciosComponent implements OnDestroy {
  private readonly trilhaSvc = inject(TrilhaPaginacaoService);

  trilha: PassoPaginacao[] = [];
  indice = 0;
  tocando = false;
  velocidade = 1;
  private timer?: ReturnType<typeof setInterval>;

  get passoAtual(): PassoPaginacao | undefined { return this.trilha[this.indice]; }
  get itensLog(): { rotulo: string }[] {
    return this.trilha.map(p => ({ rotulo: `${p.indice + 1}. ${p.narrativa}` }));
  }

  ngOnDestroy(): void { this.pausar(); }

  gerarCenario(): void {
    const fila = this.montarFilaDeReferencias(); // usa geração existente → Pagina[]
    this.trilha = this.trilhaSvc.construir(fila);
    this.indice = 0;
    this.pausar();
  }

  irPara(i: number): void {
    this.indice = Math.max(0, Math.min(this.trilha.length - 1, i));
  }
  avancar(d: 1 | -1): void { this.irPara(this.indice + d); }

  tocar(): void {
    if (this.tocando || !this.trilha.length) return;
    this.tocando = true;
    this.timer = setInterval(() => {
      if (this.indice >= this.trilha.length - 1) { this.pausar(); return; }
      this.avancar(1);
    }, 1000 / this.velocidade);
  }
  pausar(): void {
    this.tocando = false;
    if (this.timer) { clearInterval(this.timer); this.timer = undefined; }
  }
  mudarVelocidade(v: number): void {
    this.velocidade = v;
    if (this.tocando) { this.pausar(); this.tocar(); }
  }

  /** monta a fila de páginas na ordem de acesso reusando a geração existente */
  private montarFilaDeReferencias(): Pagina[] {
    // TODO no plano NÃO: replicar a geração de processos de inicializarExercicio,
    // coletar as páginas em ordem embaralhada (Utils.embaralhamentoFisherYates)
    // e devolvê-las SEM aplicar em memória. Ver Task 3 nota.
    return []; // substituído pela geração real na implementação (ver referência abaixo)
  }
}
```

> Referência para `montarFilaDeReferencias`: em `PaginacaoService.inicializarExercicio` (linhas 42-80) as páginas são coletadas em `filaDePaginas` e depois embaralhadas com `Utils.embaralhamentoFisherYates(Utils.listaNum(filaDePaginas.length))`. Reproduzir SÓ a coleta + embaralhamento, retornando as `Pagina[]` na ordem embaralhada. A geração de processos aleatórios usa a mesma rotina que o menu-lateral já usa hoje ("Gerar processos"). Extrair para um helper se ficar duplicado.

- [ ] **Step 4: Implementar o template (HTML)**

```html
<!-- home-paginacao-por-demanda-exercicios.component.html -->
<os-sim-shell title="Paginação por Demanda" subtitle="Assista o SO substituir páginas entre memória física e disco">
  <ng-container slot="actions">
    <os-sim-player
      [total]="trilha.length" [atual]="indice" [tocando]="tocando" [velocidade]="velocidade"
      (play)="tocar()" (pause)="pausar()" (passo)="avancar($event)" (seek)="irPara($event)"
      (velocidadeChange)="mudarVelocidade($event)">
    </os-sim-player>
  </ng-container>

  <ng-container slot="config">
    <button type="button" class="os-btn" (click)="gerarCenario()">Gerar processos</button>
    <!-- controles de config adicionais reaproveitados do menu-lateral entram aqui -->
  </ng-container>

  <div class="sim-layout" *ngIf="trilha.length; else vazio">
    <app-palco-paginacao class="sim-palco" [passo]="passoAtual"></app-palco-paginacao>
    <os-sim-log class="sim-diario" [itens]="itensLog" [ativo]="indice"></os-sim-log>
  </div>
  <ng-template #vazio>
    <p class="sim-hint">Clique em “Gerar processos” e depois em ▶ para assistir a paginação acontecer.</p>
  </ng-template>
</os-sim-shell>
```

Adicionar ao `.css` do container:
```css
.sim-layout { display: grid; grid-template-columns: 1fr 220px; gap: 12px; }
.sim-hint { font: 300 15px/1.6 var(--f-serif); color: var(--text-2); padding: 24px; }
```

- [ ] **Step 5: Rodar testes e verificar passar + compilar**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/home-paginacao-por-demanda-exercicios.component.spec.ts'`
Expected: PASS (2 specs).
Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: sem erros.

- [ ] **Step 6: Verificação manual (skill verify)**

Rodar o app (`ng serve`), navegar para `/PaginacaoPorDemandaExercicios`, clicar em "Gerar processos", ▶, e confirmar: o palco anima quadro a quadro, o balão aparece nos faults com narrativa correta, o diário destaca o passo atual, o scrubber e passo±1 funcionam.

- [ ] **Step 7: Commit** (após permissão)

```bash
git add src/app/features/paginacao/components/home-paginacao/
git commit -m "feat(paginacao): container do modo Assistir (cenário → trilha → player)"
```

---

## Task 8: Modo Praticar + toggle Assistir/Praticar

**Files:**
- Modify: `src/app/features/paginacao/components/home-paginacao/home-paginacao-por-demanda-exercicios.component.ts` e `.html`
- Modify: `src/app/features/paginacao/components/palco-paginacao/palco-paginacao.component.ts` e `.html` (modo praticar: quadro clicável)
- Test: adicionar specs ao spec do container e do palco.

**Interfaces:**
- Produces no container: campo `modo: 'assistir' | 'praticar'`, métodos `trocarModo(m)`, `responderVitima(quadro: number)`; campo `feedback?: { correto: boolean }`.
- Produces no palco: `@Input() modo: 'assistir' | 'praticar' = 'assistir';` `@Output() escolherVitima = new EventEmitter<number>();` — em `praticar`, num passo `fault` com vítima, os quadros ocupados ficam clicáveis e ocultam o destaque de vítima até a resposta.

- [ ] **Step 1: Escrever o teste que falha (correção da vítima)**

```typescript
// adicionar em home-paginacao...spec.ts
it('responderVitima marca correto quando o quadro bate com a vítima do passo', () => {
  const f = TestBed.createComponent(HomePaginacaoPorDemandaExerciciosComponent);
  const c = f.componentInstance;
  const svc = TestBed.inject(TrilhaPaginacaoService);
  // 9 páginas únicas → passo 8 é substituição (vítima A0 no quadro 0)
  c.trilha = svc.construir(Array.from({length:9},(_,i)=>new Pagina('A','#111',i)));
  c.modo = 'praticar'; c.indice = 8;
  const passo = c.trilha[8];
  c.responderVitima(passo.quadroVitima!);
  expect(c.feedback?.correto).toBeTrue();
  c.responderVitima((passo.quadroVitima! + 1) % 8);
  expect(c.feedback?.correto).toBeFalse();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/home-paginacao-por-demanda-exercicios.component.spec.ts'`
Expected: FAIL — `modo`, `responderVitima`, `feedback` não existem.

- [ ] **Step 3: Implementar (container)**

```typescript
// acrescentar ao container
modo: 'assistir' | 'praticar' = 'assistir';
feedback?: { correto: boolean };

trocarModo(m: 'assistir' | 'praticar'): void {
  this.modo = m;
  this.pausar();
  this.indice = 0;
  this.feedback = undefined;
}

responderVitima(quadro: number): void {
  const p = this.passoAtual;
  if (!p || p.quadroVitima === undefined) return;
  this.feedback = { correto: quadro === p.quadroVitima };
}
```

- [ ] **Step 4: Implementar (palco — quadro clicável no modo praticar)**

Acrescentar ao `PalcoPaginacaoComponent`:
```typescript
@Input() modo: 'assistir' | 'praticar' = 'assistir';
@Output() escolherVitima = new EventEmitter<number>();
```
No template, tornar cada `.quadro` clicável quando `modo === 'praticar'` e o passo for fault-com-vítima, emitindo `escolherVitima.emit(i)`; suprimir a classe `sai` (não entregar a resposta) nesse modo até haver feedback. Ex.:
```html
<div class="quadro" *ngFor="let q of p.memoriaFisica; let i = index"
     [ngClass]="{ entra: modo==='assistir' && i === p.quadroDestino,
                  sai: modo==='assistir' && i === p.quadroVitima,
                  clicavel: modo==='praticar' && p.tipo==='fault' && p.quadroVitima!==undefined && q.nome.trim() }"
     (click)="modo==='praticar' && q.nome.trim() ? escolherVitima.emit(i) : null">
  ...
</div>
```

- [ ] **Step 5: Implementar (template do container — toggle + feedback + fio do palco)**

Adicionar toggle no slot `actions` (ou acima do palco) que chama `trocarModo`. Passar `[modo]="modo"` ao palco e ligar `(escolherVitima)="responderVitima($event)"`. Mostrar `feedback` inline:
```html
<div class="sim-modo">
  <button type="button" [class.ativo]="modo==='assistir'" (click)="trocarModo('assistir')">Assistir</button>
  <button type="button" [class.ativo]="modo==='praticar'" (click)="trocarModo('praticar')">Praticar</button>
</div>
...
<app-palco-paginacao class="sim-palco" [passo]="passoAtual" [modo]="modo"
  (escolherVitima)="responderVitima($event)"></app-palco-paginacao>
<p class="sim-feedback" *ngIf="feedback">
  {{ feedback.correto ? '✓ Correto! Essa é a página mais antiga.' : '✗ Não é essa — tente a página que entrou primeiro.' }}
</p>
```
CSS mínimo para `.sim-modo button.ativo { background: var(--a); color:#fff; }` e `.quadro.clicavel { cursor: pointer; }`.

- [ ] **Step 6: Rodar testes + compilar**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/home-paginacao-por-demanda-exercicios.component.spec.ts'`
Expected: PASS (todos, incluindo o novo).
Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: sem erros.

- [ ] **Step 7: Verificação manual (skill verify)**

`ng serve` → `/PaginacaoPorDemandaExercicios`: gerar cenário, alternar para "Praticar", avançar até um fault, clicar num quadro, ver feedback imediato; voltar para "Assistir" e confirmar que o mesmo cenário reproduz.

- [ ] **Step 8: Commit** (após permissão)

```bash
git add src/app/features/paginacao/components/
git commit -m "feat(paginacao): modo Praticar + toggle Assistir/Praticar"
```

---

## Self-Review (executado)

**1. Spec coverage:**
- Modo Assistir+Praticar → Tasks 7 (Assistir) + 8 (Praticar/toggle). ✓
- Layout sidebar+palco → reaproveita `os-sim-shell` (Task 7). ✓
- Narração balão+log → `os-sim-callout` + `os-sim-log` (Task 5), fiados no palco/container (6,7). ✓
- Controles player → `os-sim-player` (Task 4). ✓
- Trilha de passos (peça-chave §3.1) → Tasks 1-3. ✓
- Reaproveitar motor sem reescrever → Task 3 instrumenta FCFS lendo `lista[0]`/retorno; teste de equivalência coberto pelos specs de trilha. ✓
- Testes (§5) → cada task tem specs unit; verificação manual nas Tasks 7/8. ✓
- Fora de escopo (segunda-chance, histórico-bits, ex.1/2, criação manual) → respeitado; piloto só FCFS/substituição. ✓

**2. Placeholder scan:** o único "TODO" textual está dentro de `montarFilaDeReferencias` como comentário explicativo, imediatamente seguido de uma referência concreta (linhas de `inicializarExercicio` + rotina a reproduzir). Aceitável por ser uma instrução precisa, não um vazio.

**3. Type consistency:** `PassoPaginacao` (campos `indice`, `tipo`, `quadroDestino`, `quadroVitima`, `vitima`, `memoriaFisica`, `narrativa`) usado de forma idêntica em Tasks 1,3,6,7,8. `os-sim-player` Outputs (`play/pause/passo/seek/velocidadeChange`) casam com os handlers do container (Task 7). `escolherVitima`/`responderVitima` consistentes entre palco e container (Task 8).
