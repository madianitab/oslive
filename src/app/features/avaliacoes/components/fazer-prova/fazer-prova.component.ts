import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OsButtonComponent } from '../../../../ui/button/button.component';
import { OsAlertComponent } from '../../../../ui/alert/alert.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { AvaliacaoAluno, AvaliacoesService, ProvaAberta } from '../../services/avaliacoes.service';
import { QuestaoComponent } from '../questao/questao.component';
import { RespostasProva } from '../../questoes/tipos';
import { dataHora, tempoRestante } from '../../models/datas';

const SALVAR_A_CADA_MS = 15_000;

type Etapa = 'carregando' | 'senha' | 'prova' | 'enviada' | 'indisponivel';

/**
 * Prova do aluno (#/avaliacoes/:id): pede a senha, mostra as questões, salva sozinha
 * a cada 15 s e envia no fim (ou quando o tempo acaba). A nota não aparece.
 */
@Component({
  selector: 'app-fazer-prova',
  standalone: true,
  imports: [RouterLink, OsButtonComponent, OsAlertComponent, QuestaoComponent],
  providers: [AvaliacoesService],
  styleUrls: ['../../../../ui/styles/pagina.css'],
  styles: [`
    .pg-larga { max-width: 1240px; }
    .barra {
      position: sticky; top: var(--os-tb-visivel, 60px); z-index: 20;
      display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: space-between;
      margin: 0 0 18px; padding: 10px 14px; background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--r-md); box-shadow: var(--sh-sm);
    }
    .relogio { font-family: var(--f-mono); font-size: 20px; font-weight: 600; color: var(--text); }
    .relogio.fim { color: var(--err); }
    .estado { font-size: 12px; color: var(--text-3); }
    .estado.erro { color: var(--err); }
    .questoes { display: flex; flex-direction: column; gap: 16px; }
    .senha { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 16px; }
    .senha input {
      height: 38px; padding: 0 12px; border: 1px solid var(--line); border-radius: var(--r-sm);
      background: var(--surface); color: var(--text); font-size: 15px; min-width: 220px;
    }
    .senha input:focus { outline: none; border-color: var(--a); box-shadow: var(--ring); }
    .info { font-size: 14px; color: var(--text-2); line-height: 1.7; }
    .fim-acoes { display: flex; gap: 10px; margin-top: 24px; }
    os-alert { display: block; margin-top: 16px; }
  `],
  template: `
<div class="pg pg-larga">
  <header class="pg-head">
    <div class="pg-idx">Avaliação</div>
    <h1 class="pg-title">{{ prova()?.titulo ?? info()?.titulo ?? 'Prova' }}</h1>
    @if (info(); as i) {
      <p class="pg-sub">{{ i.turma }} · {{ i.questoes }} questões · {{ i.duracao_min }} minutos · fecha em {{ dataHora(i.fim) }}</p>
    }
  </header>

  @switch (etapa()) {
    @case ('carregando') { <p class="info">Carregando…</p> }

    @case ('indisponivel') {
      <os-alert variant="warn" title="Prova indisponível">{{ mensagem() }}</os-alert>
      <div class="fim-acoes"><os-button variant="s" (click)="voltar()">Voltar para Avaliações</os-button></div>
    }

    @case ('senha') {
      <div class="info">
        @if (info()?.situacao === 'em_andamento') {
          Você já começou esta prova. Digite a senha para continuar; o tempo continua contando.
        } @else {
          Ao começar, você terá <b>{{ info()?.duracao_min }} minutos</b> (sem passar do fechamento).
          As respostas são salvas sozinhas. Você pode enviar só uma vez.
        }
      </div>
      <form class="senha" (submit)="$event.preventDefault(); comecar()">
        <input type="password" autocomplete="off" placeholder="Senha da prova" maxlength="64" aria-label="Senha da prova"
               [value]="senha()" (input)="senha.set($any($event.target).value)">
        <os-button variant="p" type="submit" [disabled]="!senha() || ocupado()">
          {{ info()?.situacao === 'em_andamento' ? 'Continuar' : 'Começar' }}
        </os-button>
      </form>
      @if (mensagem()) { <os-alert variant="err" title="Não foi possível abrir">{{ mensagem() }}</os-alert> }
    }

    @case ('prova') {
      <div class="barra" role="status">
        <span class="relogio" [class.fim]="restanteMs() < 5 * 60_000">{{ relogio() }}</span>
        <span class="estado" [class.erro]="!!erroSalvar()">{{ erroSalvar() || estadoSalvo() }}</span>
        <os-button variant="p" size="sm" [disabled]="ocupado()" (click)="enviar(false)"><i class="fa-solid fa-paper-plane"></i> Enviar prova</os-button>
      </div>
      <div class="questoes">
        @for (q of prova()!.questoes; track $index) {
          <app-questao [questao]="q" [numero]="$index + 1" [valor]="valorQuestao()"
                       [respostas]="respostasDe($index)" [bloqueado]="ocupado()"
                       (resposta)="responder($index, $event.campo, $event.valor)"></app-questao>
        }
      </div>
      <div class="fim-acoes">
        <os-button variant="p" [disabled]="ocupado()" (click)="enviar(false)"><i class="fa-solid fa-paper-plane"></i> Enviar prova</os-button>
      </div>
    }

    @case ('enviada') {
      <os-alert variant="ok" title="Prova enviada">Suas respostas foram registradas. A professora divulga as notas.</os-alert>
      <div class="fim-acoes"><a routerLink="/avaliacoes"><os-button variant="s">Voltar para Avaliações</os-button></a></div>
    }
  }
</div>
  `,
})
export class FazerProvaComponent implements OnInit, OnDestroy {
  private readonly svc = inject(AvaliacoesService);
  private readonly rota = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly dataHora = dataHora;

