import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OsButtonComponent } from '../../ui/button/button.component';
import { OsBadgeComponent } from '../../ui/badge/badge.component';
import { OsAlertComponent } from '../../ui/alert/alert.component';
import { AuthService, Sugestao, TipoSugestao } from '../../core/auth/auth.service';

const NOMES: Record<TipoSugestao, string> = { sugestao: 'sugestão', erro: 'erro', duvida: 'dúvida' };

/** Só a administradora: sugestões recebidas pelo botão "Sugestão". */
@Component({
  selector: 'app-admin-sugestoes',
  standalone: true,
  imports: [DatePipe, OsButtonComponent, OsBadgeComponent, OsAlertComponent],
  styleUrls: ['../../ui/styles/pagina.css', '../../ui/styles/sim-config.css', '../admin-usuarios/admin-usuarios.component.css', './admin-sugestoes.component.css'],
  template: `
<div class="pg">
  <header class="pg-head">
    <div class="pg-idx">Administração</div>
    <h1 class="pg-title">Sugestões</h1>
    <p class="pg-sub">{{ naoLidas() }} não lida(s) de {{ sugestoes().length }}.</p>
  </header>

  @if (erro()) {
    <os-alert variant="err" title="Erro">{{ erro() }}</os-alert>
  }

  <label class="check-row filtro"><input type="checkbox" [checked]="soNaoLidas()" (change)="soNaoLidas.set(!soNaoLidas())"> Só não lidas</label>

  <div class="tab-wrap">
    <table class="tab">
      <thead>
        <tr><th>Data</th><th>Tipo</th><th>Mensagem</th><th>De</th><th></th></tr>
      </thead>
      <tbody>
        @for (s of visiveis(); track s.id) {
          <tr [class.lida]="s.lida">
            <td class="mono">{{ s.criado_em | date: 'dd/MM/yyyy HH:mm' }}</td>
            <td><os-badge [variant]="s.tipo === 'erro' ? 'd' : s.tipo === 'duvida' ? 'i' : 'a'">{{ nome(s.tipo) }}</os-badge></td>
            <td class="texto">{{ s.texto }}@if (s.pagina) { <span class="mono pagina">{{ s.pagina }}</span> }</td>
            <td class="mono">{{ s.nome || s.email || '—' }}</td>
            <td class="acao">
              <os-button [variant]="s.lida ? 'g' : 's'" size="sm" [disabled]="ocupado() === s.id" (click)="alternar(s)">
                {{ s.lida ? 'Marcar não lida' : 'Marcar lida' }}
              </os-button>
            </td>
          </tr>
        } @empty {
          <tr><td colspan="5" class="vazio">{{ carregando() ? 'Carregando…' : 'Nenhuma sugestão.' }}</td></tr>
        }
      </tbody>
    </table>
  </div>
</div>
  `,
})
export class AdminSugestoesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly aviso = inject(MatSnackBar);

  readonly sugestoes = signal<Sugestao[]>([]);
  readonly soNaoLidas = signal(false);
  readonly carregando = signal(true);
  readonly ocupado = signal<number | null>(null);
  readonly erro = signal('');

  readonly naoLidas = computed(() => this.sugestoes().filter(s => !s.lida).length);
  readonly visiveis = computed(() => this.soNaoLidas() ? this.sugestoes().filter(s => !s.lida) : this.sugestoes());

  nome(t: TipoSugestao): string { return NOMES[t] ?? t; }

  async ngOnInit(): Promise<void> {
    try {
      this.sugestoes.set(await this.auth.listarSugestoes());
    } catch (e) {
      this.erro.set(e instanceof Error ? e.message : String(e));
    }
    this.carregando.set(false);
  }

  async alternar(s: Sugestao): Promise<void> {
    this.ocupado.set(s.id);
    try {
      await this.auth.marcarSugestao(s.id, !s.lida);
      this.sugestoes.update(l => l.map(x => (x.id === s.id ? { ...x, lida: !s.lida } : x)));
    } catch (e) {
      this.aviso.open(e instanceof Error ? e.message : String(e), 'OK', { duration: 5000 });
    }
    this.ocupado.set(null);
  }
}
