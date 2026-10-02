import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OsButtonComponent } from '../../../../ui/button/button.component';
import { OsAlertComponent } from '../../../../ui/alert/alert.component';
import { OsBadgeComponent } from '../../../../ui/badge/badge.component';
import { AuthService } from '../../../../core/auth/auth.service';

/**
 * Área das avaliações (exige login). Por enquanto mostra a conta e o papel;
 * os módulos de prova entram aqui.
 */
@Component({
  selector: 'app-home-avaliacoes',
  standalone: true,
  imports: [OsButtonComponent, OsAlertComponent, OsBadgeComponent],
  styleUrls: ['../../../../ui/styles/pagina.css'],
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
  } @else {
    <div class="pg-bloco">
      <os-alert variant="info" title="Nenhuma avaliação disponível">
        Quando houver uma prova liberada, ela aparece aqui.
      </os-alert>
    </div>
  }

  @if (auth.papel() === 'admin') {
    <div class="pg-acoes">
      <os-button variant="s" (click)="router.navigateByUrl('/admin/usuarios')">Gerenciar usuários</os-button>
    </div>
  }
</div>
  `,
})
export class HomeAvaliacoesComponent {
  readonly auth = inject(AuthService);
  readonly router = inject(Router);

  readonly nome = computed(() => this.auth.perfil()?.nome || this.auth.usuario()?.email || '');

  async sair(): Promise<void> {
    await this.auth.sair();
    this.router.navigateByUrl('/');
  }
}