  readonly etapa = signal<Etapa>('carregando');
  readonly info = signal<AvaliacaoAluno | null>(null);
  readonly prova = signal<ProvaAberta | null>(null);
  readonly respostas = signal<RespostasProva>({});
  readonly senha = signal('');
  readonly mensagem = signal('');
  readonly ocupado = signal(false);
  readonly agora = signal(Date.now());
  readonly salvoEm = signal<Date | null>(null);
  readonly erroSalvar = signal('');

  /** Diferença entre o relógio do servidor e o deste computador. */
  private ajusteRelogio = 0;
  private alterado = false;
  private tique?: ReturnType<typeof setInterval>;
  private salvamento?: ReturnType<typeof setInterval>;

  readonly restanteMs = computed(() => {
    const p = this.prova();
    return p ? new Date(p.prazo).getTime() - (this.agora() + this.ajusteRelogio) : 0;
  });
  readonly relogio = computed(() => tempoRestante(this.restanteMs()));
  readonly valorQuestao = computed(() => {
    const p = this.prova();
    return p ? Number(p.valor_total) / Math.max(1, p.questoes.length) : null;
  });
  readonly estadoSalvo = computed(() => {
    const s = this.salvoEm();
    return s ? `Salvo às ${s.toLocaleTimeString('pt-BR')}` : 'As respostas são salvas sozinhas';
  });

  async ngOnInit(): Promise<void> {
    const id = Number(this.rota.snapshot.paramMap.get('id'));
    try {
      const lista = await this.svc.minhas();
      const a = lista.find(x => x.id === id) ?? null;
      this.info.set(a);
      if (!a) return this.indisponivel('Esta prova não está disponível para a sua conta.');
      if (a.situacao === 'enviada') return this.etapa.set('enviada');
      if (a.situacao === 'em_breve') return this.indisponivel(`A prova abre em ${dataHora(a.inicio)} (horário de Brasília).`);
      if (a.situacao === 'encerrada') return this.indisponivel('O prazo desta prova terminou.');
      this.etapa.set('senha');
    } catch (e) {
      this.indisponivel(msg(e));
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.tique);
    clearInterval(this.salvamento);
  }

