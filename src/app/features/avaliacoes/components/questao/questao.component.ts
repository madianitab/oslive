import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Campo, Celula, QuestaoPublica, Tabela } from '../../questoes/tipos';

/**
 * Mostra uma questão de avaliação (qualquer tipo): enunciado, tabelas de dados,
 * tabelas com os campos de resposta e tabelas de consulta, lado a lado quando cabem.
 * - modo "responder": campos editáveis (prova do aluno);
 * - modo "gabarito": mostra a resposta certa em cada campo (prévia da professora);
 * - modo "revisao": resposta do aluno em verde (certa) ou vermelho (errada), com a certa ao lado.
 */
@Component({
  selector: 'app-questao',
  standalone: true,
  template: `
<article class="q">
  <header class="q-head">
    <span class="q-num">Questão {{ numero }}</span>
    <h3 class="q-tit">{{ questao.titulo }}</h3>
    @if (notaTexto) { <span class="q-valor q-nota">{{ notaTexto }}</span> }
    @else if (valor !== null) { <span class="q-valor">{{ valorTexto() }}</span> }
  </header>
  <p class="q-enun">{{ questao.enunciado }}</p>
  @if (questao.codigo) { <pre class="q-cod"><code>{{ questao.codigo }}</code></pre> }

  <!-- dados, respostas e consulta lado a lado; cada grupo desce para a linha de baixo quando não cabe -->
  <div class="q-corpo">
    @if (questao.dados.length) {
      <div class="q-grupo">
        @for (t of questao.dados; track $index) { <ng-container *ngTemplateOutlet="tabela; context: { t: t }"></ng-container> }
      </div>
    }
    <div class="q-grupo q-resp">
      @for (t of questao.respostas; track $index) { <ng-container *ngTemplateOutlet="tabela; context: { t: t }"></ng-container> }
    </div>
    @if (questao.apoio?.length) {
      <div class="q-grupo q-apoio">
        @for (t of questao.apoio; track $index) { <ng-container *ngTemplateOutlet="tabela; context: { t: t }"></ng-container> }
      </div>
    }
  </div>

  <ng-template #tabela let-t="t">
    <div class="q-tab">
      @if (t.titulo) { <div class="q-tab-tit">{{ t.titulo }}</div> }
      <div class="q-scroll">
        <table>
          <thead><tr>@for (c of t.cabecalho; track $index) { <th>{{ c }}</th> }</tr></thead>
          <tbody>
            @for (linha of linhas(t); track $index) {
              <tr>
                @for (cel of linha; track $index) {
                  @if (campoDe(cel); as c) {
                    <td class="q-campo">
                      @if (modo === 'gabarito') {
                        <span class="q-gab">{{ rotuloResposta(c, gabarito?.[c.id] ?? '') }}</span>
                      } @else if (modo === 'revisao') {
                        @if (certos?.[c.id]) {
                          <span class="q-gab" title="Certo">{{ rotuloResposta(c, respostas?.[c.id] ?? '') }}</span>
                        } @else {
                          <span class="q-err" title="Resposta do aluno (errada)">{{ rotuloResposta(c, respostas?.[c.id] ?? '') || 'em branco' }}</span>
                          <span class="q-certa" title="Resposta certa">{{ rotuloResposta(c, gabarito?.[c.id] ?? '') }}</span>
                        }
                      } @else if (c.tipo === 'opcao') {
                        <select [value]="respostas?.[c.id] ?? ''" (change)="mudar(c, $any($event.target).value)"
                                [attr.aria-label]="c.rotulo" [disabled]="bloqueado">
                          <option value="">?</option>
                          @for (o of c.opcoes ?? []; track o.valor) {
                            <option [value]="o.valor" [selected]="respostas?.[c.id] === o.valor">{{ o.rotulo }}</option>
                          }
                        </select>
                      } @else {
                        <input type="text" autocomplete="off" spellcheck="false" maxlength="40"
                               [class.q-curto]="(c.tipo === 'numero' || c.tipo === 'binario') && (c.dica?.length ?? 0) <= 10"
                               [attr.inputmode]="c.tipo === 'numero' || c.tipo === 'binario' ? 'decimal' : null"
                               [value]="respostas?.[c.id] ?? ''" [placeholder]="c.dica ?? ''"
                               (input)="mudar(c, $any($event.target).value)" [attr.aria-label]="c.rotulo" [disabled]="bloqueado">
                      }
                    </td>
                  } @else {
                    <td>{{ cel }}</td>
                  }
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  </ng-template>
</article>
  `,
  imports: [NgTemplateOutlet],
  styles: [`
    :host { display: block; }
    .q { padding: 20px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md); }
    .q-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
    .q-num { font-family: var(--f-mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--a); }
    .q-tit { margin: 0; font-size: 16px; font-weight: 600; color: var(--text); flex: 1 1 auto; }
    .q-valor { font-family: var(--f-mono); font-size: 12px; color: var(--text-3); }
    .q-enun { margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: var(--text-2); }
    .q-cod { margin: 0 0 14px; padding: 12px 14px; overflow-x: auto; background: var(--surface-2); border: 1px solid var(--line-soft);
             border-radius: var(--r-sm); font-family: var(--f-mono); font-size: 13px; line-height: 1.5; color: var(--text); }
    .q-corpo { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 18px 32px; }
    .q-grupo { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 14px 20px; flex: 0 1 auto; min-width: 0; max-width: 100%; }
    /* as respostas ocupam o espaço que sobra ao lado dos dados; as tabelas delas descem uma sob a outra */
    .q-resp { flex: 1 1 300px; }
    .q-tab { flex: 0 1 auto; min-width: 0; max-width: 100%; }
    .q-apoio td, .q-apoio th { padding: 3px 8px; font-size: 12px; }
    .q-apoio td:nth-child(odd), .q-apoio th:nth-child(odd) { color: var(--text-3); }
    .q-tab-tit { font-family: var(--f-mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--text-3); margin-bottom: 6px; }
    .q-scroll { overflow-x: auto; }
    table { border-collapse: collapse; font-size: 13px; color: var(--text); }
    th { text-align: left; font-family: var(--f-mono); font-size: 11px; font-weight: 500; color: var(--text-3);
         padding: 6px 10px; border-bottom: 1px solid var(--line); background: var(--surface-2); white-space: nowrap; }
    td { padding: 5px 10px; border-bottom: 1px solid var(--line-soft); font-family: var(--f-mono); white-space: nowrap; }
    input, select {
      width: calc(16ch + 18px); max-width: 100%; height: 32px; padding: 0 8px; border: 1px solid var(--line); border-radius: var(--r-sm);
      background: var(--surface); color: var(--text); font-family: var(--f-mono); font-size: 13px;
    }
    input.q-curto { width: calc(10ch + 18px); }
    select { width: auto; min-width: 96px; }
    input:focus, select:focus { outline: none; border-color: var(--a); box-shadow: var(--ring); }
    input:disabled, select:disabled { opacity: .6; }
    .q-err { display: inline-block; padding: 3px 8px; border-radius: var(--r-xs); background: var(--err-soft); color: var(--err-deep); font-weight: 600; text-decoration: line-through; }
    .q-certa { display: inline-block; margin-left: 6px; color: var(--ok-deep); font-weight: 600; }
    .q-certa::before { content: '→ '; color: var(--text-3); font-weight: 400; }
    .q-nota { color: var(--a); font-weight: 600; }
    .q-gab { display: inline-block; padding: 3px 8px; border-radius: var(--r-xs); background: var(--ok-soft); color: var(--ok-deep); font-weight: 600; }
  `],
})
export class QuestaoComponent implements OnChanges {
  @Input({ required: true }) questao!: QuestaoPublica;
  @Input() numero = 1;
  @Input() valor: number | null = null;
  @Input() modo: 'responder' | 'gabarito' | 'revisao' = 'responder';
  /** Revisão: campo → acertou? */
  @Input() certos: Record<string, boolean> | null = null;
  /** Revisão: "1,5 de 2 pontos". */
  @Input() notaTexto = '';
  @Input() respostas: Record<string, string> | null = null;
  @Input() gabarito: Record<string, string> | null = null;
  @Input() bloqueado = false;
  @Output() resposta = new EventEmitter<{ campo: string; valor: string }>();

  private campos = new Map<string, Campo>();

  ngOnChanges(): void {
    this.campos = new Map(this.questao.campos.map(c => [c.id, c]));
  }

  linhas(t: Tabela): Celula[][] {
    return t.linhas;
  }

  campoDe(cel: Celula): Campo | null {
    return typeof cel === 'string' ? null : this.campos.get(cel.campo) ?? null;
  }

  rotuloResposta(c: Campo, valor: string): string {
    return c.opcoes?.find(o => o.valor === valor)?.rotulo ?? valor;
  }

  valorTexto(): string {
    const v = (this.valor ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    return `${v} ponto${this.valor === 1 ? '' : 's'}`;
  }

  mudar(c: Campo, valor: string): void {
    this.resposta.emit({ campo: c.id, valor });
  }
}
