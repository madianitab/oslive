import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OsButtonComponent } from '../../ui/button/button.component';
import { OsBadgeComponent } from '../../ui/badge/badge.component';
import { OsAlertComponent } from '../../ui/alert/alert.component';
import { OsStatComponent } from '../../ui/stat/stat.component';
import {
  Avaliacao,
  AvaliacoesService,
  DetalheTentativa,
  ResultadoAluno,
  SituacaoTentativa,
} from '../../features/avaliacoes/services/avaliacoes.service';
import { QuestaoComponent } from '../../features/avaliacoes/components/questao/questao.component';
import { gerarProva, validarModelo } from '../../features/avaliacoes/questoes/catalogo';
import { corrigirProva } from '../../features/avaliacoes/questoes/corrigir';
import { QuestaoGerada } from '../../features/avaliacoes/questoes/tipos';
import { dataHora } from '../../features/avaliacoes/models/datas';
import { gerarCsv, nomeArquivo } from '../../features/avaliacoes/models/csv';

const SITUACOES: Record<SituacaoTentativa, { texto: string; cor: 'n' | 'a' | 's' | 'w' | 'd' }> = {
  nao_iniciou: { texto: 'não iniciou', cor: 'n' },
  em_andamento: { texto: 'fazendo agora', cor: 'a' },
  tempo_esgotado: { texto: 'tempo esgotado', cor: 'w' },
  enviada: { texto: 'enviada', cor: 's' },
};

interface Revisao {
  aluno: ResultadoAluno;
  detalhe: DetalheTentativa;
  prova: QuestaoGerada[];
}