  /** Avisa antes de fechar a aba com respostas não salvas. */
  @HostListener('window:beforeunload', ['$event'])
  antesDeSair(ev: BeforeUnloadEvent): void {
    if (this.etapa() === 'prova' && this.alterado) ev.preventDefault();
  }

  /** Ao trocar de aba ou minimizar, salva na hora. */
  @HostListener('document:visibilitychange')
  aoEsconder(): void {
    if (document.visibilityState === 'hidden') this.salvar();
  }

  async comecar(): Promise<void> {
    const a = this.info();
    if (!a) return;
    this.ocupado.set(true);
    this.mensagem.set('');
    try {
      const p = await this.svc.iniciar(a.id, this.senha());
      this.ajusteRelogio = new Date(p.agora).getTime() - Date.now();
      this.prova.set(p);
      this.respostas.set(p.respostas ?? {});
      this.senha.set('');
      this.etapa.set('prova');
      this.tique = setInterval(() => {
        this.agora.set(Date.now());
        if (this.restanteMs() <= 0) this.enviar(true);
      }, 1000);
      this.salvamento = setInterval(() => this.salvar(), SALVAR_A_CADA_MS);
    } catch (e) {
      this.mensagem.set(msg(e));
    }
    this.ocupado.set(false);
  }

  responder(questao: number, campo: string, valor: string): void {
    const k = String(questao);
    this.respostas.update(r => ({ ...r, [k]: { ...(r[k] ?? {}), [campo]: valor } }));
    this.alterado = true;
  }

  async salvar(): Promise<void> {
    const p = this.prova();
    if (!p || !this.alterado || this.etapa() !== 'prova') return;
    this.alterado = false;
    try {
      await this.svc.salvarRespostas(p.tentativa, this.respostas());
      this.salvoEm.set(new Date());
      this.erroSalvar.set('');
    } catch (e) {
      this.alterado = true;   // tenta de novo no próximo ciclo
      this.erroSalvar.set(`Não salvou: ${msg(e)}`);
    }
  }

  async enviar(automatico: boolean): Promise<void> {
    const p = this.prova();
    if (!p || this.ocupado() || this.etapa() !== 'prova') return;
    if (!automatico) {
      const vazios = this.camposVazios();
      const aviso = vazios ? `\n\nAinda há ${vazios} campo(s) sem resposta.` : '';
      if (!confirm(`Enviar a prova? Depois de enviar não dá para mudar as respostas.${aviso}`)) return;
    }
    this.ocupado.set(true);
    clearInterval(this.tique);
    clearInterval(this.salvamento);
    try {
      await this.svc.enviar(p.tentativa, this.respostas());
      this.alterado = false;
      this.etapa.set('enviada');
    } catch (e) {
      // se o servidor já registrou (tempo esgotado, envio anterior), a prova está encerrada
      if (/enviada|terminou/i.test(msg(e))) {
        this.alterado = false;
        this.etapa.set('enviada');
      } else {
        this.erroSalvar.set(`Não enviou: ${msg(e)} Clique em Enviar de novo.`);
        this.tique = setInterval(() => this.agora.set(Date.now()), 1000);
        this.salvamento = setInterval(() => this.salvar(), SALVAR_A_CADA_MS);
      }
    }
    this.ocupado.set(false);
  }

  respostasDe(i: number): Record<string, string> {
    return this.respostas()[String(i)] ?? {};
  }

  voltar(): void {
    history.back();
  }

  private camposVazios(): number {
    const p = this.prova()!;
    return p.questoes.reduce((t, q, i) =>
      t + q.campos.filter(c => !(this.respostas()[i]?.[c.id] ?? '').trim()).length, 0);
  }

  private indisponivel(texto: string): void {
    this.mensagem.set(texto);
    this.etapa.set('indisponivel');
  }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
