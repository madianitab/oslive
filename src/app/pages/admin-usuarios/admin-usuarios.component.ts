import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OsButtonComponent } from '../../ui/button/button.component';
import { OsBadgeComponent } from '../../ui/badge/badge.component';
import { OsAlertComponent } from '../../ui/alert/alert.component';
import { AuthService, Perfil } from '../../core/auth/auth.service';

/** Só a administradora: libera ou retira o papel de professor. */
@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [DatePipe, OsButtonComponent, OsBadgeComponent, OsAlertComponent],
  styleUrls: ['../../ui/styles/pagina.css', '../../ui/styles/sim-config.css', './admin-usuarios.component.css'],
  template: `
<div class="pg">
  <header class="pg-head">
    <div class="pg-idx">Administração</div>
    <h1 class="pg-title">Usuários</h1>
    <p class="pg-sub">Quem entra pelo Google vira aluno. Aqui você libera quem é professor.</p>
  </header>

  @if (erro()) {
    <os-alert variant="err" title="Erro">{{ erro() }}</os-alert>
  }

  <input class="form-control filtro" type="search" placeholder="Filtrar por nome ou e-mail"
         [value]="filtro()" (input)="filtro.set($any($event.target).value)" aria-label="Filtrar usuários">

  <div class="tab-wrap">
    <table class="tab">
      <thead>
        <tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Desde</th><th></th></tr>
      </thead>
      <tbody>
        @for (p of visiveis(); track p.id) {
          <tr>
            <td>{{ p.nome || '—' }}</td>
            <td class="mono">{{ p.email }}</td>
            <td><os-badge [variant]="p.papel === 'admin' ? 'w' : p.papel === 'professor' ? 'a' : 'n'">{{ p.papel }}</os-badge></td>
            <td class="mono">{{ p.criado_em | date: 'dd/MM/yyyy' }}</td>
            <td class="acao">
              @if (p.papel === 'aluno') {
                <os-button variant="s" size="sm" [disabled]="ocupado() === p.id" (click)="mudar(p, 'professor')">Tornar professor</os-button>
              } @else if (p.papel === 'professor') {
                <os-button variant="g" size="sm" [disabled]="ocupado() === p.id" (click)="mudar(p, 'aluno')">Tornar aluno</os-button>
              }
            </td>
          </tr>
        } @empty {
          <tr><td colspan="5" class="vazio">{{ carregando() ? 'Carregando…' : 'Nenhum usuário encontrado.' }}</td></tr>
        }
      </tbody>
    </table>
  </div>
</div>
  `,
})
export class AdminUsuariosComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly aviso = inject(MatSnackBar);

  readonly perfis = signal<Perfil[]>([]);
  readonly filtro = signal('');
  readonly carregando = signal(true);
  readonly ocupado = signal<string | null>(null);
  readonly erro = signal('');

  readonly visiveis = computed(() => {
    const f = this.filtro().trim().toLowerCase();
    if (!f) return this.perfis();
    return this.perfis().filter(p =>
      p.email.toLowerCase().includes(f) || (p.nome ?? '').toLowerCase().includes(f));
  });

  ngOnInit(): void {
    this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      this.perfis.set(await this.auth.listarPerfis());
      this.erro.set('');
    } catch (e) {
      this.erro.set(e instanceof Error ? e.message : String(e));
    }
    this.carregando.set(false);
  }

  async mudar(p: Perfil, papel: 'professor' | 'aluno'): Promise<void> {
    this.ocupado.set(p.id);
    try {
      await this.auth.definirPapel(p.id, papel);
      this.perfis.update(lista => lista.map(x => (x.id === p.id ? { ...x, papel } : x)));
      this.aviso.open(`${p.nome || p.email} agora é ${papel}.`, 'OK', { duration: 3000 });
    } catch (e) {
      this.aviso.open(e instanceof Error ? e.message : String(e), 'OK', { duration: 5000 });
    }
    this.ocupado.set(null);
  }
}