/** Professor e admin: notas, horários e IPs da turma; prova de cada aluno; planilha CSV. */
@Component({
  selector: 'app-admin-resultados',
  standalone: true,
  imports: [RouterLink, OsButtonComponent, OsBadgeComponent, OsAlertComponent, OsStatComponent, QuestaoComponent],
  providers: [AvaliacoesService],
  styleUrls: [
    '../../ui/styles/pagina.css',
    '../admin-usuarios/admin-usuarios.component.css',
    './admin-resultados.component.css',
  ],
  template: `
<div class="pg pg-larga">
  <header class="pg-head">
    <div class="pg-idx"><a routerLink="/admin/avaliacoes">Provas</a> · Resultados</div>
    <h1 class="pg-title">{{ avaliacao()?.titulo ?? 'Resultados' }}</h1>
    @if (avaliacao(); as a) {
      <p class="pg-sub">{{ a.turma }} · abre {{ dataHora(a.inicio) }} · fecha {{ dataHora(a.fim) }} · {{ a.duracao_min }} min · vale {{ num(a.valor_total) }}</p>
    }
  </header>

  @if (erro()) { <os-alert variant="err" title="Erro">{{ erro() }}</os-alert> }

  <div class="stats">
    <os-stat label="Alunos" [value]="alunos().length"></os-stat>
    <os-stat label="Enviaram" [value]="contar('enviada')" [hint]="contar('em_andamento') + ' fazendo agora'"></os-stat>
    <os-stat label="Média" [value]="media()" [hint]="'das provas enviadas'" [accent]="true"></os-stat>
  </div>

  <div class="linha">
    <os-button variant="s" size="sm" [disabled]="carregando()" (click)="carregar()"><i class="fa-solid fa-rotate"></i> Atualizar</os-button>
    <os-button variant="s" size="sm" [disabled]="!alunos().length" (click)="exportar()"><i class="fa-solid fa-file-csv"></i> Baixar planilha (CSV)</os-button>
    @if (contar('tempo_esgotado')) {
      <os-button variant="p" size="sm" [disabled]="ocupado()" (click)="encerrarEsgotados()">
        <i class="fa-solid fa-flag-checkered"></i> Corrigir {{ contar('tempo_esgotado') }} com tempo esgotado
      </os-button>
    }
  </div>

  <div class="tab-wrap">
    <table class="tab">
      <thead>
        <tr><th>Aluno</th><th>Situação</th><th>Nota</th><th>Início</th><th>Envio</th><th>IP (início → envio)</th><th></th></tr>
      </thead>
      <tbody>
        @for (a of alunos(); track a.email) {
          <tr [class.sel]="revisao()?.aluno?.email === a.email">
            <td><b>{{ a.nome || '—' }}</b><br><span class="mono">{{ a.email }}</span></td>
            <td><os-badge [variant]="situacao(a).cor">{{ situacao(a).texto }}</os-badge></td>
            <td class="mono nota">{{ a.nota !== null ? num(a.nota) : '—' }}</td>
            <td class="mono">{{ a.iniciada_em ? dataHora(a.iniciada_em) : '—' }}</td>
            <td class="mono">
              {{ a.enviada_em ? dataHora(a.enviada_em) : '—' }}
              @if (a.envio === 'tempo') { <span class="obs" title="Enviada no fim do tempo, com as respostas salvas">(tempo)</span> }
            </td>
            <td class="mono">
              {{ a.ip_inicio || '—' }}
              @if (a.ip_envio && a.ip_envio !== a.ip_inicio) {
                → <span class="ip-mudou" title="O IP do envio é diferente do início">{{ a.ip_envio }}</span>
              }
            </td>
            <td class="acao">
              @if (a.tentativa) {
                <div class="botoes">
                  <os-button variant="s" size="sm" (click)="abrir(a)">Ver prova</os-button>
                  <os-button variant="g" size="sm" [disabled]="ocupado()" (click)="novaTentativa(a)" title="Apaga a tentativa para o aluno fazer de novo">Nova tentativa</os-button>
                </div>
              }
            </td>
          </tr>
        } @empty {
          <tr><td colspan="7" class="vazio">{{ carregando() ? 'Carregando…' : 'Nenhum aluno na turma.' }}</td></tr>
        }
      </tbody>
    </table>
  </div>

  @if (revisao(); as r) {
    <section class="revisao" id="revisao">
      <div class="rev-head">
        <div>
          <div class="pg-idx">Prova de</div>
          <h2>{{ r.aluno.nome || r.aluno.email }}</h2>
          <p class="mono">{{ r.aluno.email }} · começou {{ dataHora(r.detalhe.iniciada_em) }} ·
            {{ r.detalhe.enviada_em ? 'enviou ' + dataHora(r.detalhe.enviada_em) : 'ainda não enviou (respostas salvas até agora)' }}</p>
        </div>
        <div class="rev-nota">{{ r.detalhe.nota !== null ? num(r.detalhe.nota) : '—' }}<small> / {{ num(r.detalhe.valor_total) }}</small></div>
      </div>
      <p class="hint">Verde: resposta certa. Vermelho riscado: resposta do aluno; ao lado, a certa.</p>
      <div class="questoes">
        @for (q of r.prova; track $index) {
          <app-questao [questao]="q.publica" [numero]="$index + 1" modo="revisao"
                       [respostas]="respostasDe(r, $index)" [gabarito]="q.gabarito"
                       [certos]="certos(r, $index)" [notaTexto]="notaQuestao(r, $index)"></app-questao>
        }
      </div>
      <div class="linha"><os-button variant="g" size="sm" (click)="revisao.set(null)">Fechar</os-button></div>
    </section>
  }
</div>
  `,
})
export class AdminResultadosComponent implements OnInit {
  private readonly svc = inject(AvaliacoesService);
  private readonly rota = inject(ActivatedRoute);
  private readonly aviso = inject(MatSnackBar);
  readonly dataHora = dataHora;

  readonly avaliacao = signal<Avaliacao | null>(null);
  readonly alunos = signal<ResultadoAluno[]>([]);
  readonly revisao = signal<Revisao | null>(null);
  readonly carregando = signal(true);
  readonly ocupado = signal(false);
  readonly erro = signal('');

  readonly media = computed(() => {
    const notas = this.alunos().filter(a => a.situacao === 'enviada' && a.nota !== null).map(a => Number(a.nota));
    return notas.length ? this.num(notas.reduce((t, n) => t + n, 0) / notas.length) : '—';
  });

  private get id(): number {
    return Number(this.rota.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      const [lista, alunos] = await Promise.all([this.svc.listar(), this.svc.resultados(this.id)]);
      this.avaliacao.set(lista.find(a => a.id === this.id) ?? null);
      this.alunos.set(alunos);
      this.erro.set('');
    } catch (e) {
      this.erro.set(msg(e));
    }
    this.carregando.set(false);
  }

  contar(s: SituacaoTentativa): number {
    return this.alunos().filter(a => a.situacao === s).length;
  }

  situacao(a: ResultadoAluno) {
    return SITUACOES[a.situacao];
  }

  num(n: number | string): string {
    return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }

