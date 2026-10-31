import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OsButtonComponent } from '../../ui/button/button.component';
import { OsBadgeComponent } from '../../ui/badge/badge.component';
import { OsAlertComponent } from '../../ui/alert/alert.component';
import { AuthService } from '../../core/auth/auth.service';
import { AlunoTurma, Turma, TurmasService } from '../../features/avaliacoes/services/turmas.service';
import { separarEmails } from '../../features/avaliacoes/models/emails';

/** Professor e admin: cria turmas e inclui os alunos pelo e-mail da conta Google. */
@Component({
  selector: 'app-admin-turmas',
  standalone: true,
  imports: [DatePipe, OsButtonComponent, OsBadgeComponent, OsAlertComponent],
  providers: [TurmasService],
  styleUrls: [
    '../../ui/styles/pagina.css',
    '../../ui/styles/sim-config.css',
    '../admin-usuarios/admin-usuarios.component.css',
    './admin-turmas.component.css',
  ],
  template: `
<div class="pg">
  <header class="pg-head">
    <div class="pg-idx">Avaliações</div>
    <h1 class="pg-title">Turmas</h1>
    <p class="pg-sub">Só os e-mails da turma veem as avaliações dela.</p>
  </header>

  @if (erro()) {
    <os-alert variant="err" title="Erro">{{ erro() }}</os-alert>
  }

  <form class="linha" (submit)="$event.preventDefault(); criar()">
    <input class="form-control" placeholder="Nome da nova turma (ex.: SO 2026/2)" maxlength="120"
           [value]="novoNome()" (input)="novoNome.set($any($event.target).value)" aria-label="Nome da nova turma">
    <os-button variant="p" size="sm" type="submit" [disabled]="novoNome().trim().length < 2 || ocupado()">
      <i class="fa-solid fa-plus"></i> Criar turma
    </os-button>
  </form>

  <div class="tab-wrap">
    <table class="tab">
      <thead>
        <tr><th>Turma</th>@if (ehAdmin()) { <th>Professor</th> }<th>Alunos</th><th>Criada em</th><th></th></tr>
      </thead>
      <tbody>
        @for (t of turmas(); track t.id) {
          <tr [class.sel]="t.id === aberta()?.id">
            <td><b>{{ t.nome }}</b></td>
            @if (ehAdmin()) { <td class="mono">{{ t.professor_email }}</td> }
            <td class="mono">{{ t.alunos }}</td>
            <td class="mono">{{ t.criado_em | date: 'dd/MM/yyyy' }}</td>
            <td class="acao">
              <os-button variant="s" size="sm" (click)="abrir(t)">{{ t.id === aberta()?.id ? 'Aberta' : 'Abrir' }}</os-button>
            </td>
          </tr>
        } @empty {
          <tr><td [attr.colspan]="ehAdmin() ? 5 : 4" class="vazio">{{ carregando() ? 'Carregando…' : 'Nenhuma turma ainda.' }}</td></tr>
        }
      </tbody>
    </table>
  </div>

  @if (aberta(); as t) {
    <section class="turma">
      <div class="turma-head">
        <input class="form-control nome" maxlength="120" [value]="t.nome" #nome aria-label="Nome da turma">
        <os-button variant="s" size="sm" [disabled]="ocupado()" (click)="renomear(t, nome.value)">Salvar nome</os-button>
        <os-button variant="d" size="sm" [disabled]="ocupado()" (click)="excluir(t)">
          <i class="fa-solid fa-trash"></i> Excluir turma
        </os-button>
      </div>

      <label class="rot" for="emails">Incluir alunos</label>
      <textarea id="emails" class="form-control emails" rows="5"
        placeholder="Cole os e-mails da conta Google dos alunos, separados por vírgula ou um por linha"
        [value]="texto()" (input)="texto.set($any($event.target).value)"></textarea>
      <div class="linha">
        <span class="hint">{{ previa().validos.length }} e-mail(s) válido(s)@if (previa().invalidos.length) {, {{ previa().invalidos.length }} inválido(s)}</span>
        <os-button variant="p" size="sm" [disabled]="!previa().validos.length || ocupado()" (click)="incluir(t)">
          <i class="fa-solid fa-user-plus"></i> Incluir
        </os-button>
      </div>
      @if (invalidos().length) {
        <os-alert variant="warn" title="Não incluídos (formato inválido)">{{ invalidos().join(', ') }}</os-alert>
      }

      <div class="linha">
        <input class="form-control filtro" type="search" placeholder="Filtrar alunos"
               [value]="filtro()" (input)="filtro.set($any($event.target).value)" aria-label="Filtrar alunos">
        <span class="hint">{{ alunos().length }} aluno(s) · {{ entraram() }} já entraram no OSLive</span>
      </div>
      <div class="tab-wrap">
        <table class="tab">
          <thead><tr><th>E-mail</th><th>Nome</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            @for (a of alunosVisiveis(); track a.email) {
              <tr>
                <td class="mono">{{ a.email }}</td>
                <td>{{ a.nome || '—' }}</td>
                <td>
                  <os-badge [variant]="a.entrou ? 's' : 'n'"
                    [attr.title]="a.entrou ? '' : 'Este e-mail ainda não entrou no OSLive. Confira se é o da conta Google que o aluno usa.'">
                    {{ a.entrou ? 'entrou' : 'ainda não entrou' }}
                  </os-badge>
                </td>
                <td class="acao">
                  <os-button variant="g" size="sm" [disabled]="ocupado()" (click)="remover(t, a)"
                    [attr.aria-label]="'Remover ' + a.email">Remover</os-button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="vazio">{{ carregandoAlunos() ? 'Carregando…' : 'Nenhum aluno nesta turma.' }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  }
</div>
  `,
})
export class AdminTurmasComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly svc = inject(TurmasService);
  private readonly aviso = inject(MatSnackBar);

  readonly ehAdmin = computed(() => this.auth.papel() === 'admin');

  readonly turmas = signal<Turma[]>([]);
  readonly aberta = signal<Turma | null>(null);
  readonly alunos = signal<AlunoTurma[]>([]);
  readonly novoNome = signal('');
  readonly texto = signal('');
  readonly invalidos = signal<string[]>([]);
  readonly filtro = signal('');
  readonly carregando = signal(true);
  readonly carregandoAlunos = signal(false);
  readonly ocupado = signal(false);
  readonly erro = signal('');

  readonly previa = computed(() => separarEmails(this.texto()));
  readonly entraram = computed(() => this.alunos().filter(a => a.entrou).length);
  readonly alunosVisiveis = computed(() => {
    const f = this.filtro().trim().toLowerCase();
    if (!f) return this.alunos();
    return this.alunos().filter(a => a.email.includes(f) || (a.nome ?? '').toLowerCase().includes(f));
  });

  ngOnInit(): void {
    this.carregar();
  }

  async carregar(manterId?: number): Promise<void> {
    this.carregando.set(true);
    try {
      const lista = await this.svc.listar();
      this.turmas.set(lista);
      this.aberta.set(lista.find(t => t.id === manterId) ?? null);
      this.erro.set('');
    } catch (e) {
      this.erro.set(msg(e));
    }
    this.carregando.set(false);
  }

  async abrir(t: Turma): Promise<void> {
    this.aberta.set(t);
    this.texto.set('');
    this.invalidos.set([]);
    this.filtro.set('');
    this.alunos.set([]);
    this.carregandoAlunos.set(true);
    try {
      this.alunos.set(await this.svc.alunos(t.id));
    } catch (e) {
      this.avisar(msg(e), 5000);
    }
    this.carregandoAlunos.set(false);
  }

  async criar(): Promise<void> {
    const nome = this.novoNome().trim();
    if (nome.length < 2) return;
    await this.executar(async () => {
      const id = await this.svc.criar(nome);
      this.novoNome.set('');
      await this.carregar(id);
      const t = this.aberta();
      if (t) await this.abrir(t);
      this.avisar(`Turma "${nome}" criada. Agora inclua os alunos.`);
    });
  }

  async renomear(t: Turma, nome: string): Promise<void> {
    if (nome.trim().length < 2 || nome.trim() === t.nome) return;
    await this.executar(async () => {
      await this.svc.renomear(t.id, nome);
      await this.carregar(t.id);
      this.avisar('Nome da turma salvo.');
    });
  }

  async excluir(t: Turma): Promise<void> {
    if (!confirm(`Excluir a turma "${t.nome}" e a lista de alunos dela? Isso não pode ser desfeito.`)) return;
    await this.executar(async () => {
      await this.svc.excluir(t.id);
      await this.carregar();
      this.avisar(`Turma "${t.nome}" excluída.`);
    });
  }

  async incluir(t: Turma): Promise<void> {
    const { validos, invalidos } = this.previa();
    if (!validos.length) return;
    await this.executar(async () => {
      const novos = await this.svc.matricular(t.id, validos);
      const repetidos = validos.length - novos;
      this.invalidos.set(invalidos);
      this.texto.set('');
      this.alunos.set(await this.svc.alunos(t.id));
      this.turmas.update(l => l.map(x => (x.id === t.id ? { ...x, alunos: this.alunos().length } : x)));
      this.avisar(`${novos} aluno(s) incluído(s)` + (repetidos ? `; ${repetidos} já estava(m) na turma.` : '.'));
    });
  }

  async remover(t: Turma, a: AlunoTurma): Promise<void> {
    if (!confirm(`Remover ${a.email} da turma "${t.nome}"?`)) return;
    await this.executar(async () => {
      await this.svc.desmatricular(t.id, a.email);
      this.alunos.update(l => l.filter(x => x.email !== a.email));
      this.turmas.update(l => l.map(x => (x.id === t.id ? { ...x, alunos: this.alunos().length } : x)));
    });
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    this.ocupado.set(true);
    try {
      await acao();
    } catch (e) {
      this.avisar(msg(e), 5000);
    }
    this.ocupado.set(false);
  }

  private avisar(texto: string, duracao = 3000): void {
    this.aviso.open(texto, 'OK', { duration: duracao });
  }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
