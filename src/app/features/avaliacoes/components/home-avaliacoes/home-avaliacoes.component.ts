import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OsButtonComponent } from '../../../../ui/button/button.component';
import { OsAlertComponent } from '../../../../ui/alert/alert.component';
import { OsBadgeComponent } from '../../../../ui/badge/badge.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { TurmasService } from '../../services/turmas.service';
import { AvaliacaoAluno, AvaliacoesService, SituacaoAluno } from '../../services/avaliacoes.service';
import { dataHora } from '../../models/datas';

/**
 * Área das avaliações (exige login): o aluno vê as provas das turmas dele;
 * professor e admin têm atalhos para Turmas e Provas.
 */
@Component({
  selector: 'app-home-avaliacoes',
  standalone: true,
  imports: [OsButtonComponent, OsAlertComponent, OsBadgeComponent],
  providers: [TurmasService, AvaliacoesService],
  styleUrls: ['../../../../ui/styles/pagina.css', '../../../../pages/admin-usuarios/admin-usuarios.component.css'],
  styles: [`
    .pg-turmas { margin: 24px 0 0; font-size: 14px; color: var(--text-2); }
    .pg-turmas b { color: var(--text); }
    .tab-wrap { margin-top: 16px; }
  `],
  template: `
<div class="pg">
  <header class="pg-head">
    <div class="pg-idx">Avaliações</div>
    <h1 class="pg-title">Avaliações</h1>
    <p class="pg-sub">Provas do OSLive. As respostas ficam registradas na sua conta.</p>
  </header>

  <div class="pg-conta">
    <span>
      <b>{{ nome() }}</b> · {{ auth.usuario()?.email }}
      @if (auth.papel(); as p) {
        <os-badge [variant]="p === 'admin' ? 'w' : p === 'professor' ? 'a' : 'n'">{{ p }}</os-badge>
      }
    </span>
    <os-button variant="g" size="sm" (click)="sair()">Sair</os-button>
  </div>

  @if (!auth.perfil()) {
    <div class="pg-bloco">
      <os-alert variant="warn" title="Perfil não encontrado">
        O login funcionou, mas a tabela de perfis não respondeu. Confira se o <code>supabase/schema.sql</code> foi executado.
      </os-alert>
    </div>
  } @else if (auth.papel() === 'aluno' && turmas() !== null && !turmas()!.length) {
    <div class="pg-bloco">
      <os-alert variant="warn" title="Você não está em nenhuma turma">
        O e-mail <b>{{ auth.usuario()?.email }}</b> não está na lista de nenhuma turma.
        Confira se entrou com a conta Google certa ou peça à professora para incluir este e-mail.
      </os-alert>
    </div>
  } @else {
    @if (auth.papel() === 'aluno' && turmas()?.length) {
      <p class="pg-turmas">Turma(s): <b>{{ nomesTurmas() }}</b></p>
    }
    @if (auth.papel() === 'aluno' && provas()?.length) {
      <div class="tab-wrap">
        <table class="tab">
          <thead><tr><th>Prova</th><th>Turma</th><th>Abre (Brasília)</th><th>Fecha</th><th>Duração</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            @for (a of provas(); track a.id) {
              <tr>
                <td><b>{{ a.titulo }}</b></td>
                <td>{{ a.turma }}</td>
                <td class="mono">{{ dataHora(a.inicio) }}</td>
                <td class="mono">{{ dataHora(a.fim) }}</td>
                <td class="mono">{{ a.duracao_min }} min</td>
                <td><os-badge [variant]="corSituacao(a.situacao)">{{ textoSituacao(a.situacao) }}</os-badge></td>
                <td class="acao">
                  @if (a.situacao === 'aberta' || a.situacao === 'em_andamento') {
                    <os-button variant="p" size="sm" (click)="router.navigateByUrl('/avaliacoes/' + a.id)">
                      {{ a.situacao === 'aberta' ? 'Fazer prova' : 'Continuar' }}
                    </os-button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="pg-bloco">
        <os-alert variant="info" title="Nenhuma avaliação disponível">
          Quando houver uma prova liberada, ela aparece aqui.
        </os-alert>
      </div>
    }
  }

  @if (auth.papel() === 'admin' || auth.papel() === 'professor') {
    <div class="pg-acoes">
      <os-button variant="s" (click)="router.navigateByUrl('/admin/avaliacoes')">Provas</os-button>
      <os-button variant="s" (click)="router.navigateByUrl('/admin/turmas')">Turmas</os-button>
    </div>
  }

  @if (auth.papel() === 'admin') {
    <div class="pg-acoes">
      <os-button variant="s" (click)="router.navigateByUrl('/admin/usuarios')">Gerenciar usuários</os-button>
      <os-button variant="s" (click)="router.navigateByUrl('/admin/sugestoes')">Ver sugestões</os-button>
    </div>
  }
</div>
  `,
})
export class HomeAvaliacoesComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  private readonly svc = inject(TurmasService);
  private readonly avaliacoes = inject(AvaliacoesService);
  readonly dataHora = dataHora;

  /** Provas liberadas das turmas do aluno (null enquanto carrega). */
  readonly provas = signal<AvaliacaoAluno[] | null>(null);

  readonly nome = computed(() => this.auth.perfil()?.nome || this.auth.usuario()?.email || '');

  /** Turmas do aluno (null enquanto carrega ou se o banco não respondeu). */
  readonly turmas = signal<{ id: number; nome: string }[] | null>(null);
  readonly nomesTurmas = computed(() => (this.turmas() ?? []).map(t => t.nome).join(', '));

  async ngOnInit(): Promise<void> {
    if (this.auth.papel() !== 'aluno') return;
    try {
      this.turmas.set(await this.svc.minhas());
    } catch {
      this.turmas.set(null);   // tabelas ainda não criadas: mantém o aviso padrão
    }
    try {
      this.provas.set(await this.avaliacoes.minhas());
    } catch {
      this.provas.set(null);
    }
  }

  textoSituacao(s: SituacaoAluno): string {
    return {
      em_breve: 'abre em breve', aberta: 'aberta', em_andamento: 'em andamento',
      tempo_esgotado: 'tempo esgotado', enviada: 'enviada', encerrada: 'encerrada',
    }[s];
  }

  corSituacao(s: SituacaoAluno): 'n' | 'a' | 's' | 'w' {
    return s === 'aberta' ? 'a' : s === 'em_andamento' ? 'w' : s === 'enviada' ? 's' : 'n';
  }

  async sair(): Promise<void> {
    await this.auth.sair();
    this.router.navigateByUrl('/');
  }
}