  async abrir(a: ResultadoAluno): Promise<void> {
    try {
      const detalhe = await this.svc.detalhe(a.tentativa!);
      // mesma semente e mesmo código do servidor: as mesmas questões que o aluno viu
      const prova = gerarProva(validarModelo(detalhe.modelo), detalhe.semente);
      this.revisao.set({ aluno: a, detalhe, prova });
      setTimeout(() => document.getElementById('revisao')?.scrollIntoView({ behavior: 'smooth' }));
    } catch (e) {
      this.avisar(msg(e), 5000);
    }
  }

  respostasDe(r: Revisao, i: number): Record<string, string> {
    return r.detalhe.respostas?.[String(i)] ?? {};
  }

  /** Correção gravada no envio; se ainda não houver (prova em andamento), calcula agora. */
  certos(r: Revisao, i: number): Record<string, boolean> {
    return r.detalhe.correcao?.questoes[i]?.campos ?? this.calcular(r).questoes[i].campos;
  }

  notaQuestao(r: Revisao, i: number): string {
    const q = r.detalhe.correcao?.questoes[i] ?? this.calcular(r).questoes[i];
    return `${this.num(q.nota)} de ${this.num(q.valor)} · ${q.acertos}/${q.total} campos`;
  }

  private calcular(r: Revisao) {
    return corrigirProva(r.prova, r.detalhe.respostas ?? {}, Number(r.detalhe.valor_total));
  }

  /** Corrige com as respostas salvas as provas cujo tempo acabou sem o aluno enviar. */
  async encerrarEsgotados(): Promise<void> {
    const lista = this.alunos().filter(a => a.situacao === 'tempo_esgotado' && a.tentativa);
    if (!confirm(`Corrigir ${lista.length} prova(s) com as respostas que ficaram salvas?`)) return;
    this.ocupado.set(true);
    let ok = 0;
    for (const a of lista) {
      try {
        const d = await this.svc.detalhe(a.tentativa!);
        const modelo = validarModelo(d.modelo);
        const prova = gerarProva(modelo, d.semente);
        const c = corrigirProva(prova, d.respostas ?? {}, Number(d.valor_total));
        const correcao = {
          questoes: c.questoes.map((q, i) => ({
            tipo: modelo[i].tipo, valor: q.valor, nota: q.nota, acertos: q.acertos, total: q.total, campos: q.campos,
          })),
        };
        await this.svc.encerrarPorTempo(a.tentativa!, c.nota, correcao);
        ok++;
      } catch (e) {
        this.avisar(`${a.email}: ${msg(e)}`, 5000);
      }
    }
    this.ocupado.set(false);
    this.avisar(`${ok} prova(s) corrigida(s).`);
    await this.carregar();
  }

  async novaTentativa(a: ResultadoAluno): Promise<void> {
    if (!confirm(`Apagar a prova de ${a.email} (respostas e nota) para ele fazer de novo? Isso não pode ser desfeito.`)) return;
    this.ocupado.set(true);
    try {
      await this.svc.liberarNovaTentativa(a.tentativa!);
      if (this.revisao()?.aluno.email === a.email) this.revisao.set(null);
      this.avisar(`${a.email} pode fazer a prova de novo (dentro do horário da prova).`);
      await this.carregar();
    } catch (e) {
      this.avisar(msg(e), 5000);
    }
    this.ocupado.set(false);
  }

  exportar(): void {
    const a = this.avaliacao();
    const n = a?.modelo.length ?? Math.max(0, ...this.alunos().map(x => x.notas_questoes?.length ?? 0));
    const cab = ['Nome', 'E-mail', 'Situação', 'Nota', 'Valor',
      ...Array.from({ length: n }, (_, i) => `Q${i + 1}`),
      'Início', 'Envio', 'Enviada por', 'IP início', 'IP envio'];
    const linhas = this.alunos().map(x => [
      x.nome ?? '', x.email, SITUACOES[x.situacao].texto, x.nota === null ? null : Number(x.nota), a ? Number(a.valor_total) : null,
      ...Array.from({ length: n }, (_, i) => x.notas_questoes?.[i] ?? null),
      x.iniciada_em ? dataHora(x.iniciada_em) : '', x.enviada_em ? dataHora(x.enviada_em) : '',
      x.envio === 'tempo' ? 'fim do tempo' : x.envio === 'aluno' ? 'aluno' : '',
      x.ip_inicio ?? '', x.ip_envio ?? '',
    ]);
    const blob = new Blob([gerarCsv(cab, linhas)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nomeArquivo(`${a?.titulo ?? 'prova'} ${a?.turma ?? ''}`)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private avisar(texto: string, duracao = 3000): void {
    this.aviso.open(texto, 'OK', { duration: duracao });
  }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
