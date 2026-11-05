import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { OsButtonComponent } from '../../ui/button/button.component';
import { OsBadgeComponent } from '../../ui/badge/badge.component';
import { OsAlertComponent } from '../../ui/alert/alert.component';
import { TurmasService, Turma } from '../../features/avaliacoes/services/turmas.service';
import { Avaliacao, AvaliacoesService } from '../../features/avaliacoes/services/avaliacoes.service';
import { QuestaoComponent } from '../../features/avaliacoes/components/questao/questao.component';
import { GrupoAssunto, MAX_QUESTOES, assuntos, gerarProva, montarModelo, tipoQuestao, tiposMarcados } from '../../features/avaliacoes/questoes/catalogo';
import { GradeAssunto, ItemModelo, QuestaoGerada } from '../../features/avaliacoes/questoes/tipos';
import { dataHora, deCampoData, paraCampoData } from '../../features/avaliacoes/models/datas';

interface Formulario {
  id: number | null;
  turma_id: number | null;
  titulo: string;
  inicio: string;   // datetime-local, Brasília
  fim: string;
  duracao_min: number;
  valor_total: number;
  senha: string;
  liberada: boolean;
  /** Tipos marcados (nos assuntos com grade, as combinações das linhas e colunas marcadas). */
  tipos: string[];
  /** Assuntos com grade: linhas e colunas marcadas (ex.: algoritmos e o que pedir). */
  grade: Record<string, { linhas: string[]; colunas: string[] }>;
  /** Questões de cada assunto (assunto sem nada marcado não aparece). */
  quantidades: Partial<Record<string, number>>;
}

