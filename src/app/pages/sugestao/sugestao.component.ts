import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OsButtonComponent } from '../../ui/button/button.component';
import { OsAlertComponent } from '../../ui/alert/alert.component';
import { AuthService, TipoSugestao } from '../../core/auth/auth.service';

const MAX_TEXTO = 2000;

/** Envio de sugestões, erros e dúvidas (exige login; só a administradora lê). */
@Component({
  selector: 'app-sugestao',
  standalone: true,
  imports: [OsButtonComponent, OsAlertComponent],
  styleUrls: ['../../ui/styles/pagina.css', '../../ui/styles/sim-config.css', './sugestao.component.css'],
  template: `
<div class="pg pg-estreita">
  <header class="pg-head">
    <div class="pg-idx">Sugestão</div>
    <h1 class="pg-title">Envie sua sugestão</h1>
    <p class="pg-sub">Ideias, erros encontrados ou dúvidas sobre o OSLive.</p>
  </header>

  @if (enviada()) {
    <os-alert variant="ok" title="Enviada">Obrigada! Sua mensagem foi registrada.</os-alert>
    <div class="pg-acoes">
      <os-button variant="p" (click)="voltar()">Voltar</os-button>
      <os-button variant="g" (click)="nova()">Enviar outra</os-button>
    </div>
  } @else {
    <form class="form" (submit)="$event.preventDefault(); enviar()">
      <fieldset class="tipos">
        <legend>Tipo</legend>
        @for (t of tipos; track t.valor) {
          <label class="check-row">
            <input type="radio" name="tipo" [value]="t.valor" [checked]="tipo() === t.valor" (change)="tipo.set(t.valor)"> {{ t.nome }}
          </label>
        }
      </fieldset>

      @if (pagina) {
        <p class="hint">Página: <code>{{ pagina }}</code></p>
      }

      <label class="rotulo" for="texto">Mensagem</label>
      <textarea id="texto" class="form-control" rows="7" [attr.maxlength]="max"
        [value]="texto()" (input)="texto.set($any($event.target).value)"
        placeholder="Descreva sua sugestão. Se for um erro, diga o que fez e o que aconteceu."></textarea>
      <p class="hint contador">{{ texto().length }} / {{ max }}</p>

      <div class="pg-acoes">
        <os-button variant="p" type="submit" [disabled]="enviando() || texto().trim().length < 5">
          {{ enviando() ? 'Enviando…' : 'Enviar' }}
        </os-button>
        <os-button variant="g" type="button" (click)="voltar()">Cancelar</os-button>
      </div>
    </form>
  }

  @if (auth.papel() === 'admin') {
    <div class="pg-acoes">
      <os-button variant="s" (click)="router.navigateByUrl('/admin/sugestoes')">Ver sugestões recebidas</os-button>
    </div>
  }
</div>
  `,
})
export class SugestaoComponent {
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  private readonly aviso = inject(MatSnackBar);

  readonly max = MAX_TEXTO;
  readonly tipos: { valor: TipoSugestao; nome: string }[] = [
    { valor: 'sugestao', nome: 'Sugestão' },
    { valor: 'erro', nome: 'Erro' },
    { valor: 'duvida', nome: 'Dúvida' },
  ];

  /** Página de onde a pessoa veio (só rotas internas, começando com "/"). */
  readonly pagina: string | null;

  readonly tipo = signal<TipoSugestao>('sugestao');
  readonly texto = signal('');
  readonly enviando = signal(false);
  readonly enviada = signal(false);

  constructor() {
    const p = inject(ActivatedRoute).snapshot.queryParamMap.get('pagina');
    this.pagina = p && p.startsWith('/') && !p.startsWith('//') ? p.slice(0, 200) : null;
  }

  async enviar(): Promise<void> {
    const texto = this.texto().trim();
    if (texto.length < 5 || this.enviando()) return;
    this.enviando.set(true);
    try {
      await this.auth.enviarSugestao(this.tipo(), texto.slice(0, MAX_TEXTO), this.pagina);
      this.enviada.set(true);
    } catch (e) {
      this.aviso.open(e instanceof Error ? e.message : 'Não foi possível enviar. Tente de novo.', 'OK', { duration: 5000 });
    }
    this.enviando.set(false);
  }

  nova(): void {
    this.texto.set('');
    this.enviada.set(false);
  }

  voltar(): void {
    this.router.navigateByUrl(this.pagina ?? '/simulacoes');
  }
}
