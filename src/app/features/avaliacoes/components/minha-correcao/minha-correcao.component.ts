import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OsAlertComponent } from '../../../../ui/alert/alert.component';
import { QuestaoComponent } from '../questao/questao.component';
import { AvaliacoesService, MinhaCorrecao } from '../../services/avaliacoes.service';
import { gerarProva, validarModelo } from '../../questoes/catalogo';
import { QuestaoGerada } from '../../questoes/tipos';

/**
 * Aluno: a própria prova corrigida, quando a professora libera a correção.
 * O banco devolve a semente do aluno (só depois que a prova fecha) e a tela gera
 * as mesmas questões com o mesmo código do servidor, como na revisão da professora.
 * Nota e pontos por questão aparecem só se as notas também estiverem liberadas.
 */
@Component({
  selector: 'app-minha-correcao',
  standalone: true,
  imports: [RouterLink, OsAlertComponent, QuestaoComponent],
  providers: [AvaliacoesService],
  styleUrls: ['../../../../ui/styles/pagina.css'],
  styles: [`
    .pg-larga { max-width: 1240px; }
    .pg-idx a { color: inherit; text-decoration: none; }
    .pg-idx a:hover { text-decoration: underline; }
    .topo { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; align-items: flex-end; }
    .nota { font-family: var(--f-mono); font-size: 36px; font-weight: 600; color: var(--a); line-height: 1; }
    .nota small { font-size: 15px; color: var(--text-3); }
    .legenda { font-size: 13px; color: var(--text-2); margin: 0 0 14px; }
    .questoes { display: flex; flex-direction: column; gap: 14px; }
  `],
  template: `
<div class="pg pg-larga">
  <header class="pg-head">
    <div class="pg-idx"><a routerLink="/avaliacoes">Avaliações</a> · Correção</div>
    <div class="topo">
      <h1 class="pg-title">{{ dados()?.titulo ?? 'Correção' }}</h1>
      @if (dados()?.nota !== null && dados()?.nota !== undefined) {
        <div class="nota">{{ num(dados()!.nota!) }}<small> / {{ num(dados()!.valor_total!) }}</small></div>
      }
    </div>
  </header>

  @if (erro()) {
    <os-alert variant="warn" title="Correção não disponível">{{ erro() }}</os-alert>
  } @else {
    @if (dados(); as d) {
      <p class="legenda">Verde: resposta certa. Vermelho riscado: sua resposta; ao lado, a resposta certa.</p>
      <div class="questoes">
        @for (q of prova(); track $index; let i = $index) {
          <app-questao [questao]="q.publica" [numero]="i + 1" modo="revisao"
                       [respostas]="d.respostas[i] ?? {}" [gabarito]="q.gabarito"
                       [certos]="d.questoes[i]?.campos ?? {}" [notaTexto]="notaQuestao(d, i)"></app-questao>
        }
      </div>
    } @else {
      <p class="legenda">Carregando…</p>
    }
  }
</div>
  `,
})
export class MinhaCorrecaoComponent implements OnInit {
  private readonly svc = inject(AvaliacoesService);
  private readonly rota = inject(ActivatedRoute);

  readonly dados = signal<MinhaCorrecao | null>(null);
  readonly prova = signal<QuestaoGerada[]>([]);
  readonly erro = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const d = await this.svc.minhaCorrecao(Number(this.rota.snapshot.paramMap.get('id')));
      // mesma semente e mesmo código do servidor: as mesmas questões que o aluno respondeu
      this.prova.set(gerarProva(validarModelo(d.modelo), d.semente));
      this.dados.set({ ...d, respostas: d.respostas ?? {}, questoes: d.questoes ?? [] });
    } catch (e) {
      this.erro.set(e instanceof Error ? e.message : String(e));
    }
  }

  num(n: number | string): string {
    return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }

  notaQuestao(d: MinhaCorrecao, i: number): string {
    const q = d.questoes[i];
    return q?.nota !== undefined && q.valor !== undefined
      ? `${this.num(q.nota)} de ${this.num(q.valor)} · ${q.acertos}/${q.total} campos`
      : '';
  }
}