/** Professor e admin: cria a prova, escolhe os conteúdos, gera, confere a prévia e libera. */
@Component({
  selector: 'app-admin-avaliacoes',
  standalone: true,
  imports: [RouterLink, OsButtonComponent, OsBadgeComponent, OsAlertComponent, QuestaoComponent],
  providers: [TurmasService, AvaliacoesService],
  styleUrls: [
    '../../ui/styles/pagina.css',
    '../../ui/styles/sim-config.css',
    '../admin-usuarios/admin-usuarios.component.css',
    './admin-avaliacoes.component.css',
  ],
  template: `
<div class="pg pg-larga">
  <header class="pg-head">
    <div class="pg-idx">Avaliações</div>
    <h1 class="pg-title">Provas</h1>
    <p class="pg-sub">Mesmas questões para a turma toda; os valores mudam de aluno para aluno.</p>
  </header>

  @if (erro()) { <os-alert variant="err" title="Erro">{{ erro() }}</os-alert> }
  @if (!carregando() && !turmas().length) {
    <os-alert variant="warn" title="Nenhuma turma">Crie uma turma em <a routerLink="/admin/turmas">Turmas</a> antes de criar a prova.</os-alert>
  }

  @if (!form()) {
    <div class="linha">
      <os-button variant="p" size="sm" [disabled]="!turmas().length" (click)="nova()"><i class="fa-solid fa-plus"></i> Nova prova</os-button>
    </div>
    <div class="tab-wrap">
      <table class="tab">
        <thead><tr><th>Prova</th><th>Turma</th><th>Início (Brasília)</th><th>Duração</th><th>Questões</th><th>Situação</th><th>Iniciadas / enviadas</th><th></th></tr></thead>
        <tbody>
          @for (a of avaliacoes(); track a.id) {
            <tr>
              <td><b>{{ a.titulo }}</b></td>
              <td>{{ a.turma }}</td>
              <td class="mono">{{ dataHora(a.inicio) }}</td>
              <td class="mono">{{ a.duracao_min }} min</td>
              <td class="mono">{{ a.modelo.length }}</td>
              <td><os-badge [variant]="a.liberada ? 's' : 'n'">{{ a.liberada ? 'liberada' : 'rascunho' }}</os-badge></td>
              <td class="mono">{{ a.iniciadas }} / {{ a.enviadas }}</td>
              <td class="acao">
                <a [routerLink]="['/admin/avaliacoes', a.id, 'resultados']"><os-button variant="p" size="sm">Resultados</os-button></a>
                <os-button variant="s" size="sm" (click)="editar(a)">Editar</os-button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="8" class="vazio">{{ carregando() ? 'Carregando…' : 'Nenhuma prova ainda.' }}</td></tr>
          }
        </tbody>
      </table>
    </div>
  } @else {
    @let f = form()!;
    <section class="cartao">
      <div class="cartao-tit">{{ f.id ? 'Editar prova' : 'Nova prova' }}</div>
      @if (travada()) {
        <os-alert variant="info" title="Prova já iniciada por alunos">
          Dá para mudar título, horários, duração, senha e liberação. As questões, o valor e a turma ficam fixos.
        </os-alert>
      }
      <div class="grade">
        <label>Turma
          <select class="form-control" [value]="f.turma_id ?? ''" [disabled]="travada()" (change)="campo('turma_id', +$any($event.target).value)">
            @for (t of turmas(); track t.id) { <option [value]="t.id" [selected]="t.id === f.turma_id">{{ t.nome }}</option> }
          </select>
        </label>
        <label>Título <input class="form-control" maxlength="120" [value]="f.titulo" (input)="campo('titulo', $any($event.target).value)"></label>
        <label>Abre em (Brasília) <input class="form-control" type="datetime-local" [value]="f.inicio" (input)="campo('inicio', $any($event.target).value)"></label>
        <label>Fecha em (Brasília) <input class="form-control" type="datetime-local" [value]="f.fim" (input)="campo('fim', $any($event.target).value)"></label>
        <label>Duração (min) <input class="form-control" type="number" min="5" max="600" [value]="f.duracao_min" (input)="campo('duracao_min', +$any($event.target).value)"></label>
        <label>Valor total <input class="form-control" type="number" min="0.5" max="1000" step="0.5" [value]="f.valor_total" [disabled]="travada()" (input)="campo('valor_total', +$any($event.target).value)"></label>
        <label>Senha da prova
          <input class="form-control" type="text" autocomplete="off" maxlength="64" [value]="f.senha"
                 [placeholder]="f.id ? 'deixe vazio para manter a atual' : 'mínimo 4 caracteres'" (input)="campo('senha', $any($event.target).value)">
        </label>
      </div>
      <p class="hint">O aluno tem a duração inteira a partir do momento em que começa, mas nunca além do fechamento.</p>

      @if (!travada()) {
        <div class="cartao-tit">Conteúdos</div>
        <div class="assuntos">
          @for (g of grupos; track g.assunto) {
            @let max = maximo(g.assunto);
            <fieldset [class.ativo]="(f.quantidades[g.assunto] ?? 0) > 0">
              <legend>{{ g.assunto }}</legend>
              @if (g.grade; as gr) {
                <div class="eixo-tit">{{ gr.linhasTitulo }}</div>
                @for (l of gr.linhas; track l.id) {
                  <label class="check-row">
                    <input type="checkbox" [checked]="marcadoNaGrade(gr, 'linhas', l.id)" (change)="alternarGrade(gr, 'linhas', l.id)"> {{ l.nome }}
                  </label>
                }
                <div class="eixo-tit">{{ gr.colunasTitulo }}</div>
                @for (c of gr.colunas; track c.id) {
                  <label class="check-row">
                    <input type="checkbox" [checked]="marcadoNaGrade(gr, 'colunas', c.id)" (change)="alternarGrade(gr, 'colunas', c.id)"> {{ c.nome }}
                  </label>
                }
              } @else {
                @for (t of g.tipos; track t.id) {
                  <label class="check-row">
                    <input type="checkbox" [checked]="f.tipos.includes(t.id)" (change)="alternarTipo(g, t.id)"> {{ t.nome }}
                  </label>
                }
              }
              <label class="qtd-assunto">Questões
                <input class="form-control" type="number" min="0" [max]="max" [disabled]="!max"
                       [value]="f.quantidades[g.assunto] ?? 0" (input)="mudarQuantidade(g.assunto, +$any($event.target).value)"
                       [attr.aria-label]="'Questões de ' + g.assunto">
                <span>de {{ max }} {{ max === 1 ? 'tipo marcado' : 'tipos marcados' }}</span>
              </label>
            </fieldset>
          }
        </div>
        <div class="linha">
          <span class="total" [class.erro]="total() > maxQuestoes">
            Total: <b>{{ total() }}</b> {{ total() === 1 ? 'questão' : 'questões' }}
            @if (total() > maxQuestoes) { (máximo {{ maxQuestoes }}) }
          </span>
          <os-button variant="p" size="sm" [disabled]="!total() || total() > maxQuestoes" (click)="gerar()"><i class="fa-solid fa-shuffle"></i> Gerar prova</os-button>
          @if (modelo().length) {
            <os-button variant="s" size="sm" (click)="outraPrevia()"><i class="fa-solid fa-dice"></i> Ver com outros valores</os-button>
          }
        </div>
      }

      @if (previa().length) {
        <div class="cartao-tit">Prévia com gabarito ({{ modelo().length }} questões · {{ valorQuestao() }} cada)</div>
        <p class="hint">É assim que um aluno vê a prova, com outros valores. Os tipos sorteados são os mesmos para todos. As respostas em verde aparecem só aqui.</p>
        <div class="questoes">
          @for (q of previa(); track $index; let qi = $index) {
            <!-- qi = número da questão; dentro dos @for internos, $index é o índice da opção -->
            <div class="q-linha">
              <app-questao [questao]="q.publica" [numero]="qi + 1" [valor]="valorNumerico()" modo="gabarito" [gabarito]="q.gabarito"></app-questao>
              @if (!travada()) {
                <div class="q-acoes">
                  <select class="form-control" [value]="modelo()[qi]?.tipo" (change)="trocarTipo(qi, $any($event.target).value)" aria-label="Trocar o tipo desta questão">
                    @if (tipoOculto(modelo()[qi]?.tipo); as antigo) {
                      <option [value]="antigo.id" selected>{{ antigo.nome }}</option>
                    }
                    @for (g of grupos; track g.assunto) {
                      <optgroup [label]="g.assunto">
                        @for (t of g.tipos; track t.id) {
                          <!-- sem repetir: só os tipos que ainda não estão na prova (e o desta questão) -->
                          @if (t.id === modelo()[qi]?.tipo || !naProva().has(t.id)) {
                            <option [value]="t.id" [selected]="t.id === modelo()[qi]?.tipo">{{ t.nome }}</option>
                          }
                        }
                      </optgroup>
                    }
                  </select>
                  <os-button variant="g" size="sm" (click)="removerQuestao(qi)" [attr.aria-label]="'Remover questão ' + (qi + 1)">Remover</os-button>
                </div>
              }
            </div>
          }
        </div>
      }

      <label class="check-row liberar">
        <input type="checkbox" [checked]="f.liberada" (change)="campo('liberada', !f.liberada)">
        Liberar para os alunos (a prova aparece para a turma e abre no horário marcado)
      </label>

      <div class="linha">
        <os-button variant="p" size="sm" [disabled]="ocupado() || !modelo().length" (click)="salvar()"><i class="fa-solid fa-floppy-disk"></i> Salvar</os-button>
        <os-button variant="g" size="sm" [disabled]="ocupado()" (click)="fechar()">Voltar</os-button>
        @if (f.id) {
          <os-button variant="d" size="sm" [disabled]="ocupado()" (click)="excluir()"><i class="fa-solid fa-trash"></i> Excluir</os-button>
        }
      </div>
    </section>
  }
</div>
  `,
})
export class AdminAvaliacoesComponent implements OnInit {
  private readonly svc = inject(AvaliacoesService);
  private readonly turmasSvc = inject(TurmasService);
  private readonly aviso = inject(MatSnackBar);

