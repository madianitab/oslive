import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OsButtonComponent } from '../../ui/button/button.component';
import { OsAlertComponent } from '../../ui/alert/alert.component';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-entrar',
  standalone: true,
  imports: [OsButtonComponent, OsAlertComponent],
  styleUrls: ['../../ui/styles/pagina.css'],
  template: `
<div class="pg pg-estreita">
  <header class="pg-head">
    <div class="pg-idx">Entrar</div>
    <h1 class="pg-title">Acesso às avaliações</h1>
    <p class="pg-sub">Simuladores e exercícios continuam abertos. O login é só para as avaliações.</p>
  </header>

  @if (!auth.configurado) {
    <os-alert variant="warn" title="Login não configurado">
      Preencha <code>src/app/core/auth/supabase.config.ts</code> (veja <code>docs/login-supabase.md</code>).
    </os-alert>
  } @else if (carregando()) {
    <p class="pg-sub">Verificando acesso…</p>
  } @else {
    @if (erro()) {
      <os-alert variant="err" title="Não foi possível entrar">{{ erro() }}</os-alert>
    }
    <div class="pg-acoes">
      <os-button variant="p" (click)="entrar()">Entrar com Google</os-button>
    </div>
  }
</div>
  `,
})
export class EntrarComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);

  readonly carregando = signal(true);
  readonly erro = signal('');

  async ngOnInit(): Promise<void> {
    if (!this.auth.configurado) return;
    try {
      await this.auth.iniciar();
      if (this.auth.usuario()) {
        const destino = this.rota.snapshot.queryParamMap.get('retorno')
          ?? this.auth.consumirRetorno()
          ?? '/avaliacoes';
        this.router.navigateByUrl(destino);
        return;
      }
    } catch (e) {
      this.erro.set(e instanceof Error ? e.message : String(e));
    }
    this.carregando.set(false);
  }

  async entrar(): Promise<void> {
    this.erro.set('');
    const retorno = this.rota.snapshot.queryParamMap.get('retorno') ?? '/avaliacoes';
    try {
      await this.auth.entrarComGoogle(retorno);
    } catch (e) {
      this.erro.set(e instanceof Error ? e.message : String(e));
    }
  }
}