  readonly grupos = assuntos();
  readonly maxQuestoes = MAX_QUESTOES;
  readonly dataHora = dataHora;

  readonly avaliacoes = signal<Avaliacao[]>([]);
  readonly turmas = signal<Turma[]>([]);
  readonly form = signal<Formulario | null>(null);
  readonly modelo = signal<ItemModelo[]>([]);
  readonly semente = signal(novaSemente());
  readonly travada = signal(false);
  readonly carregando = signal(true);
  readonly ocupado = signal(false);
  readonly erro = signal('');

  readonly previa = computed<QuestaoGerada[]>(() => gerarProva(this.modelo(), this.semente()));
  readonly naProva = computed(() => new Set(this.modelo().map(m => m.tipo)));
  readonly total = computed(() => Object.values(this.form()?.quantidades ?? {}).reduce<number>((s, n) => s + Math.max(0, n ?? 0), 0));
  readonly valorNumerico = computed(() => (this.form()?.valor_total ?? 0) / Math.max(1, this.modelo().length));
  readonly valorQuestao = computed(() => this.valorNumerico().toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' ponto(s)');

  ngOnInit(): void {
    this.carregar();
  }

  async carregar(): Promise<void> {
    try {
      const [av, tu] = await Promise.all([this.svc.listar(), this.turmasSvc.listar()]);
      this.avaliacoes.set(av);
      this.turmas.set(tu);
      this.erro.set('');
    } catch (e) {
      this.erro.set(msg(e));
    }
    this.carregando.set(false);
  }

  nova(): void {
    const amanha = new Date(Date.now() + 24 * 3600 * 1000);
    const inicio = paraCampoData(amanha).slice(0, 11) + '19:00';
    this.form.set({
      id: null, turma_id: this.turmas()[0]?.id ?? null, titulo: '', inicio, fim: inicio.slice(0, 11) + '22:00',
      duracao_min: 60, valor_total: 10, senha: '', liberada: false, tipos: [], grade: {}, quantidades: {},
    });
    this.modelo.set([]);
    this.travada.set(false);
  }

  editar(a: Avaliacao): void {
    // marca o que a prova já tem: os tipos, as linhas e colunas dos assuntos com grade e as quantidades por assunto
    const tipos = [...new Set(a.modelo.map(m => m.tipo))].filter(t => tipoQuestao(t) && !tipoQuestao(t)!.oculto);
    const grade: Formulario['grade'] = {};
    for (const g of this.grupos) {
      if (!g.grade) continue;
      const gr = g.grade;
      const pares = gr.linhas.flatMap(l => gr.colunas.map(c => ({ l: l.id, c: c.id, tipo: gr.tipo(l.id, c.id) })))
        .filter(p => tipos.includes(p.tipo));
      grade[g.assunto] = { linhas: [...new Set(pares.map(p => p.l))], colunas: [...new Set(pares.map(p => p.c))] };
    }
    const quantidades: Record<string, number> = {};
    for (const m of a.modelo) {
      const assunto = tipoQuestao(m.tipo)?.assunto;
      if (assunto) quantidades[assunto] = (quantidades[assunto] ?? 0) + 1;
    }
    this.form.set({
      id: a.id, turma_id: a.turma_id, titulo: a.titulo, inicio: paraCampoData(a.inicio), fim: paraCampoData(a.fim),
      duracao_min: a.duracao_min, valor_total: Number(a.valor_total), senha: '', liberada: a.liberada,
      tipos: this.comGrades(tipos, grade), grade, quantidades: {},
    });
    // a quantidade de cada assunto não passa do que está marcado (provas antigas podem ter tipo repetido)
    this.form.update(f => f && { ...f, quantidades: Object.fromEntries(
      Object.entries(quantidades).map(([as, n]) => [as, Math.min(n, this.maximo(as))])) });
    this.modelo.set(a.modelo.filter(m => tipoQuestao(m.tipo)));
    this.semente.set(novaSemente());
    this.travada.set(a.iniciadas > 0);
  }

  fechar(): void {
    this.form.set(null);
    this.modelo.set([]);
  }

  campo<K extends keyof Formulario>(k: K, v: Formulario[K]): void {
    this.form.update(f => (f ? { ...f, [k]: v } : f));
  }

  /** Tipos marcados do assunto: é o máximo de questões dele (sem repetir tipo). */
  maximo(assunto: string): number {
    return tiposMarcados(assunto, this.form()?.tipos ?? []).length;
  }

  alternarTipo(g: GrupoAssunto, id: string): void {
    this.form.update(f => f && { ...f, tipos: f.tipos.includes(id) ? f.tipos.filter(t => t !== id) : [...f.tipos, id] });
    this.ajustarQuantidade(g.assunto);
  }

  marcadoNaGrade(gr: GradeAssunto, eixo: 'linhas' | 'colunas', id: string): boolean {
    return this.form()?.grade[gr.assunto]?.[eixo].includes(id) ?? false;
  }

  alternarGrade(gr: GradeAssunto, eixo: 'linhas' | 'colunas', id: string): void {
    this.form.update(f => {
      if (!f) return f;
      const atual = f.grade[gr.assunto] ?? { linhas: [], colunas: [] };
      const lista = atual[eixo].includes(id) ? atual[eixo].filter(x => x !== id) : [...atual[eixo], id];
      const grade = { ...f.grade, [gr.assunto]: { ...atual, [eixo]: lista } };
      return { ...f, grade, tipos: this.comGrades(f.tipos, grade) };
    });
    this.ajustarQuantidade(gr.assunto);
  }

  mudarQuantidade(assunto: string, n: number): void {
    const q = Math.max(0, Math.min(this.maximo(assunto), Math.floor(n || 0)));
    this.form.update(f => f && { ...f, quantidades: { ...f.quantidades, [assunto]: q } });
  }

  /** Ao marcar o primeiro tipo, o assunto passa a ter 1 questão; ao desmarcar, a quantidade não passa do máximo. */
  private ajustarQuantidade(assunto: string): void {
    const max = this.maximo(assunto);
    const atual = this.form()?.quantidades[assunto] ?? 0;
    this.mudarQuantidade(assunto, max === 0 ? 0 : Math.max(1, Math.min(atual, max)));
  }

  /** Troca, nos tipos marcados, os dos assuntos com grade pelas combinações das linhas e colunas marcadas. */
  private comGrades(tipos: string[], grade: Formulario['grade']): string[] {
    const comGrade = new Set(this.grupos.filter(g => g.grade).map(g => g.assunto));
    const outros = tipos.filter(t => !comGrade.has(tipoQuestao(t)?.assunto ?? ''));
    const combinacoes = this.grupos.filter(g => g.grade).flatMap(g => {
      const sel = grade[g.assunto] ?? { linhas: [], colunas: [] };
      return sel.linhas.flatMap(l => sel.colunas.map(c => g.grade!.tipo(l, c)));
    });
    return [...outros, ...combinacoes];
  }

  /** Tipo antigo (oculto) de uma prova salva: aparece só como a opção atual da questão. */
  tipoOculto(id: string | undefined) {
    const t = id ? tipoQuestao(id) : undefined;
    return t?.oculto ? t : null;
  }

  gerar(): void {
    const f = this.form();
    if (!f) return;
    try {
      this.modelo.set(montarModelo({ tipos: f.tipos, quantidades: f.quantidades as Record<string, number> }));
      this.semente.set(novaSemente());
    } catch (e) {
      this.avisar(msg(e), 4000);
    }
  }

  outraPrevia(): void {
    this.semente.set(novaSemente());
  }

  trocarTipo(i: number, tipo: string): void {
    this.modelo.update(m => m.map((x, k) => (k === i ? { tipo } : x)));
  }

  removerQuestao(i: number): void {
    this.modelo.update(m => m.filter((_, k) => k !== i));
  }

  async salvar(): Promise<void> {
    const f = this.form();
    if (!f) return;
    const problema = this.validar(f);
    if (problema) return this.avisar(problema, 4000);
    this.ocupado.set(true);
    try {
      const id = await this.svc.salvar({
        id: f.id, turma_id: f.turma_id!, titulo: f.titulo, inicio: deCampoData(f.inicio), fim: deCampoData(f.fim),
        duracao_min: f.duracao_min, valor_total: f.valor_total, modelo: this.modelo(),
        senha: f.senha.trim() ? f.senha.trim() : null, liberada: f.liberada,
      });
      this.avisar(f.liberada ? 'Prova salva e liberada para a turma.' : 'Prova salva como rascunho.');
      this.form.update(x => x && { ...x, id, senha: '' });
      await this.carregar();
    } catch (e) {
      this.avisar(msg(e), 5000);
    }
    this.ocupado.set(false);
  }

  async excluir(): Promise<void> {
    const f = this.form();
    if (!f?.id) return;
    if (!confirm(`Excluir a prova "${f.titulo}" e todas as respostas dos alunos? Isso não pode ser desfeito.`)) return;
    this.ocupado.set(true);
    try {
      await this.svc.excluir(f.id);
      this.fechar();
      await this.carregar();
      this.avisar('Prova excluída.');
    } catch (e) {
      this.avisar(msg(e), 5000);
    }
    this.ocupado.set(false);
  }

  private validar(f: Formulario): string | null {
    if (!f.turma_id) return 'Escolha a turma.';
    if (f.titulo.trim().length < 2) return 'Informe o título.';
    if (!f.inicio || !f.fim) return 'Informe quando a prova abre e fecha.';
    if (f.fim <= f.inicio) return 'O fechamento deve ser depois da abertura.';
    if (!(f.duracao_min >= 5 && f.duracao_min <= 600)) return 'A duração deve ser de 5 a 600 minutos.';
    if (!(f.valor_total > 0 && f.valor_total <= 1000)) return 'O valor total deve ser maior que 0.';
    if (!f.id && f.senha.trim().length < 4) return 'A senha deve ter pelo menos 4 caracteres.';
    if (f.senha.trim() && f.senha.trim().length < 4) return 'A senha deve ter pelo menos 4 caracteres.';
    if (!this.modelo().length) return 'Gere a prova antes de salvar.';
    return null;
  }

  private avisar(texto: string, duracao = 3000): void {
    this.aviso.open(texto, 'OK', { duration: duracao });
  }
}

function novaSemente(): string {
  return 'previa:' + Math.random().toString(36).slice(2);
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
